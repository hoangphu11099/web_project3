"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { FeatureDialog } from "./FeatureDialog";

const ErrorFeedbackContext = createContext<(message: string) => void>(() => {});

export function ErrorFeedbackProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<string[]>([]);
  const report = useCallback((message: string) => {
    const text = String(message || "").trim();
    if (text) setMessages(current => current.includes(text) ? current : [...current, text]);
  }, []);
  useEffect(() => {
    const invalid = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      event.preventDefault();
      const label = field.labels?.[0]?.childNodes[0]?.textContent?.trim();
      report(`${label ? `${label}: ` : ""}${field.validationMessage}`);
    };
    document.addEventListener("invalid", invalid, true);
    return () => document.removeEventListener("invalid", invalid, true);
  }, [report]);
  return <ErrorFeedbackContext.Provider value={report}>{children}{messages.length > 0 && <FeatureDialog className="error-feedback-dialog" title="Không thể hoàn tất thao tác" description="Vui lòng kiểm tra thông tin dưới đây và thử lại." onClose={() => setMessages([])}>
    <div className="error-feedback-content"><span className="error-feedback-symbol" aria-hidden="true">!</span><div role="alert">{messages.map(message => <p key={message}>{message}</p>)}</div></div>
    <div className="error-feedback-actions"><button type="button" className="primary-button" onClick={() => setMessages([])}>Đã hiểu</button></div>
  </FeatureDialog>}</ErrorFeedbackContext.Provider>;
}

export function useErrorReporter() { return useContext(ErrorFeedbackContext); }

// Keep local error state for field context; show the same message in the shared popup.
export function useErrorFeedback() {
  const [error, setError] = useState("");
  const report = useErrorReporter();
  const update = useCallback((message: string) => {
    setError(message);
    if (message) report(message);
  }, [report]);
  return [error, update] as const;
}
