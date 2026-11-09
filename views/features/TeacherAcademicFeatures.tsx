"use client";
import { PaginatedTable } from "@/components/common/Pagination";

import { useErrorFeedback } from "@/components/common/ErrorFeedback";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from "react";
import { apiRequest, display, idOf, keyOf, pick, statusLabel } from "@/controllers/api.controller";
import type { Row, ToastHandler } from "@/models/dashboard";
import { TeachingOfferDetails, offerSchedules } from "./TeachingOfferPlan";
import { classLessons } from "@/controllers/class-schedule";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { Icon } from "@/components/ui/Icon";

export function TeacherOffers({ token, onToast }: { token: string; onToast: ToastHandler }) {
  const [mailPage,setMailPage]=useState(1);
  const [mailBusy,setMailBusy]=useState(false);
  const [mailTab,setMailTab]=useState("all");
  const [opened,setOpened]=useState<number|null>(null);
  const [opening,setOpening]=useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useErrorFeedback();
  const [busyId, setBusyId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const requestVersion = useRef(0);
  const load = async () => {
    const version = ++requestVersion.current;
    try {
      const p = await apiRequest(token, "/teacher/class-offers", { cache: "no-store" });
      if (version !== requestVersion.current) return;
      setRows(p.data || []); setError("");
    }
    catch (e) { if (version === requestVersion.current) setError(e instanceof Error ? e.message : "Không tải được đề xuất"); }
    finally { if (version === requestVersion.current) setLoading(false); }
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
  const openMail=async(row:Row)=>{
    if(opening)return;setOpening(true);
    try{
      if(!keyOf(row,"ReadAt")){
        const result=await apiRequest(token,`/class-offers/${idOf(row)}/read`,{method:"PUT"});
        setRows(current=>current.map(item=>idOf(item)===idOf(row)?{...item,ReadAt:result.data.ReadAt}:item));
      }
      setOpened(idOf(row));
    }catch(reason){setError(reason instanceof Error?reason.message:"Cannot open invitation");}finally{setOpening(false);}
  };
  const manageMail=async(action:"read"|"delete",id?:number)=>{
    if(mailBusy||opening||busyId)return;
    if(action==="delete"&&!confirm(id?"Xóa thư đã đọc này?":"Xóa tất cả thư đã đọc trong hộp thư?"))return;
    setMailBusy(true);
    try{const result=await apiRequest(token,action==="read"?"/class-offers/read-all":id?`/class-offers/${id}`:"/class-offers/read",{method:action==="read"?"PUT":"DELETE"});if(action==="delete")setOpened(null);await load();onToast(result.message,"success");}
    catch(reason){setError(reason instanceof Error?reason.message:"Không cập nhật được hộp thư");}finally{setMailBusy(false);}
  };
  const ordered=[...rows].sort((a,b)=>Date.parse(String(keyOf(b,"OfferedAt")))-Date.parse(String(keyOf(a,"OfferedAt")))||idOf(b)-idOf(a));
  const visible=ordered.filter(row=>mailTab==="all"||(mailTab==="unread"?!keyOf(row,"ReadAt"):!!keyOf(row,"ReadAt")));
  const totalPages=Math.max(1,Math.ceil(visible.length/20));
  const currentPage=Math.min(mailPage,totalPages);
  const pageRows=visible.slice((currentPage-1)*20,currentPage*20);
  return <section className="feature-page">
    <div className="feature-heading"><div><p className="eyebrow">Kế hoạch giảng dạy được đề xuất</p><h1>Đề xuất lớp</h1><p>Xem thông tin lớp, môn học và lịch giảng dạy để phản hồi đề xuất phân công.</p></div><button className="refresh-button" onClick={load}>Làm mới</button></div>
    {error && <div className="feature-error" role="alert">{error}</div>}
    {loading ? <p>Đang tải đề xuất...</p> : !rows.length && <p>Chưa có đề xuất giảng dạy.</p>}
    <div className="teacher-tabs" role="tablist" aria-label="Hộp thư đề xuất">{[["all","Tất cả"],["unread","Chưa đọc"],["read","Đã đọc"]].map(([value,label])=><button key={value} role="tab" aria-selected={mailTab===value} onClick={()=>{setMailTab(value);setMailPage(1);}}>{label} ({rows.filter(row=>value==="all"||(value==="unread"?!keyOf(row,"ReadAt"):!!keyOf(row,"ReadAt"))).length})</button>)}</div>
    <div className="form-actions"><button className="refresh-button" disabled={mailBusy||opening||!!busyId||!rows.some(row=>!keyOf(row,"ReadAt"))} onClick={()=>void manageMail("read")}>Đánh dấu tất cả đã đọc</button><button className="refresh-button" disabled={mailBusy||opening||!!busyId||!rows.some(row=>keyOf(row,"ReadAt"))} onClick={()=>void manageMail("delete")}>Xóa tất cả thư đã đọc</button></div>
    <div className="offer-inbox">{pageRows.map(row=><button className={`offer-mail-row ${!keyOf(row,"ReadAt")?"unread":""}`} key={idOf(row)} disabled={opening||mailBusy} onClick={()=>void openMail(row)}><span className="offer-mail-dot" aria-label={!keyOf(row,"ReadAt")?"Chưa đọc":"Đã đọc"}/><span className="offer-mail-main"><span className="offer-mail-subject">{display(keyOf(row,"Title")||"Thư mời giảng dạy")} · {display(pick(row,"Class.ClassCode"))}</span><small>{display(pick(row,"OfferedByUser.FullName"))} · {display(pick(row,"Course.Name"))}</small></span><span className={`offer-status offer-status-${String(keyOf(row,"Status"))}`}>{statusLabel(keyOf(row,"Status"))}</span><time>{display(keyOf(row,"OfferedAt"))}</time></button>)}{!loading&&!visible.length&&<p className="empty-note">Không có thư trong mục này.</p>}</div>
    <div className="report-pagination"><span>Trang {currentPage}/{totalPages} · {visible.length} thư</span><button className="refresh-button" disabled={currentPage<=1} onClick={()=>setMailPage(currentPage-1)}>Trước</button><button className="refresh-button" disabled={currentPage>=totalPages} onClick={()=>setMailPage(currentPage+1)}>Sau</button></div>
    <div className="teaching-offer-list">{rows.filter(row=>idOf(row)===opened).map(row => {
      const pending = String(keyOf(row,"Status")).toLowerCase() === "pending";
      const complete = offerSchedules(row).length > 0;
      const id = idOf(row);
      return <FeatureDialog title="Thư mời giảng dạy" key={id} onClose={()=>{if(!busyId)setOpened(null);}}><article className="teaching-offer-card">
        <header><div><h2>{display(keyOf(row,"Title") || "Đề xuất giảng dạy")} · {display(pick(row,"Class.ClassCode"))}</h2><p>{display(pick(row,"Class.Major.Name"))} · Gửi bởi {display(pick(row,"OfferedByUser.FullName"))} · {display(keyOf(row,"OfferedAt"))}</p></div><span className={`offer-status offer-status-${String(keyOf(row,"Status"))}`}>{statusLabel(keyOf(row,"Status"))}</span></header>
        {!!keyOf(row,"ReadAt")&&<button className="refresh-button" disabled={mailBusy||!!busyId} onClick={()=>void manageMail("delete",id)}>Xóa thư này</button>}
        <TeachingOfferDetails row={row} />
        {keyOf(row,"Content") || keyOf(row,"Message") ? <p className="offer-message">{display(keyOf(row,"Content") || keyOf(row,"Message"))}</p> : null}
        {pending ? <footer><label>Ghi chú phản hồi<textarea value={notes[id] || ""} onChange={e => setNotes(current => ({...current,[id]:e.target.value}))} placeholder="Ví dụ: xác nhận lịch, hoặc lý do từ chối" rows={2} disabled={!!busyId} /></label><div className="form-actions"><button className="refresh-button" disabled={!!busyId} onClick={() => respond(row,"reject")}>Từ chối</button><button className="primary-button" disabled={!!busyId || !complete} onClick={() => respond(row,"accept")}>{busyId === id ? "Đang xử lý..." : "Chấp nhận & xếp lịch"}</button></div></footer> : <p>Phản hồi: {display(keyOf(row,"ResponseNote"))} · {display(keyOf(row,"RespondedAt"))}</p>}
      </article></FeatureDialog>;
    })}</div>
  </section>;
}

type GradeDraft = { assignmentScore: string; midtermScore: string; finalScore: string; remark: string };

export function GradeManager({ token, onToast }: { token: string; onToast: ToastHandler }) {
  const [semesterFilter,setSemesterFilter]=useState("current");
  const [clock,setClock]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),60000);return()=>window.clearInterval(timer);},[]);
  const [offeringId, setOfferingId] = useState("");
  const [classes, setClasses] = useState<Row[]>([]); const [classId, setClassId] = useState(""); const [rows, setRows] = useState<Row[]>([]); const [drafts, setDrafts] = useState<Record<number, GradeDraft>>({}); const [error, setError] = useErrorFeedback(); const [busy, setBusy] = useState(false);
  useEffect(() => { apiRequest(token, "/teacher/classes").then((p) => setClasses(p.data || [])).catch((e) => setError(e.message)); }, [token]);
  const offerings=classes.flatMap(row=>((keyOf(row,"CourseOfferings")||[]) as Row[]).map(offering=>({row,offering})));
  const termState=(offering:Row)=>{
    const start=Date.parse(`${String(pick(offering,"Semester.StartDate")||"").slice(0,10)}T00:00:00+07:00`);
    const end=Date.parse(`${String(pick(offering,"Semester.EndDate")||"").slice(0,10)}T23:59:59+07:00`);
    return start>clock?"future":end<clock||pick(offering,"Semester.Status")==="closed"?"past":"current";
  };
  const upcoming=(offering:Row)=>{
    const lessons=classLessons(offering).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
    return termState(offering)==="future"||!!lessons.length&&Date.parse(`${lessons[0].date}T${lessons[0].startTime||"00:00"}+07:00`)>clock;
  };
  const terms=Array.from(new Map(offerings.map(({offering})=>[String(keyOf(offering,"SemesterID")),String(pick(offering,"Semester.Name"))])).entries());
  const visibleOfferings=offerings.filter(({offering})=>semesterFilter==="current"?termState(offering)!=="past":String(keyOf(offering,"SemesterID"))===semesterFilter).sort((a,b)=>Number(upcoming(a.offering))-Number(upcoming(b.offering))||String(keyOf(a.row,"ClassCode")).localeCompare(String(keyOf(b.row,"ClassCode"))));
  const loadGrades = async (id = classId, offering = offeringId) => { if (!id) return; try { const p = await apiRequest(token, `/classes/${id}/grades?courseOfferingId=${offering}`); const data = p.data || []; setRows(data); const next: Record<number, GradeDraft> = {}; for (const enrollment of data as Row[]) { const enrollmentId = idOf(enrollment); const grade = (keyOf(enrollment, "Grade") || {}) as Row; next[enrollmentId] = { assignmentScore: String(keyOf(grade, "AssignmentScore") ?? 0), midtermScore: String(keyOf(grade, "MidtermScore") ?? 0), finalScore: String(keyOf(grade, "FinalScore") ?? 0), remark: String(keyOf(grade, "Remark") ?? "") }; } setDrafts(next); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Không tải được bảng điểm"); } };
  const chooseClass = (value: string) => { const [classValue, offeringValue] = value.split(":"); if(value&&offerings.some(({offering})=>String(idOf(offering))===offeringValue&&upcoming(offering)))return; setClassId(classValue || ""); setOfferingId(offeringValue || ""); setRows([]); setDrafts({}); if (classValue && offeringValue) loadGrades(classValue, offeringValue); };
  const save = async (enrollment: Row) => { const enrollmentId = idOf(enrollment); const d = drafts[enrollmentId]; if (!d) return; setBusy(true); try { const p = await apiRequest(token, "/grades", { method: "POST", body: JSON.stringify({ enrollmentId, assignmentScore: Number(d.assignmentScore), midtermScore: Number(d.midtermScore), finalScore: Number(d.finalScore), remark: d.remark }) }); onToast(p.message || "Đã lưu điểm"); loadGrades(); } catch (e) { const message = e instanceof Error ? e.message : "Không lưu được điểm"; setError(message); onToast(message, "error"); } finally { setBusy(false); } };
  const approve = async (enrollment: Row) => { const grade = (keyOf(enrollment, "Grade") || {}) as Row; const gradeId = idOf(grade); if (!gradeId) return setError("Hãy lưu điểm trước khi duyệt."); setBusy(true); try { const p = await apiRequest(token, `/grades/${gradeId}/approve`, { method: "POST" }); onToast(p.message || "Đã duyệt điểm"); loadGrades(); } catch (e) { const message = e instanceof Error ? e.message : "Không duyệt được điểm"; setError(message); onToast(message, "error"); } finally { setBusy(false); } };
  const approveClass = async () => { if (!classId || !confirm("Duyệt toàn bộ điểm của học phần? Sau khi duyệt, điểm không thể sửa.")) return; setBusy(true); try { const p = await apiRequest(token, `/classes/${classId}/grades/approve?courseOfferingId=${offeringId}`, { method: "POST" }); onToast(p.message || "Đã duyệt điểm toàn lớp"); loadGrades(); } catch (e) { const message = e instanceof Error ? e.message : "Không duyệt được lớp"; setError(message); onToast(message, "error"); } finally { setBusy(false); } };
  return <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">30% bài tập · 30% giữa kỳ · 40% cuối kỳ</p><h1>Bảng điểm</h1><p>Nhập và duyệt điểm học phần để cập nhật kết quả học tập của sinh viên.</p></div>{classId && <button className="primary-button" disabled={busy} onClick={approveClass}><Icon name="check" size={15} />Duyệt điểm học phần</button>}</div><div className="grade-filters"><label className="grade-filter-field">Học kỳ<select value={semesterFilter} disabled={busy} onChange={event=>{setSemesterFilter(event.target.value);chooseClass("");}}><option value="current">Đang diễn ra / Sắp tới</option>{terms.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label className="grade-filter-field grade-filter-offering">Học phần <select value={classId ? `${classId}:${offeringId}` : ""} onChange={(e) => chooseClass(e.target.value)}><option value="">Chọn lớp để nhập điểm</option>{visibleOfferings.map(({row,offering})=><option key={idOf(offering)} disabled={upcoming(offering)} value={`${idOf(row)}:${idOf(offering)}`}>{display(keyOf(row,"ClassCode"))} · {display(pick(offering,"Course.Name"))} · {display(pick(offering,"Semester.Name"))}{upcoming(offering)?" · Sắp tới":""}</option>)}</select></label>{classId && <button className="refresh-button" onClick={() => loadGrades()}><Icon name="refresh" size={15} />Làm mới</button>}</div>{error && <div className="feature-error">! {error}</div>}<div className="feature-table-wrap grades-table"><PaginatedTable><thead><tr><th>Sinh viên</th><th>Môn</th><th>Bài tập</th><th>Giữa kỳ</th><th>Cuối kỳ</th><th>Tổng</th><th>Chữ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{!classId ? <tr><td colSpan={9}>Chọn lớp để xem bảng điểm.</td></tr> : rows.length === 0 ? <tr><td colSpan={9}>Lớp chưa có đăng ký học phần.</td></tr> : rows.map((enrollment) => { const eid = idOf(enrollment); const d = drafts[eid] || { assignmentScore: "0", midtermScore: "0", finalScore: "0", remark: "" }; const grade = (keyOf(enrollment, "Grade") || {}) as Row; const approved = String(keyOf(grade, "Status")).toLowerCase() === "approved"; return <tr key={eid}><td><strong>{display(pick(enrollment, "Student.User.FullName"))}</strong><small className="cell-sub">{display(pick(enrollment, "Student.StudentCode"))}</small></td><td>{display(pick(enrollment, "Course.Name"))}<small className="cell-sub">{display(pick(enrollment,"CourseOffering.Semester.Name"))}</small></td>{(["assignmentScore", "midtermScore", "finalScore"] as const).map((key) => <td key={key}><input className="score-input" type="number" min="0" max="100" disabled={approved || busy} value={d[key]} onChange={(e) => setDrafts({ ...drafts, [eid]: { ...d, [key]: e.target.value } })} /></td>)}<td>{display(keyOf(grade, "TotalScore"))}</td><td>{display(keyOf(grade, "GradeLetter"))}</td><td>{statusLabel(keyOf(grade, "Status"))}</td><td><div className="row-actions">{!approved && <button disabled={busy} onClick={() => save(enrollment)}>Lưu</button>}{idOf(grade) > 0 && !approved && <button disabled={busy} onClick={() => approve(enrollment)}>Duyệt</button>}</div></td></tr>; })}</tbody></PaginatedTable></div></section>;
}
