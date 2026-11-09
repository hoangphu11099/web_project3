"use client";
import { PaginatedItems } from "@/components/common/Pagination";

import { PaginatedTable } from "@/components/common/Pagination";

import { useErrorFeedback } from "@/components/common/ErrorFeedback";
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
import type { MetadataData, Row, ToastHandler } from "@/models/dashboard";

import { TeachingOfferDialog, TeachingOfferDetails } from "./TeachingOfferPlan";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { Icon } from "@/components/ui/Icon";

export { WarningPage } from "./WarningPage";

export function NotificationPage({ token, onToast }: { token: string; onToast: ToastHandler }) {
  const [composeOpen,setComposeOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [recipients, setRecipients] = useState<{ classes: Row[]; cohorts: Row[]; students: Row[]; teachers: Row[] }>({ classes: [], cohorts: [], students: [], teachers: [] });
  const [targetType, setTargetType] = useState("class");
  const [targetValue, setTargetValue] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sendNow, setSendNow] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Row | null>(null);
  const [error, setError] = useErrorFeedback();
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
      setComposeOpen(false);
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
    <button className="primary-button" onClick={()=>setComposeOpen(true)}>Tạo thông báo</button>
    {composeOpen&&<FeatureDialog className="entity-editor-dialog" title="Tạo thông báo" description="Chọn người nhận và soạn nội dung thông báo." onClose={()=>{if(!busy)setComposeOpen(false);}}>    <form className="feature-form entity-editor-form" onSubmit={submit}><fieldset disabled={busy}>
      <div className="form-grid">
        <label>Đối tượng nhận<select value={targetType} onChange={(e) => changeTargetType(e.target.value)}><option value="class">Theo lớp</option><option value="cohort">Theo khóa</option><option value="student">Một sinh viên</option><option value="teacher">Một giảng viên</option><option value="all_students">Tất cả sinh viên</option><option value="all_teachers">Tất cả giảng viên</option><option value="email">Một email ngoài hệ thống</option></select></label>
        {renderTargetControl()}
        <label>Tiêu đề<input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Nhập tiêu đề thông báo" /></label>
        <label className="span-3">Nội dung<textarea required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nhập nội dung cần gửi..." /></label>
      </div>
      </fieldset><div className="form-actions"><button type="button" className="refresh-button" disabled={busy} onClick={()=>setComposeOpen(false)}>Hủy bỏ</button><label className="check-line"><input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} /> Gửi thêm qua email (cần cấu hình SMTP)</label><button className="primary-button" disabled={busy}><Icon name="mail" size={15} />{busy ? "Đang gửi..." : `Gửi cho ${targetCount} người`}</button></div>
    </form></FeatureDialog>}
    {error && <div className="feature-error">! {error}</div>}
    <div className="feature-table-wrap"><PaginatedTable><thead><tr><th>Tiêu đề</th><th>Lớp đã gửi</th><th>Phạm vi</th><th>Kênh</th><th>Trạng thái</th><th>Thời gian</th><th>Chi tiết</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={7}>Chưa có thông báo.</td></tr> : rows.map((row) => <tr key={idOf(row)}><td><strong>{display(keyOf(row, "Subject"))}</strong></td><td>{notificationClasses(row)}</td><td>{notificationTargetLabel(String(keyOf(row, "TargetType")))}</td><td>{display(keyOf(row, "Channel"))}</td><td>{statusLabel(keyOf(row, "Status"))}</td><td>{display(keyOf(row, "CreatedAt"))}</td><td><div className="row-actions"><button type="button" onClick={() => setSelectedNotice(row)}>Xem</button></div></td></tr>)}</tbody></PaginatedTable></div>
    {selectedNotice && <div className="feature-form compact-form"><div className="feature-heading"><div><p className="eyebrow">Nội dung thông báo</p><h2>{display(keyOf(selectedNotice, "Subject"))}</h2><p style={{ whiteSpace: "pre-wrap" }}>{display(keyOf(selectedNotice, "Content"))}</p></div><button type="button" className="refresh-button" onClick={() => setSelectedNotice(null)}>Đóng</button></div></div>}
  </section>;
}

function notificationClasses(row: Row) {
  // Older exam notices already contain the exact class in their message.
  const examClass = String(keyOf(row, "Subject") || "").startsWith("Lịch thi · ")
    ? String(keyOf(row, "Content") || "").match(/^Lớp\s+(.+?)\s+·/)?.[1]
    : undefined;
  return examClass || String(keyOf(row, "RecipientClasses") || keyOf(row, "RecipientClassCode") || "").trim() || "Không theo lớp";
}

