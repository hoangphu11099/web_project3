"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import {
  apiRequest,
  display,
  idOf,
  keyOf,
  pick,
  statusLabel,
} from "@/controllers/api.controller";
import type { MetadataData, Row, ToastHandler } from "@/models/dashboard";

import { TeachingOfferForm, TeachingOfferDetails } from "./TeachingOfferPlan";
import { Icon } from "@/components/ui/Icon";

export { WarningPage } from "./WarningPage";

export function NotificationPage({ token, onToast }: { token: string; onToast: ToastHandler }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [recipients, setRecipients] = useState<{ classes: Row[]; cohorts: Row[]; students: Row[]; teachers: Row[] }>({ classes: [], cohorts: [], students: [], teachers: [] });
  const [targetType, setTargetType] = useState("class");
  const [targetValue, setTargetValue] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sendNow, setSendNow] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [notificationPayload, recipientPayload] = await Promise.all([
        apiRequest(token, "/notifications"),
        apiRequest(token, "/notifications/recipients"),
      ]);
      setRows(Array.isArray(notificationPayload.data) ? notificationPayload.data : []);
      setRecipients({
        classes: recipientPayload.data?.classes || [], cohorts: recipientPayload.data?.cohorts || [],
        students: recipientPayload.data?.students || [], teachers: recipientPayload.data?.teachers || [],
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được thông báo");
    }
  };

  useEffect(() => { load(); }, [token]);

  const targetCount = (() => {
    if (targetType === "all_students") return recipients.students.length;
    if (targetType === "all_teachers") return recipients.teachers.length;
    if (targetType === "email") return recipientEmail.trim() ? 1 : 0;
    if (targetType === "student" || targetType === "teacher") return targetValue ? 1 : 0;
    const source = targetType === "class" ? recipients.classes : recipients.cohorts;
    const selected = source.find((item) => String(targetType === "class" ? idOf(item) : keyOf(item, "code")) === targetValue);
    return Number(keyOf(selected || {}, "studentCount") || 0);
  })();

  const changeTargetType = (value: string) => {
    setTargetType(value); setTargetValue(""); setRecipientEmail(""); setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !content.trim()) { setError("Vui lòng nhập tiêu đề và nội dung thông báo"); return; }
    if (!["all_students", "all_teachers", "email"].includes(targetType) && !targetValue) { setError("Vui lòng chọn người nhận"); return; }
    if (targetType === "email" && !recipientEmail.trim()) { setError("Vui lòng nhập email người nhận"); return; }
    if (targetCount === 0) { setError("Nhóm đã chọn hiện không có người nhận"); return; }

    setBusy(true); setError("");
    try {
      const body: Record<string, unknown> = { targetType, subject: subject.trim(), content: content.trim(), sendNow };
      if (targetType === "student" || targetType === "teacher") body.recipientUserId = Number(targetValue);
      else if (targetType === "class") body.classId = Number(targetValue);
      else if (targetType === "cohort") body.cohort = targetValue;
      else if (targetType === "email") body.recipientEmail = recipientEmail.trim();

      const payload = await apiRequest(token, "/notifications/email", { method: "POST", body: JSON.stringify(body) });
      onToast(payload.message || "Đã tạo thông báo");
      setSubject(""); setContent(""); setTargetValue(""); setRecipientEmail("");
      await load();
    } catch (err) {
      { const message = err instanceof Error ? err.message : "Không gửi được thông báo"; setError(message); onToast(message, "error"); }
      await load();
    } finally { setBusy(false); }
  };

  const renderTargetControl = () => {
    if (targetType === "all_students" || targetType === "all_teachers") return null;
    if (targetType === "email") return <label>Email người nhận<input type="email" required value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="nguoinhan@example.com" /></label>;

    const source = targetType === "student" ? recipients.students : targetType === "teacher" ? recipients.teachers : targetType === "class" ? recipients.classes : recipients.cohorts;
    const label = targetType === "student" ? "Sinh viên" : targetType === "teacher" ? "Giảng viên" : targetType === "class" ? "Lớp" : "Khóa";
    return <label>{label}<select required value={targetValue} onChange={(e) => setTargetValue(e.target.value)}><option value="">-- Chọn {label.toLowerCase()} --</option>{source.map((item) => {
      const value = targetType === "class" ? String(idOf(item)) : targetType === "student" || targetType === "teacher" ? String(keyOf(item, "userId")) : String(keyOf(item, "code"));
      const optionLabel = targetType === "class" ? `${display(keyOf(item, "classCode"))} · ${display(keyOf(item, "studentCount"))} SV` : targetType === "cohort" ? `${display(keyOf(item, "code"))} · ${display(keyOf(item, "studentCount"))} SV` : `${display(keyOf(item, "code"))} · ${display(keyOf(item, "fullName"))}${keyOf(item, "classCode") ? ` · ${display(keyOf(item, "classCode"))}` : ""}`;
      return <option key={`${targetType}-${value}`} value={value}>{optionLabel}</option>;
    })}</select></label>;
  };

  return <section className="feature-page">
    <div className="feature-heading"><div><p className="eyebrow">Quản lý thông báo</p><h1>Thông báo</h1><p>Soạn và gửi thông báo đến sinh viên, giảng viên hoặc nhóm người nhận.</p></div></div>
    <form className="feature-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Đối tượng nhận<select value={targetType} onChange={(e) => changeTargetType(e.target.value)}><option value="class">Theo lớp</option><option value="cohort">Theo khóa</option><option value="student">Một sinh viên</option><option value="teacher">Một giảng viên</option><option value="all_students">Tất cả sinh viên</option><option value="all_teachers">Tất cả giảng viên</option><option value="email">Một email ngoài hệ thống</option></select></label>
        {renderTargetControl()}
        <label>Tiêu đề<input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Nhập tiêu đề thông báo" /></label>
        <label className="span-3">Nội dung<textarea required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nhập nội dung cần gửi..." /></label>
      </div>
      <div className="form-actions"><label className="check-line"><input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} /> Gửi thêm qua email (cần cấu hình SMTP)</label><button className="primary-button" disabled={busy}><Icon name="mail" size={15} />{busy ? "Đang gửi..." : `Gửi cho ${targetCount} người`}</button></div>
    </form>
    {error && <div className="feature-error">! {error}</div>}
    <div className="feature-table-wrap"><table><thead><tr><th>Tiêu đề</th><th>Người nhận</th><th>Phạm vi</th><th>Kênh</th><th>Trạng thái</th><th>Thời gian</th><th>Chi tiết</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={7}>Chưa có thông báo.</td></tr> : rows.map((row) => <tr key={idOf(row)}><td><strong>{display(keyOf(row, "Subject"))}</strong></td><td>{display(pick(row, "RecipientUser.FullName")) !== "—" ? display(pick(row, "RecipientUser.FullName")) : display(keyOf(row, "RecipientEmail"))}</td><td>{notificationTargetLabel(String(keyOf(row, "TargetType")))}</td><td>{display(keyOf(row, "Channel"))}</td><td>{statusLabel(keyOf(row, "Status"))}</td><td>{display(keyOf(row, "CreatedAt"))}</td><td><div className="row-actions"><button type="button" onClick={() => setSelectedNotice(row)}>Xem</button></div></td></tr>)}</tbody></table></div>
    {selectedNotice && <div className="feature-form compact-form"><div className="feature-heading"><div><p className="eyebrow">Nội dung thông báo</p><h2>{display(keyOf(selectedNotice, "Subject"))}</h2><p style={{ whiteSpace: "pre-wrap" }}>{display(keyOf(selectedNotice, "Content"))}</p></div><button type="button" className="refresh-button" onClick={() => setSelectedNotice(null)}>Đóng</button></div></div>}
  </section>;
}

