"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from "react";
import {
  apiRequest,
  display,
  idOf,
  keyOf,
  pick,
  statusLabel,
} from "@/controllers/api.controller";
import {
  normalizeTeacherSchedules,
  timeRange,
  todaySchedules,
} from "@/controllers/teaching-schedule.controller";
import type { MetadataData, Row, ToastHandler } from "@/models/dashboard";
import type { TeachingSchedule } from "@/models/teaching-schedule";
import { AttendanceQr } from "@/components/common/AttendanceQr";
import { PanelHeader } from "@/components/common/PanelHeader";
import { Icon } from "@/components/ui/Icon";

import { startAttendancePolling } from "@/controllers/attendance-polling";

type AttendanceWindowState = "early" | "open" | "finished" | "unavailable";

function attendanceWindowState(lesson: TeachingSchedule, now = new Date()): AttendanceWindowState {
  const toMinutes = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : -1;
  };
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(lesson.startTime);
  const end = toMinutes(lesson.endTime);
  if (start < 0 || end <= start) return "unavailable";
  if (current < start - 15) return "early";
  if (current > end) return "finished";
  return "open";
}

function attendanceWindowLabel(state: AttendanceWindowState) {
  return {
    early: "Chưa đến giờ mở điểm danh (chỉ mở từ 15 phút trước giờ học).",
    open: "Tiết học đang trong thời gian cho phép mở điểm danh.",
    finished: "Tiết học đã kết thúc, không thể mở phiên mới.",
    unavailable: "Khung giờ tiết học không hợp lệ.",
  }[state];
}

function attendanceDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return display(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function AttendanceManager({
  token,
  metadata,
  onToast,
}: {
  token: string;
  metadata: MetadataData;
  onToast: ToastHandler;
}) {
  const [lessons, setLessons] = useState<TeachingSchedule[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [selectedSession, setSelectedSession] = useState<Row | null>(null);
  const [records, setRecords] = useState<Row[]>([]);
  const activeSessionId = useRef(0);
  const recordsRevision = useRef(0);
  const pendingUpdates = useRef(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [syncError, setSyncError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const sessionId = selectedSession ? idOf(selectedSession) : 0;
  const sessionActive = selectedSession ? keyOf(selectedSession, "IsActive") !== false : false;
  useEffect(() => {
    if (!sessionId) return;
    const polling = startAttendancePolling({
      load: async (signal) => {
        const revision = recordsRevision.current;
        const payload = await apiRequest(token, `/attendance/sessions/${sessionId}/records`, { signal, cache: "no-store" });
        return { payload, revision };
      },
      onData: ({ payload, revision }) => {
        if (activeSessionId.current !== sessionId) return false;
        if (pendingUpdates.current || revision !== recordsRevision.current) return true;
        setRecords(Array.isArray(payload.data) ? payload.data : []);
        if (payload.session) setSelectedSession(payload.session as Row);
        setSyncError("");
        setLastSyncedAt(new Date().toLocaleTimeString("vi-VN"));
        return sessionActive && keyOf(payload.session, "IsActive") !== false;
      },
      onError: (err) => setSyncError(err instanceof Error ? err.message : "Không tải được trạng thái điểm danh"),
    });
    const resume = () => { if (document.visibilityState === "visible") void polling.refresh(); };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      polling.stop();
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [token, sessionId, sessionActive, refreshVersion]);

  const [form, setForm] = useState({
    courseOfferingId: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [ttl, setTtl] = useState(0);
  const [qrCode, setQrCode] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const [schedulePayload, s] = await Promise.all([
        apiRequest(token, "/teacher/schedule"),
        apiRequest(token, "/attendance/sessions"),
      ]);
      const allLessons = normalizeTeacherSchedules(schedulePayload);
      const today = todaySchedules(allLessons);
      setLessons(today);
      setForm((current) => ({
        ...current,
        courseOfferingId:
          current.courseOfferingId || String(today[0]?.courseOfferingId || ""),
      }));
      setSessions(s.data || []);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không tải được dữ liệu điểm danh",
      );
    }
  };
  useEffect(() => {
    load();
  }, [token]);
  const selectSession = (session: Row) => {
    activeSessionId.current = idOf(session);
    recordsRevision.current++;
    setSelectedSession(session);
    setRecords([]);
    setQrCode("");
    setTtl(0);
    setSyncError("");
    setLastSyncedAt("");
    setRefreshVersion(value => value + 1);
  };
  useEffect(() => {
    if (!selectedSession || !ttl) return;
    const timer = window.setInterval(
      () => setTtl((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [selectedSession, ttl > 0]);
  useEffect(() => {
    if (
      !selectedSession ||
      ttl !== 0 ||
      keyOf(selectedSession, "IsActive") === false
    )
      return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const q = await apiRequest(
          token,
          `/attendance/sessions/${idOf(selectedSession)}/qr`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (controller.signal.aborted || activeSessionId.current !== idOf(selectedSession)) return;
        setQrCode(q.qrCode || "");
        setTtl(Number(q.ttlSeconds || 0));
        if (q.data) setSelectedSession(q.data as Row);
      } catch {
        /* phiên có thể đã đóng */
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [ttl, selectedSession, token]);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await apiRequest(token, "/attendance/sessions", {
        method: "POST",
        body: JSON.stringify({
          courseOfferingId: Number(form.courseOfferingId),
          note: form.note,
        }),
      });
      onToast(p.message || "Đã tạo phiên điểm danh");
      const session = p.data as Row;
      setQrCode(p.qrCode || display(keyOf(session, "Code")));
      setTtl(Number(p.ttlSeconds || 0));
      activeSessionId.current = idOf(session);
      recordsRevision.current++;
      setRecords([]);
      setLastSyncedAt("");
      setSelectedSession(session);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được phiên");
    } finally {
      setBusy(false);
    }
  };
  const selectedLesson = lessons.find(
    (lesson) => String(lesson.courseOfferingId) === form.courseOfferingId,
  );
  const attendanceState = selectedLesson
    ? attendanceWindowState(selectedLesson)
    : "unavailable";
  const updateStatus = async (record: Row, status: string) => {
    const attendance = (keyOf(record, "attendance") || {}) as Row;
    const attendanceId = idOf(attendance);
    if (!attendanceId)
      return setError("Bản ghi điểm danh chưa có ID. Hãy làm mới phiên.");
    const updatingSessionId = activeSessionId.current;
    pendingUpdates.current++;
    recordsRevision.current++;
    try {
      await apiRequest(token, `/attendances/${attendanceId}`, {
        method: "PUT",
        body: JSON.stringify({ status, note: "Cập nhật từ dashboard web" }),
      });
      if (activeSessionId.current !== updatingSessionId) return;
      setRecords((old) =>
        old.map((item) =>
          idOf((keyOf(item, "attendance") || {}) as Row) === attendanceId
            ? {
                ...item,
                status,
                attendance: {
                  ...((keyOf(item, "attendance") || {}) as Row),
                  Status: status,
                },
              }
            : item,
        ),
      );
      onToast("Đã cập nhật điểm danh");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được");
    } finally {
      pendingUpdates.current--;
      recordsRevision.current++;
      setRefreshVersion(value => value + 1);
    }
  };
  const close = async () => {
    if (!selectedSession) return;
    const closingSessionId = idOf(selectedSession);
    pendingUpdates.current++;
    recordsRevision.current++;
    setBusy(true);
    try {
      const p = await apiRequest(
        token,
        `/attendance/sessions/${idOf(selectedSession)}/close`,
        { method: "POST" },
      );
      onToast(p.message || "Đã đóng phiên");
      if (activeSessionId.current === closingSessionId) {
        setSelectedSession({ ...selectedSession, IsActive: false });
        setTtl(0);
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đóng được phiên");
    } finally {
      pendingUpdates.current--;
      recordsRevision.current++;
      setRefreshVersion(value => value + 1);
      setBusy(false);
    }
  };
  return (
    <section className="feature-page">
      <div className="feature-heading">
        <div>
          <p className="eyebrow">Chỉ mở theo đúng tiết dạy hôm nay</p>
          <h1>Điểm danh</h1>
          <p>
            Chọn tiết được admin phân công; lớp, môn và ngày học được khóa tự động.
          </p>
        </div>
      </div>
      {lessons.length === 0 ? (
        <div className="feature-form">
          <strong>Hôm nay bạn không có lịch dạy</strong>
          <p className="empty-note">Không thể tạo phiên điểm danh. Admin cần phân công môn và lịch dạy trước.</p>
        </div>
      ) : (
        <form className="feature-form" onSubmit={create}>
          <div className="form-grid">
            <label>
              Tiết dạy hôm nay
              <select required value={form.courseOfferingId} onChange={(e) => setForm({ ...form, courseOfferingId: e.target.value })}>
                {lessons.map((lesson) => (
                  <option key={lesson.courseOfferingId} value={lesson.courseOfferingId}>
                    {lesson.classCode} · {lesson.courseName} · {timeRange(lesson)} · {lesson.roomName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ghi chú
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
          </div>
          <p className="empty-note">{attendanceWindowLabel(attendanceState)}</p>
          <button className="primary-button" disabled={busy || attendanceState !== "open"}>
            <Icon name="attendance" size={15} />
            {busy ? "Đang xử lý..." : "Tạo phiên điểm danh"}
          </button>
        </form>
      )}
      {error && <div className="feature-error">! {error}</div>}
      <div className="attendance-layout">
        <div className="panel">
          <PanelHeader title="Các phiên gần đây" sub="Chọn phiên để quản lý" />
          <div className="session-list">
            {sessions.length === 0 ? (
              <p className="empty-note">Chưa có phiên.</p>
            ) : (
              sessions.map((session) => (
                <button
                  key={idOf(session)}
                  className={
                    idOf(selectedSession || {}) === idOf(session)
                      ? "selected"
                      : ""
                  }
                  onClick={() => selectSession(session)}>
                  <strong>
                    {display(pick(session, "Class.ClassCode"))} ·{" "}
                    {display(pick(session, "Course.Name"))}
                  </strong>
                  <span>{attendanceDate(keyOf(session, "ClassDate"))}</span>
                  <small>
                    {keyOf(session, "IsActive") ? "Đang mở" : "Đã đóng"}
                  </small>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="panel attendance-detail">
          {!selectedSession ? (
            <p className="empty-note">
              Chọn một phiên để xem mã và danh sách điểm danh.
            </p>
          ) : (
            <>
              <div className="qr-code-card">
                <small>MÃ ĐIỂM DANH HIỆN TẠI</small>
                <AttendanceQr
                  value={qrCode || String(keyOf(selectedSession, "Code") || "")}
                />
                <strong>
                  {qrCode || display(keyOf(selectedSession, "Code"))}
                </strong>
                <span>Còn {ttl}s</span>
                <button
                  onClick={() =>
                    navigator.clipboard?.writeText(
                      qrCode || String(keyOf(selectedSession, "Code") || ""),
                    )
                  }>
                  <Icon name="copy" size={14} />
                  Sao chép mã
                </button>
              </div>
              <div className="form-actions">
                <button
                  className="refresh-button"
                  onClick={() => selectSession(selectedSession)}>
                  <Icon name="refresh" size={15} />
                  Làm mới
                </button>
                {keyOf(selectedSession, "IsActive") !== false && (
                  <button
                    className="danger-button"
                    disabled={busy}
                    onClick={close}>
                    Đóng phiên
                  </button>
                )}
              </div>
              <p className={`attendance-sync${syncError ? " attendance-sync-error" : ""}`} role="status">
                {syncError ? `Chưa đồng bộ được: ${syncError}. Hệ thống sẽ thử lại.` : `${sessionActive ? "Tự cập nhật mỗi 3 giây" : "Phiên đã đóng"}${lastSyncedAt ? ` · Cập nhật lúc ${lastSyncedAt}` : " · Đang tải danh sách…"}`}
              </p>
              <div className="attendance-records">
                {records.map((record, index) => {
                  const enrollment = (keyOf(record, "enrollment") || {}) as Row;
                  const attendance = (keyOf(record, "attendance") || {}) as Row;
                  const currentStatus = String(
                    keyOf(attendance, "Status") ||
                      keyOf(record, "status") ||
                      "absent",
                  ).toLowerCase();
                  return (
                    <div
                      className="attendance-record"
                      key={idOf(attendance) || index}>
                      <div>
                        <strong>
                          {display(pick(enrollment, "Student.User.FullName"))}
                        </strong>
                        <span>
                          {display(pick(enrollment, "Student.StudentCode"))}
                        </span>
                      </div>
                      <select
                        value={currentStatus}
                        onChange={(e) => updateStatus(record, e.target.value)}>
                        <option value="present">Có mặt</option>
                        <option value="absent">Vắng</option>
                        <option value="late">Đi trễ</option>
                        <option value="excused">Có phép</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

type ExerciseForm = {
  courseOfferingId: string;
  title: string;
  description: string;
  attachment: string;
  dueDate: string;
};
type SubmissionDraft = { score: string; feedback: string };

export function ExerciseManager({
  token,
  onToast,
}: {
  token: string;
  onToast: ToastHandler;
}) {
  const emptyForm: ExerciseForm = {
    courseOfferingId: "",
    title: "",
    description: "",
    attachment: "",
    dueDate: "",
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ExerciseForm>(emptyForm);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [submissions, setSubmissions] = useState<Row[]>([]);
  const [gradeDrafts, setGradeDrafts] = useState<
    Record<number, SubmissionDraft>
  >({});
  const [availability, setAvailability] = useState<Row | null>(null);
  const [newDeadline, setNewDeadline] = useState("");
  const [now, setNow] = useState(Date.now());
  const submissionRequest = useRef(0);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const isOpen = (row: Row) => keyOf(row, "Status") === "open" && new Date(String(keyOf(row, "DueDate"))).getTime() > now;
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const [e, c] = await Promise.all([
        apiRequest(token, "/exercises"),
        apiRequest(token, "/teacher/classes"),
      ]);
      setRows(e.data || []);
      setClasses((c.data || []).flatMap((row: Row) => ((keyOf(row,"CourseOfferings") || []) as Row[]).map(offering => ({ ...offering, ClassCode: `${display(keyOf(row,"ClassCode"))} · ${display(pick(offering,"Course.Name"))} · ${display(pick(offering,"Semester.Name"))}` }))));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được bài tập");
    }
  };
  useEffect(() => {
    load();
  }, [token]);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const p = await apiRequest(token, "/exercises", {
        method: "POST",
        body: JSON.stringify({
          courseOfferingId: Number(form.courseOfferingId),
          title: form.title,
          description: form.description,
          attachment: form.attachment,
          dueDate: new Date(form.dueDate).toISOString(),
        }),
      });

      onToast(p.message || "Đã tạo bài tập");
      setForm(emptyForm);
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được bài tập");
    } finally {
      setBusy(false);
    }
  };
  const viewSubmissions = async (exercise: Row) => {
    const request = ++submissionRequest.current;
    setSelected(exercise);
    setSubmissions([]);
    setGradeDrafts({});
    try {
      const p = await apiRequest(
        token,
        `/exercises/${idOf(exercise)}/submissions`,
      );
      if (request !== submissionRequest.current) return;
      const data = p.data || [];
      setSubmissions(data);
      const next: Record<number, SubmissionDraft> = {};
      for (const s of data as Row[])
        next[idOf(s)] = {
          score: String(keyOf(s, "Score") ?? ""),
          feedback: String(keyOf(s, "Feedback") ?? ""),
        };
      setGradeDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được bài nộp");
    }
  };
  const grade = async (submission: Row) => {
    const id = idOf(submission);
    const d = gradeDrafts[id];
    if (!d || d.score === "") return setError("Nhập điểm trước khi lưu.");
    setBusy(true);
    try {
      const p = await apiRequest(token, `/submissions/${id}/grade`, {
        method: "PUT",
        body: JSON.stringify({ score: Number(d.score), feedback: d.feedback, submittedAt: keyOf(submission, "SubmittedAt") }),
      });
      onToast(p.message || "Đã chấm bài");
      if (selected) viewSubmissions(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không chấm được bài");
    } finally {
      setBusy(false);
    }
  };
  const updateAvailability = async (exercise: Row, status: "open" | "closed") => {
    setBusy(true); setError("");
    try {
      const p = await apiRequest(token, `/exercises/${idOf(exercise)}/availability`, { method: "PUT", body: JSON.stringify({ status, ...(status === "open" ? { dueDate: new Date(newDeadline).toISOString() } : {}) }) });
      onToast(p.message); setAvailability(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không cập nhật được hạn nộp"); }
    finally { setBusy(false); }
  };
  return (
    <section className="feature-page">
      <div className="feature-heading">
        <div>
          <p className="eyebrow">Tạo bài · theo dõi bài nộp · chấm điểm</p>
          <h1>Bài tập</h1>
          <p>Toàn bộ vòng đời bài tập trên một trang.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setFormOpen(!formOpen)}>
          <Icon name={formOpen ? "close" : "plus"} size={15} />
          {formOpen ? "Đóng form" : "Tạo bài tập"}
        </button>
      </div>
      {formOpen && (
        <form className="feature-form" onSubmit={create}>
          <div className="form-grid">
            <label>
              Học phần
              <select
                required
                value={form.courseOfferingId}
                onChange={(e) => setForm({ ...form, courseOfferingId: e.target.value })}>
                <option value="">Chọn học phần</option>
                {classes.map((row) => (
                  <option key={idOf(row)} value={idOf(row)}>
                    {display(keyOf(row, "ClassCode"))}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tên bài tập
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Hạn nộp
              <input
                type="datetime-local"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </label>
            <label>
              Đường dẫn tài liệu
              <input
                value={form.attachment}
                onChange={(e) =>
                  setForm({ ...form, attachment: e.target.value })
                }
              />
            </label>
            <label className="span-2">
              Mô tả
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
          </div>
          <button className="primary-button" disabled={busy}>
            {busy ? "Đang lưu..." : "Lưu bài tập"}
          </button>
        </form>
      )}
      {error && <div className="feature-error">! {error}</div>}
      {availability && <form className="feature-form" onSubmit={event => { event.preventDefault(); void updateAvailability(availability, "open"); }}><h2>Mở lại / gia hạn: {display(keyOf(availability, "Title"))}</h2><label>Hạn nộp mới<input type="datetime-local" required value={newDeadline} onChange={event => setNewDeadline(event.target.value)} /></label><p>Đến hạn mới, hệ thống tự khóa nộp bài.</p><div className="form-actions"><button className="primary-button" disabled={busy}>Mở nhận bài</button><button type="button" className="refresh-button" onClick={() => setAvailability(null)}>Hủy</button></div></form>}
      <button className="refresh-button" onClick={load}>Làm mới bài tập</button>
      <div className="split-layout">
        <div className="feature-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bài tập</th>
                <th>Lớp</th>
                <th>Hạn nộp</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>Chưa có bài tập.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={idOf(row)}>
                    <td>
                      <strong>{display(keyOf(row, "Title"))}</strong>
                    </td>
                    <td>{display(pick(row, "Class.ClassCode"))}<small className="cell-sub">{display(pick(row,"CourseOffering.Course.Name"))} · {display(pick(row,"CourseOffering.Semester.Name"))}</small></td>
                    <td>{display(keyOf(row, "DueDate"))}</td>
                    <td>{isOpen(row) ? "Đang nhận bài" : "Đã khóa / hết hạn"}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => viewSubmissions(row)}>
                          Bài nộp
                        </button>
                        <button disabled={busy} onClick={() => { setAvailability(row); setNewDeadline(""); }}>{isOpen(row) ? "Gia hạn" : "Mở khóa"}</button>
                        {isOpen(row) && <button disabled={busy} onClick={() => updateAvailability(row, "closed")}>Khóa nộp</button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {selected && (
          <div className="panel submissions-drawer">
            <div className="drawer-head">
              <div>
                <strong>{display(keyOf(selected, "Title"))}</strong>
                <span>{submissions.length} bài đã nộp</span>
              </div>
              <button onClick={() => { submissionRequest.current++; setSelected(null); }}>
                <Icon name="close" size={16} />
              </button>
            </div>
            {submissions.length === 0 ? (
              <p className="empty-note">Chưa có bài nộp.</p>
            ) : (
              submissions.map((submission) => {
                const id = idOf(submission);
                const d = gradeDrafts[id] || { score: "", feedback: "" };
                return (
                  <div className="submission-grade" key={id}>
                    <div>
                      <strong>
                        {display(pick(submission, "Student.User.FullName"))}
                      </strong>
                      <small>
                        {display(keyOf(submission, "SubmittedAt"))} ·{" "}
                        {statusLabel(keyOf(submission, "Status"))}
                      </small>
                      <p>{display(keyOf(submission, "Content"))}</p>
                      {keyOf(submission, "FileURL") && (
                        <a
                          href={String(keyOf(submission, "FileURL"))}
                          target="_blank"
                          rel="noreferrer">
                          Mở file bài nộp
                        </a>
                      )}
                    </div>
                    <label>
                      Điểm
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={d.score}
                        onChange={(e) =>
                          setGradeDrafts({
                            ...gradeDrafts,
                            [id]: { ...d, score: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      Phản hồi
                      <input
                        value={d.feedback}
                        onChange={(e) =>
                          setGradeDrafts({
                            ...gradeDrafts,
                            [id]: { ...d, feedback: e.target.value },
                          })
                        }
                      />
                    </label>
                    <button disabled={busy} onClick={() => grade(submission)}>
                      Lưu điểm
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
}
