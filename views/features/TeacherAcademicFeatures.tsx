"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { apiRequest, display, idOf, keyOf, pick, statusLabel } from "@/controllers/api.controller";
import type { Row, ToastHandler } from "@/models/dashboard";
import { TeachingOfferDetails, offerSchedules } from "./TeachingOfferPlan";
import { Icon } from "@/components/ui/Icon";

export function TeacherOffers({ token, onToast }: { token: string; onToast: ToastHandler }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const load = async () => {
    try { const p = await apiRequest(token, "/class-offers"); setRows(p.data || []); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được đề xuất"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [token]);
  const respond = async (row: Row, action: "accept" | "reject") => {
    if (busyId) return;
    const id = idOf(row); setBusyId(id); setError("");
    try {
      const p = await apiRequest(token, `/class-offers/${id}/${action}`, { method: "POST", body: JSON.stringify({ note: notes[id] || "" }) });
      onToast(p.message || "Đã phản hồi", "success");
      await load();
    } catch (e) { const message = e instanceof Error ? e.message : "Không phản hồi được"; setError(message); onToast(message, "error"); }
    finally { setBusyId(0); }
  };
  return <section className="feature-page">
    <div className="feature-heading"><div><p className="eyebrow">Kế hoạch giảng dạy được đề xuất</p><h1>Đề xuất lớp</h1><p>Xem thông tin lớp, môn học và lịch giảng dạy để phản hồi đề xuất phân công.</p></div><button className="refresh-button" onClick={load}>Làm mới</button></div>
    {error && <div className="feature-error" role="alert">{error}</div>}
    {loading ? <p>Đang tải đề xuất...</p> : !rows.length && <p>Chưa có đề xuất giảng dạy.</p>}
    <div className="teaching-offer-list">{rows.map(row => {
      const pending = String(keyOf(row,"Status")).toLowerCase() === "pending";
      const complete = offerSchedules(row).length > 0;
      const id = idOf(row);
      return <article className="teaching-offer-card" key={id}>
        <header><div><h2>{display(keyOf(row,"Title") || "Đề xuất giảng dạy")} · {display(pick(row,"Class.ClassCode"))}</h2><p>{display(pick(row,"Class.Major.Name"))} · Gửi bởi {display(pick(row,"OfferedByUser.FullName"))} · {display(keyOf(row,"OfferedAt"))}</p></div><span className={`offer-status offer-status-${String(keyOf(row,"Status"))}`}>{statusLabel(keyOf(row,"Status"))}</span></header>
        <TeachingOfferDetails row={row} />
        {keyOf(row,"Content") || keyOf(row,"Message") ? <p className="offer-message">{display(keyOf(row,"Content") || keyOf(row,"Message"))}</p> : null}
        {pending ? <footer><label>Ghi chú phản hồi<textarea value={notes[id] || ""} onChange={e => setNotes(current => ({...current,[id]:e.target.value}))} placeholder="Ví dụ: xác nhận lịch, hoặc lý do từ chối" rows={2} disabled={!!busyId} /></label><div className="form-actions"><button className="refresh-button" disabled={!!busyId} onClick={() => respond(row,"reject")}>Từ chối</button><button className="primary-button" disabled={!!busyId || !complete} onClick={() => respond(row,"accept")}>{busyId === id ? "Đang xử lý..." : "Chấp nhận & xếp lịch"}</button></div></footer> : <p>Phản hồi: {display(keyOf(row,"ResponseNote"))} · {display(keyOf(row,"RespondedAt"))}</p>}
      </article>;
    })}</div>
  </section>;
}

type GradeDraft = { assignmentScore: string; midtermScore: string; finalScore: string; remark: string };

export function GradeManager({ token, onToast }: { token: string; onToast: ToastHandler }) {
  const [offeringId, setOfferingId] = useState("");
  const [classes, setClasses] = useState<Row[]>([]); const [classId, setClassId] = useState(""); const [rows, setRows] = useState<Row[]>([]); const [drafts, setDrafts] = useState<Record<number, GradeDraft>>({}); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { apiRequest(token, "/teacher/classes").then((p) => setClasses(p.data || [])).catch((e) => setError(e.message)); }, [token]);
  const loadGrades = async (id = classId, offering = offeringId) => { if (!id) return; try { const p = await apiRequest(token, `/classes/${id}/grades?courseOfferingId=${offering}`); const data = p.data || []; setRows(data); const next: Record<number, GradeDraft> = {}; for (const enrollment of data as Row[]) { const enrollmentId = idOf(enrollment); const grade = (keyOf(enrollment, "Grade") || {}) as Row; next[enrollmentId] = { assignmentScore: String(keyOf(grade, "AssignmentScore") ?? 0), midtermScore: String(keyOf(grade, "MidtermScore") ?? 0), finalScore: String(keyOf(grade, "FinalScore") ?? 0), remark: String(keyOf(grade, "Remark") ?? "") }; } setDrafts(next); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Không tải được bảng điểm"); } };
  const chooseClass = (value: string) => { const [classValue, offeringValue] = value.split(":"); setClassId(classValue || ""); setOfferingId(offeringValue || ""); setRows([]); setDrafts({}); if (classValue && offeringValue) loadGrades(classValue, offeringValue); };
  const save = async (enrollment: Row) => { const enrollmentId = idOf(enrollment); const d = drafts[enrollmentId]; if (!d) return; setBusy(true); try { const p = await apiRequest(token, "/grades", { method: "POST", body: JSON.stringify({ enrollmentId, assignmentScore: Number(d.assignmentScore), midtermScore: Number(d.midtermScore), finalScore: Number(d.finalScore), remark: d.remark }) }); onToast(p.message || "Đã lưu điểm"); loadGrades(); } catch (e) { const message = e instanceof Error ? e.message : "Không lưu được điểm"; setError(message); onToast(message, "error"); } finally { setBusy(false); } };
  const approve = async (enrollment: Row) => { const grade = (keyOf(enrollment, "Grade") || {}) as Row; const gradeId = idOf(grade); if (!gradeId) return setError("Hãy lưu điểm trước khi duyệt."); setBusy(true); try { const p = await apiRequest(token, `/grades/${gradeId}/approve`, { method: "POST" }); onToast(p.message || "Đã duyệt điểm"); loadGrades(); } catch (e) { const message = e instanceof Error ? e.message : "Không duyệt được điểm"; setError(message); onToast(message, "error"); } finally { setBusy(false); } };
  const approveClass = async () => { if (!classId || !confirm("Duyệt toàn bộ điểm của học phần? Sau khi duyệt, điểm không thể sửa.")) return; setBusy(true); try { const p = await apiRequest(token, `/classes/${classId}/grades/approve?courseOfferingId=${offeringId}`, { method: "POST" }); onToast(p.message || "Đã duyệt điểm toàn lớp"); loadGrades(); } catch (e) { const message = e instanceof Error ? e.message : "Không duyệt được lớp"; setError(message); onToast(message, "error"); } finally { setBusy(false); } };
  return <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">30% bài tập · 30% giữa kỳ · 40% cuối kỳ</p><h1>Bảng điểm</h1><p>Nhập và duyệt điểm học phần để cập nhật kết quả học tập của sinh viên.</p></div>{classId && <button className="primary-button" disabled={busy} onClick={approveClass}><Icon name="check" size={15} />Duyệt điểm học phần</button>}</div><div className="feature-tools"><label className="feature-search">Học phần <select value={classId ? `${classId}:${offeringId}` : ""} onChange={(e) => chooseClass(e.target.value)}><option value="">Chọn lớp để nhập điểm</option>{classes.flatMap(row => ((keyOf(row,"CourseOfferings") || []) as Row[]).map(offering => <option key={idOf(offering)} value={`${idOf(row)}:${idOf(offering)}`}>{display(keyOf(row,"ClassCode"))} · {display(pick(offering,"Course.Name"))} · {display(pick(offering,"Semester.Name"))}</option>))}</select></label>{classId && <button className="refresh-button" onClick={() => loadGrades()}><Icon name="refresh" size={15} />Làm mới</button>}</div>{error && <div className="feature-error">! {error}</div>}<div className="feature-table-wrap grades-table"><table><thead><tr><th>Sinh viên</th><th>Môn</th><th>Bài tập</th><th>Giữa kỳ</th><th>Cuối kỳ</th><th>Tổng</th><th>Chữ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{!classId ? <tr><td colSpan={9}>Chọn lớp để xem bảng điểm.</td></tr> : rows.length === 0 ? <tr><td colSpan={9}>Lớp chưa có đăng ký học phần.</td></tr> : rows.map((enrollment) => { const eid = idOf(enrollment); const d = drafts[eid] || { assignmentScore: "0", midtermScore: "0", finalScore: "0", remark: "" }; const grade = (keyOf(enrollment, "Grade") || {}) as Row; const approved = String(keyOf(grade, "Status")).toLowerCase() === "approved"; return <tr key={eid}><td><strong>{display(pick(enrollment, "Student.User.FullName"))}</strong><small className="cell-sub">{display(pick(enrollment, "Student.StudentCode"))}</small></td><td>{display(pick(enrollment, "Course.Name"))}<small className="cell-sub">{display(pick(enrollment,"CourseOffering.Semester.Name"))}</small></td>{(["assignmentScore", "midtermScore", "finalScore"] as const).map((key) => <td key={key}><input className="score-input" type="number" min="0" max="100" disabled={approved || busy} value={d[key]} onChange={(e) => setDrafts({ ...drafts, [eid]: { ...d, [key]: e.target.value } })} /></td>)}<td>{display(keyOf(grade, "TotalScore"))}</td><td>{display(keyOf(grade, "GradeLetter"))}</td><td>{statusLabel(keyOf(grade, "Status"))}</td><td><div className="row-actions">{!approved && <button disabled={busy} onClick={() => save(enrollment)}>Lưu</button>}{idOf(grade) > 0 && !approved && <button disabled={busy} onClick={() => approve(enrollment)}>Duyệt</button>}</div></td></tr>; })}</tbody></table></div></section>;
}