function notificationTargetLabel(value: string) {
  const labels: Record<string, string> = { student: "Sinh viên", teacher: "Giảng viên", user: "Cá nhân", class: "Lớp", cohort: "Khóa", all_students: "Tất cả SV", all_teachers: "Tất cả GV", email: "Email ngoài", academic_warning: "Cảnh báo học vụ" };
  return labels[value.toLowerCase()] || display(value);
}

export function ClassOfferAdminPage({ token, metadata, onToast }: { token: string; metadata: MetadataData; onToast: ToastHandler }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const load = async () => {
    try { const p = await apiRequest(token, "/class-offers"); setRows(p.data || []); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load offers"); }
  };
  useEffect(() => { load(); }, [token]);
  return <section className="feature-page">
    <div className="feature-heading"><div><h1>Phân công giảng dạy</h1><p>Phân công giảng viên và lập kế hoạch giảng dạy theo môn học, phòng học và thời gian.</p></div></div>
    <TeachingOfferForm token={token} metadata={metadata} onToast={onToast} onSent={load} />
    {error && <div className="feature-error" role="alert">{error}</div>}
    <OfferTable rows={rows} />
  </section>;
}

function OfferTable({ rows }: { rows: Row[] }) {
  return (
    <div className="feature-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lớp</th>
            <th>Giảng viên</th>
            <th>Tiêu đề</th>
            <th>Nội dung đề xuất</th>
            <th>Trạng thái</th>
            <th>Phản hồi</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>Chưa có đề xuất phân công.</td>
            </tr>
          ) : (
            rows.map((row) => {
              const title =
                keyOf(row, "Title") || "Đề xuất phân công giảng dạy";

              const content = keyOf(row, "Content") || keyOf(row, "Message");

              return (
                <tr key={idOf(row)}>
                  <td>
                    <strong>{display(pick(row, "Class.ClassCode"))}</strong>
                  </td>

                  <td>{display(pick(row, "Teacher.User.FullName"))}</td>

                  <td>
                    <strong>{display(title)}</strong>
                  </td>

                  <td>
                    <div className="offer-content">{display(content)}</div>
                    <TeachingOfferDetails row={row} />
                  </td>

                  <td>{statusLabel(keyOf(row, "Status"))}</td>

                  <td>{display(keyOf(row, "ResponseNote"))}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
