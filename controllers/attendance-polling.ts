// Serial polling: do not overlap requests or publish responses after disposal.
export function startAttendancePolling<T>(options: {
  load: (signal: AbortSignal) => Promise<T>;
  onData: (value: T) => boolean;
  onError: (error: unknown) => void;
  intervalMs?: number;
}) {
  const controller = new AbortController();
  let stopped = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = async () => {
    if (stopped || pending) return;
    clearTimeout(timer);
    pending = true;
    try {
      const data = await options.load(controller.signal);
      if (!stopped && !controller.signal.aborted && !options.onData(data)) stopped = true;
    } catch (error) {
      if (!stopped && !controller.signal.aborted) options.onError(error);
    } finally {
      pending = false;
      if (!stopped) timer = setTimeout(refresh, options.intervalMs ?? 3000);
    }
  };
  void refresh();
  return {
    refresh,
    stop: () => { stopped = true; clearTimeout(timer); controller.abort(); },
  };
}