function notificationTargetLabel(value: string) {
  const labels: Record<string, string> = { student: "Sinh viên", teacher: "Giảng viên", user: "Cá nhân", class: "Lớp", cohort: "Khóa", all_students: "Tất cả SV", all_teachers: "Tất cả GV", email: "Email ngoài", academic_warning: "Cảnh báo học vụ" };
  return labels[value.toLowerCase()] || display(value);
}

export function ClassOfferAdminPage({ token, metadata, onToast }: { token: string; metadata: MetadataData; onToast: ToastHandler }) {
  const [offerOpen, setOfferOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const requestVersion = useRef(0);
  const [error, setError] = useErrorFeedback();
  const load = async () => {
    const version = ++requestVersion.current;
    try {
      const p = await apiRequest(token, "/class-offers", { cache: "no-store" });
      if (version !== requestVersion.current) return;
      setRows(Array.isArray(p.data) ? p.data : []); setError("");
    }
    catch (e) { if (version === requestVersion.current) setError(e instanceof Error ? e.message : "Không tải được lời mời giảng dạy"); }
  };
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    void load();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      requestVersion.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token]);
  const sent = (offer: Row) => {
    requestVersion.current++;
    setRows(current => [offer, ...current.filter(row => idOf(row) !== idOf(offer))]);
    setOfferOpen(false);
    load();
  };
  return <section className="feature-page">
    <div className="feature-heading"><div><h1>Phân công giảng dạy</h1><p>Phân công giảng viên và lập kế hoạch giảng dạy theo môn học, phòng học và thời gian.</p></div></div>
    <button type="button" className="primary-button" onClick={() => setOfferOpen(true)}><Icon name="plus" size={16} />Phân công lịch học</button>
    {offerOpen && <TeachingOfferDialog token={token} metadata={metadata} onToast={onToast} onClose={() => setOfferOpen(false)} onSent={sent} />}
    {error && <div className="feature-error" role="alert">{error}</div>}
    <OfferTable rows={rows} />
  </section>;
}

function offerDate(row: Row) {
  const raw = keyOf(row, "CreatedAt") || keyOf(row, "OfferedAt");
  const date = new Date(String(raw || ""));
  return Number.isFinite(date.getTime()) ? date : null;
}

function OfferTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const sorted = [...rows].sort((a, b) =>
    (offerDate(b)?.getTime() || 0) - (offerDate(a)?.getTime() || 0) || Number(idOf(b)) - Number(idOf(a)));
  const selectedOffer = selected && (rows.find(row => idOf(row) === idOf(selected)) || selected);
  const formatDate = (row: Row) => {
    const date = offerDate(row);
    return date ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date) : "—";
  };
  return <>
    <section className="offer-inbox" aria-label="Hộp thư lời mời giảng dạy">
      <div className="offer-inbox-heading"><strong>Lời mời đã gửi <span>({rows.length})</span></strong><small>Mới nhất ở trên</small></div>
      {sorted.length === 0 ? <p className="empty-note">Chưa có lời mời giảng dạy.</p> : (<PaginatedItems>{sorted.map(row => <button type="button" className={`offer-inbox-item ${keyOf(row, "Status") === "pending" ? "offer-inbox-pending" : ""}`} key={idOf(row)} onClick={() => setSelected(row)}>
        <span className="avatar blue"><Icon name="mail" size={18} /></span>
        <span className="offer-inbox-copy"><strong>{display(keyOf(row, "Title") || "Lời mời giảng dạy")}</strong><span>{display(pick(row, "Class.ClassCode"))} · {display(pick(row, "Teacher.User.FullName"))}</span></span>
        <span className="offer-inbox-meta"><span>{statusLabel(keyOf(row, "Status"))}</span><time dateTime={offerDate(row)?.toISOString()}>{formatDate(row)}</time></span>
        <Icon name="chevronRight" size={17} />
      </button>)}</PaginatedItems>)}
    </section>
    {selectedOffer && <FeatureDialog className="entity-editor-dialog offer-message-dialog" title={display(keyOf(selectedOffer, "Title") || "Lời mời giảng dạy")} description={`${display(pick(selectedOffer, "Class.ClassCode"))} · ${display(pick(selectedOffer, "Teacher.User.FullName"))}`} onClose={() => setSelected(null)}>
      <article className="offer-message-body">
        <div className="offer-message-meta"><span>{statusLabel(keyOf(selectedOffer, "Status"))}</span><time>{formatDate(selectedOffer)}</time></div>
        <p className="offer-message-content">{display(keyOf(selectedOffer, "Content") || keyOf(selectedOffer, "Message"))}</p>
        <TeachingOfferDetails row={selectedOffer} />
        {keyOf(selectedOffer, "ResponseNote") && <section className="offer-message-response"><strong>Phản hồi của giảng viên</strong><p>{display(keyOf(selectedOffer, "ResponseNote"))}</p></section>}
      </article>
    </FeatureDialog>}
  </>;
}
