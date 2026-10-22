"use client";
import { useEffect, useRef, useState } from "react";
import { apiRequest, display, idOf, keyOf, pick, statusLabel } from "@/controllers/api.controller";
import { attendanceSummary, gradeSummary, outstandingCourses } from "@/controllers/learning-summary";
import type { Row } from "@/models/dashboard";

export function LearningDetail({ token, student, classRow, onClose }: {token: string; student?: Row; classRow?: Row; onClose: () => void}) {
 const dialogRef = useRef<HTMLDialogElement>(null);
 useEffect(() => {
  const dialog = dialogRef.current;
  const previousOverflow = document.body.style.overflow;
  dialog?.showModal();
  document.body.style.overflow = "hidden";
  return () => {
   dialog?.close();
   document.body.style.overflow = previousOverflow;
  };
 }, []);
 const [now,setNow] = useState(() => Date.now());
 useEffect(() => { const timer=window.setInterval(() => setNow(Date.now()),30000); return () => window.clearInterval(timer); }, []);
 const [resultFilter,setResultFilter] = useState("");
 const [rows,setRows] = useState<Row[]>([]);
 const [error,setError] = useState("");
 const [loading,setLoading] = useState(true);
 const [query,setQuery] = useState("");
 useEffect(() => {
  let cancelled=false;
  apiRequest(token, student ? `/students/${idOf(student)}/learning-detail` : `/teacher/classes/${idOf(classRow!)}/learning-detail`).then(p => {if(!cancelled) setRows(p.data || []);}).catch(e => {if(!cancelled) setError(e.message);}).finally(() => {if(!cancelled) setLoading(false);});
  return () => {cancelled=true;};
 },[token,student,classRow]);
 const debt = outstandingCourses(rows);
 const filteredRows = rows.filter(row => `${pick(row,"Student.User.FullName")} ${pick(row,"Student.StudentCode")} ${pick(row,"Course.Name")}`.toLowerCase().includes(query.toLowerCase()) && (!resultFilter || (resultFilter === "debt" ? debt.has(`${keyOf(row,"StudentID")}:${keyOf(row,"CourseID")}`) : gradeSummary(row).kind === resultFilter)));
 return <dialog ref={dialogRef} className="learning-modal" aria-labelledby="learning-modal-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
 <div className="learning-modal-layout">
  <header className="learning-modal-header"><div><h2 id="learning-modal-title">{student ? `Hồ sơ học tập · ${display(pick(student,"User.FullName"))}` : `Sinh viên lớp ${display(keyOf(classRow,"ClassCode"))}`}</h2><p>Vắng có phép và không phép đều tính vào ngưỡng vượt 25% tổng buổi. Đi trễ được tính là đã tham gia. Buổi chưa chốt không tính vắng.</p></div><button className="refresh-button" onClick={onClose} autoFocus>Đóng chi tiết</button></header>
 <div className="learning-modal-body">
  <label className="learning-modal-search">Tìm sinh viên / môn học<input value={query} onChange={e=>setQuery(e.target.value)} /></label>
  {!loading && !error && <><div className="offer-plan-summary"><div><dt>Môn còn nợ</dt><dd>{debt.size}</dd></div><div><dt>Lượt học điểm thấp</dt><dd>{rows.filter(r=>gradeSummary(r).kind === "low").length}</dd></div><div><dt>Chưa có điểm</dt><dd>{rows.filter(r=>gradeSummary(r).kind === "missing").length}</dd></div></div><p>Thang điểm 100: dưới 40 không đạt; từ 40 đến dưới 55 là điểm thấp. Chỉ điểm đã duyệt dùng để xác định nợ môn.</p><label>Kết quả học tập<select value={resultFilter} onChange={e=>setResultFilter(e.target.value)}><option value="">Tất cả môn</option><option value="debt">Môn còn nợ</option><option value="failed">Không đạt</option><option value="low">Điểm thấp</option><option value="passed">Đạt</option><option value="pending">Chưa duyệt</option><option value="missing">Chưa có điểm</option></select></label>{rows.length > 0 && !filteredRows.length && <p>Không có môn phù hợp bộ lọc.</p>}</>}
  {loading && <p>Đang tải chi tiết học tập...</p>}{error && <div className="feature-error" role="alert">{error}</div>}
  {!loading && !error && rows.length===0 && <p>Chưa có đăng ký học phần.</p>}
  <div className="learning-course-list">{filteredRows.map(row=>{
   const records = (keyOf(row,"Attendances") || []) as Row[];
   const stats = attendanceSummary(row,now);
   const { total, missed, warning, late, excused, absent } = stats;
   const finalized = stats.records;
   const present = stats.attended-late;
   const result = gradeSummary(row);
   const grade = result.grade;
   return <article key={idOf(row)} className={`learning-course-card${warning ? " is-warning" : ""}`}>
    <h3>Họ tên: {display(pick(row,"Student.User.FullName"))}</h3>
    <dl className="learning-student-fields">
     <div><dt>Mã sinh viên:</dt><dd>{display(pick(row,"Student.StudentCode"))}</dd></div>
     <div><dt>Môn học:</dt><dd>{display(pick(row,"Course.Name"))}</dd></div>
     <div><dt>Lớp học:</dt><dd>{display(pick(row,"Class.ClassCode"))}</dd></div>
     <div><dt>Học kỳ:</dt><dd>{display(pick(row,"CourseOffering.Semester.Name"))}</dd></div>
     <div><dt>Giáo viên dạy:</dt><dd>{display(pick(row,"CourseOffering.Teacher.User.FullName"))}</dd></div>
    </dl>
    <p>Tổng: <b>{total || "Chưa có lịch"}</b> buổi · Đã tham gia: <b>{present+late}</b> (Đi trễ: {late}) · Vắng: <b>{missed}</b> (có phép: {excused}, không phép: {absent}) · Đã chốt: {finalized.length} buổi</p>
    {warning && <p role="alert" style={{color:"#b91c1c",fontWeight:700}}>Cảnh báo: Vắng {missed}/{total} buổi ({(missed/total*100).toFixed(1)}%), vượt 25%.</p>}
    {total===0 && <p>Chưa đủ lịch học để tính tỷ lệ vắng.</p>}
    <div className={`learning-grade-result is-${result.kind}`}><strong>{result.label}</strong>{result.kind === "failed" && !debt.has(`${keyOf(row,"StudentID")}:${keyOf(row,"CourseID")}`) && <span> · Môn này đã có lần học đạt</span>}</div>
    {grade && <div className="feature-table-wrap"><table><thead><tr><th>Bài tập</th><th>Giữa kỳ</th><th>Cuối kỳ</th><th>Tổng kết / 100</th><th>Điểm chữ</th><th>Duyệt điểm</th></tr></thead><tbody><tr><td>{display(keyOf(grade,"AssignmentScore"))}</td><td>{display(keyOf(grade,"MidtermScore"))}</td><td>{display(keyOf(grade,"FinalScore"))}</td><td><strong>{display(result.score)}</strong></td><td>{display(keyOf(grade,"GradeLetter"))}</td><td>{String(keyOf(grade,"Status")).toLowerCase() === "approved" ? "Đã duyệt" : "Chưa duyệt"}</td></tr></tbody></table>{keyOf(grade,"Remark") && <p>Ghi chú: {display(keyOf(grade,"Remark"))}</p>}</div>}

    <details><summary>Lịch học và chi tiết điểm danh</summary>
     <p>Phòng: {display(pick(row,"CourseOffering.Room.Name"))}</p>
     <ul>{((pick(row,"CourseOffering.Schedules") || []) as Row[]).map(s=><li key={idOf(s)}>{keyOf(s,"FullDate") ? String(keyOf(s,"FullDate")).slice(0,10) : `Hằng tuần: ${display(keyOf(s,"DayOfWeek"))}`} · {display(keyOf(s,"StartTime"))}–{display(keyOf(s,"EndTime"))}</li>)}</ul>
     {records.length===0 ? <p>Chưa có dữ liệu điểm danh.</p> : <div className="feature-table-wrap"><table><thead><tr><th>Ngày</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>{records.map(a=><tr key={idOf(a)}><td>{String(keyOf(a,"ClassDate")).slice(0,10)}</td><td>{finalized.includes(a) ? keyOf(a,"Status")==="absent" ? "Vắng không phép" : statusLabel(keyOf(a,"Status")) : "Chưa chốt"}</td><td>{display(keyOf(a,"Note"))}</td></tr>)}</tbody></table></div>}
    </details>
   </article>;
  })}</div>
 </div>
 </div>
 </dialog>;
}
