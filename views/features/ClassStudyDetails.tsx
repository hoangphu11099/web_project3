"use client";
import { useErrorFeedback, useErrorReporter } from "@/components/common/ErrorFeedback";
import { useEffect, useState } from "react";
import { apiRequest, display, idOf, keyOf, pick, statusLabel } from "@/controllers/api.controller";
import { classLessons, overlappingLessons, offeringStudyStatus, classStudyStatus, filterClassLessons, matchesClassScheduleOffering, classScheduleDateRange } from "@/controllers/class-schedule";
import type { Row } from "@/models/dashboard";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { RescheduleLessonForm } from "./RescheduleLessonForm";
import type { ClassLesson } from "@/controllers/class-schedule";
import { TeachingOfferDetails, offerSchedules } from "./TeachingOfferPlan";
import { attendanceSummary } from "@/controllers/learning-summary";

const dateLabel = (date: string) => date ? new Intl.DateTimeFormat("vi-VN", { weekday: "short", day:"2-digit", month:"2-digit", year:"numeric" }).format(new Date(`${date}T12:00:00`)) : "Chưa có lịch";

export function ClassStudyDetails({ token, classRow, onClose, onStudentDetails, onUpdated }: { onUpdated?:()=>void; token:string; classRow:Row; onClose:()=>void; onStudentDetails:(student:Row)=>void }) {
  const [revision,setRevision] = useState(0);
  const [editingLesson,setEditingLesson] = useState<ClassLesson | null>(null);
  const [savedNotice,setSavedNotice] = useState(false);
  const [learning,setLearning] = useState<Row[]>([]);
  const [learningError,setLearningError] = useErrorFeedback();
  const [learningLoading,setLearningLoading] = useState(true);
  useEffect(() => {
    let cancelled=false;
    apiRequest(token,`/classes/${idOf(classRow)}/learning-detail`).then(p=>{if(!cancelled)setLearning(p.data || []);}).catch(e=>{if(!cancelled)setLearningError(e.message);}).finally(()=>{if(!cancelled)setLearningLoading(false);});
    return ()=>{cancelled=true;};
  },[token,classRow,revision]);
  const [offerings,setOfferings] = useState<Row[]>([]);
  const [pending,setPending] = useState<Row[]>([]);
  const [currentClass,setCurrentClass] = useState(classRow);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useErrorFeedback();
  const [semesterId,setSemesterId] = useState("");
  const [courseId,setCourseId] = useState("");
  const reportError = useErrorReporter();
  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [students,setStudents] = useState<Row[]>([]);
  const [studentQuery,setStudentQuery] = useState("");
  const [studentError,setStudentError] = useErrorFeedback();
  const [studentsLoading,setStudentsLoading] = useState(true);
  const [now,setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    apiRequest(token, `/students?classId=${idOf(classRow)}`).then(payload => {
      if (!cancelled) setStudents(((payload.data || []) as Row[]).filter(s => Number(keyOf(s,"ClassID")) === idOf(classRow)));
    }).catch(e => { if (!cancelled) setStudentError(e.message); }).finally(() => { if (!cancelled) setStudentsLoading(false); });
    return () => { cancelled = true; };
  }, [token,classRow]);
  useEffect(() => {
    let cancelled=false;
    Promise.all([apiRequest(token,`/course-offerings?classId=${idOf(classRow)}`),apiRequest(token,"/class-offers?status=pending"),apiRequest(token,`/classes?q=${encodeURIComponent(String(keyOf(classRow,"ClassCode")))}`)]).then(([courses,offers,classes]) => {
      if(cancelled) return;
      setOfferings(((courses.data || []) as Row[]).filter(o=>Number(keyOf(o,"ClassID"))===idOf(classRow)));
      setPending(((offers.data || []) as Row[]).filter(o=>Number(keyOf(o,"ClassID"))===idOf(classRow)));
      setCurrentClass(((classes.data || []) as Row[]).find(c=>idOf(c)===idOf(classRow)) || classRow);
    }).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[token,classRow,revision]);
  const filter = {semesterId,courseId,from,to};
  const allLessons=offerings.flatMap(classLessons);
  const activeLessons=allLessons.filter(l=>keyOf(l.offering,"Status")==="open" && pick(l.offering,"Semester.Status")!=="closed");
  const conflicts=overlappingLessons(activeLessons);
  const lessons=filterClassLessons(allLessons,filter);
  const visible=offerings.filter(o=>matchesClassScheduleOffering(o,filter) && ((!from&&!to) || lessons.some(l=>idOf(l.offering)===idOf(o))));
  const visibleConflicts=lessons.filter(l=>conflicts.has(l));
  const semesters=Array.from(new Map([...offerings,...pending].filter(o=>Number(keyOf(o,"SemesterID"))>0).map(o=>[String(keyOf(o,"SemesterID")),(keyOf(o,"Semester") || {}) as Row])).entries()).sort((a,b)=>String(keyOf(b[1],"StartDate") || "").localeCompare(String(keyOf(a[1],"StartDate") || "")));
  const courseOptions=Array.from(new Map([...offerings,...pending].filter(o=>Number(keyOf(o,"CourseID"))>0 && (!semesterId || String(keyOf(o,"SemesterID"))===semesterId)).map(o=>[String(keyOf(o,"CourseID")),display(pick(o,"Course.Name"))])).entries()).sort((a,b)=>a[1].localeCompare(b[1],"vi"));
  const visiblePending=pending.filter(o=>matchesClassScheduleOffering(o,filter) && ((!from&&!to) || offerSchedules(o).some(s=>{const date=String(keyOf(s,"FullDate") || "").slice(0,10);return !!date && (!from||date>=from)&&(!to||date<=to);})));
  const hasFilters=!!(semesterId||courseId||from||to);
  const resetFilters=()=>{setSemesterId("");setCourseId("");setFrom("");setTo("");};
  const changeDate=(field:"from"|"to",value:string)=>{
    if ((field==="from"&&value&&to&&value>to)||(field==="to"&&value&&from&&value<from)) { reportError("Từ ngày phải nhỏ hơn hoặc bằng Đến ngày. Vui lòng chọn lại khoảng thời gian."); return; }
    if(field==="from")setFrom(value);else setTo(value);
  };
  const visibleStudents = students.filter(s => [keyOf(s,"StudentCode"),pick(s,"User.FullName"),pick(s,"User.Email")].some(value => String(value || "").toLocaleLowerCase("vi").includes(studentQuery.trim().toLocaleLowerCase("vi"))));
  return <FeatureDialog title={`Chi tiết lớp ${display(keyOf(classRow,"ClassCode"))}`} description="Xem môn học, giảng viên và lịch từng buổi; điều chỉnh lịch học bù khi cần." onClose={onClose}>
    {editingLesson && <RescheduleLessonForm key={`${editingLesson.scheduleId}:${editingLesson.date}`} token={token} classId={idOf(classRow)} lesson={editingLesson} onClose={()=>setEditingLesson(null)} onSaved={()=>{setEditingLesson(null);setSavedNotice(true);setRevision(value=>value+1);onUpdated?.();}} />}
    {savedNotice && <p className="makeup-saved-notice" role="status">Đã chuyển buổi học sang lịch học bù. Lịch giảng viên và sinh viên đã được cập nhật.</p>}
    {loading ? <p>Đang tải chi tiết lớp...</p> : error ? <div className="feature-error" role="alert">{error}</div> : <>
      <dl className="offer-plan-summary class-summary"><div><dt>Chuyên ngành</dt><dd>{display(pick(currentClass,"Major.Name"))}</dd></div><div><dt>Sĩ số hiện tại / tối đa</dt><dd>{display(studentsLoading || studentError ? keyOf(currentClass,"currentStudents") : students.length)} / {display(keyOf(currentClass,"MaxStudents"))} sinh viên</dd></div><div><dt>Trạng thái lớp</dt><dd>{statusLabel(classStudyStatus(currentClass,offerings,now))}</dd></div><div><dt>Môn đang mở</dt><dd>{offerings.filter(o=>offeringStudyStatus(o,now)==="open").length}</dd></div></dl>
      <section className="class-schedule-filters" aria-labelledby="class-schedule-filter-heading">
        <header><div><h3 id="class-schedule-filter-heading">Bộ lọc lịch học</h3><p>Lọc môn học, lịch từng buổi và kế hoạch chờ xác nhận. Kết quả cập nhật ngay khi chọn.</p></div><button type="button" className="refresh-button" disabled={!hasFilters} onClick={resetFilters}>Xóa bộ lọc</button></header>
        <div className="class-schedule-filter-fields"><label>Học kỳ<select value={semesterId} onChange={e=>{setSemesterId(e.target.value);setCourseId("");setFrom("");setTo("");}}><option value="">Tất cả học kỳ</option>{semesters.map(([id,semester])=>{const start=String(keyOf(semester,"StartDate") || "").slice(0,4),end=String(keyOf(semester,"EndDate") || "").slice(0,4);return <option key={id} value={id}>{display(keyOf(semester,"Name"))}{start?` · ${start}${end&&end!==start?` – ${end}`:""}`:""}</option>;})}</select></label><label>Môn học<select value={courseId} onChange={e=>setCourseId(e.target.value)}><option value="">Tất cả môn học</option>{courseOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Từ ngày<input type="date" max={to||undefined} value={from} onChange={e=>changeDate("from",e.target.value)} /></label><label>Đến ngày<input type="date" min={from||undefined} value={to} onChange={e=>changeDate("to",e.target.value)} /></label></div>
        <div className="class-schedule-quick-filters" role="group" aria-label="Chọn nhanh khoảng ngày"><span>Chọn nhanh:</span>{([['all','Mọi ngày'],['today','Hôm nay'],['week','Tuần này'],['month','Tháng này']] as const).map(([preset,label])=>{const range=classScheduleDateRange(preset,now);return <button type="button" key={preset} aria-pressed={from===range.from&&to===range.to} onClick={()=>{setFrom(range.from);setTo(range.to);}}>{label}</button>;})}</div>
        <div className="class-schedule-filter-result" role="status" aria-live="polite"><strong>{lessons.length} / {allLessons.length} buổi học</strong><span>· {visible.length} môn · {visiblePending.length} kế hoạch chờ xác nhận</span><span>{from||to?`${from?dateLabel(from):"Không giới hạn ngày bắt đầu"} → ${to?dateLabel(to):"Không giới hạn ngày kết thúc"}`:"Toàn bộ thời gian"}</span></div>
      </section>
      <h3>Các môn phù hợp ({visible.length})</h3>
      {!visible.length ? <p>Không có môn học phù hợp với bộ lọc.</p> : <div className="feature-table-wrap"><table><thead><tr><th>Môn / Học kỳ</th><th>Giảng viên</th><th>Phòng</th><th>Buổi phù hợp / Tổng</th><th>Buổi đầu trong khoảng</th><th>Buổi cuối trong khoảng</th><th>Trạng thái</th></tr></thead><tbody>{visible.map(o=>{const dates=lessons.filter(l=>idOf(l.offering)===idOf(o));const totalDates=classLessons(o).length;return <tr key={idOf(o)}><td><strong>{display(pick(o,"Course.Name"))}</strong><small className="cell-sub">{display(pick(o,"Semester.Name"))}</small></td><td>{display(pick(o,"Teacher.User.FullName"))}</td><td>{display(pick(o,"Room.Name"))}</td><td><strong>{dates.length}</strong><small className="cell-sub">/ {totalDates} buổi cả môn</small></td><td>{dateLabel(dates[0]?.date || "")}</td><td>{dateLabel(dates[dates.length-1]?.date || "")}</td><td>{statusLabel(offeringStudyStatus(o,now))}</td></tr>;})}</tbody></table></div>}
      <h3>Lịch học chi tiết ({lessons.length} buổi)</h3>
      {visibleConflicts.length>0 && <div className="feature-error" role="alert">Có {visibleConflicts.length} buổi trong kết quả lọc bị trùng giờ. Các dòng trùng được đánh dấu đỏ.</div>}
      {!lessons.length ? <p>Không có lịch trong khoảng đã chọn.</p> : <div className="feature-table-wrap class-calendar-table"><table><thead><tr><th>Ngày học</th><th>Ca / Giờ học</th><th>Môn</th><th>Giảng viên</th><th>Phòng</th><th>Thao tác</th></tr></thead><tbody>{lessons.map((l,i)=><tr key={i} className={conflicts.has(l)?"class-lesson-conflict":""}><td>{dateLabel(l.date)}</td><td>{l.session} · {l.startTime} – {l.endTime}{conflicts.has(l)&&<small className="cell-sub">Trùng giờ</small>}</td><td>{display(pick(l.offering,"Course.Name"))}</td><td>{display(pick(l.offering,"Teacher.User.FullName"))}</td><td>{display(pick(l.offering,"Room.Name"))}</td><td><button type="button" className="refresh-button" disabled={!l.scheduleId || keyOf(l.offering,"Status")!=="open" || pick(l.offering,"Semester.Status")==="closed" || keyOf(currentClass,"Status")!=="open" || !((keyOf(l.offering,"Schedules") || []) as Row[]).some(s=>idOf(s)===l.scheduleId && String(keyOf(s,"FullDate") || "").slice(0,10)===l.date)} onClick={()=>{setSavedNotice(false);setEditingLesson(l);}}>Đổi lịch / Học bù</button>{((keyOf(l.offering,"Schedules") || []) as Row[]).filter(s=>idOf(s)===l.scheduleId && keyOf(s,"RescheduleReason")).map(s=><small className="cell-sub" key={idOf(s)}>{String(keyOf(s,"RescheduleReason"))}</small>)}</td></tr>)}</tbody></table></div>}
      {visiblePending.length>0 && <section className="class-pending-plans"><h3>Kế hoạch đang chờ giáo viên xác nhận ({visiblePending.length})</h3><p>Các kế hoạch có buổi học phù hợp với bộ lọc được hiển thị đầy đủ bên dưới. Lịch này chưa được xếp chính thức.</p>{visiblePending.map(o=><article className="teaching-offer-card" key={idOf(o)}><strong>Giảng viên: {display(pick(o,"Teacher.User.FullName"))}</strong><TeachingOfferDetails row={o} /></article>)}</section>}
      <section className="class-roster-section">
      <div className="class-roster-toolbar">
      <h3>Danh sách sinh viên ({students.length})</h3>
      <p>Chuyên cần tính toàn bộ lịch của học kỳ và môn đã chọn, không giới hạn theo khoảng ngày lọc lịch. Tỷ lệ tham gia = số buổi có mặt/đi trễ đã chốt trên tổng số buổi của môn; buổi chưa chốt không tính vắng.</p>
      <div className="feature-tools"><label>Tìm sinh viên<input type="search" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="Mã sinh viên, họ tên hoặc email" /></label></div>
      </div>
      {studentsLoading ? <p>Đang tải danh sách sinh viên...</p> : studentError ? <div className="feature-error" role="alert">Không tải được danh sách sinh viên: {studentError}</div> : !students.length ? <p>Lớp chưa có sinh viên.</p> : !visibleStudents.length ? <p>Không tìm thấy sinh viên phù hợp.</p> : <div className="class-student-list">{visibleStudents.map(s => <article className="class-student-card" key={idOf(s)}>
        <header className="class-student-header"><div><span className="class-student-code">{display(keyOf(s,"StudentCode"))}</span><h4>{display(pick(s,"User.FullName"))}</h4></div><button type="button" className="refresh-button" onClick={()=>onStudentDetails(s)}>Điểm & chuyên cần</button></header>
        <dl className="class-student-info"><div><dt>Email</dt><dd>{display(pick(s,"User.Email"))}</dd></div><div><dt>Số điện thoại</dt><dd>{display(keyOf(s,"Phone"))}</dd></div><div><dt>Trạng thái</dt><dd>{statusLabel(keyOf(s,"Status"))}</dd></div></dl>
        {learningLoading ? <p>Đang tải chuyên cần...</p> : learningError ? <p role="alert">Không tải được chuyên cần</p> : <StudentAttendance rows={learning.filter(r=>Number(keyOf(r,"StudentID"))===idOf(s) && (!semesterId || String(pick(r,"CourseOffering.SemesterID"))===semesterId) && (!courseId || String(keyOf(r,"CourseID"))===courseId))} now={now} />}
      </article>)}</div>}
      </section>

    </>}
  </FeatureDialog>;
}

function StudentAttendance({rows,now}:{rows:Row[];now:number}) {
 if (!rows.length) return <span>Chưa đăng ký môn trong học kỳ đã chọn</span>;
 const summaries = rows.map(row=>attendanceSummary(row,now));
 const total = summaries.reduce((sum,s)=>sum+s.total,0), attended = summaries.reduce((sum,s)=>sum+s.attended,0);
 return <div className="class-student-attendance"><strong>Tỷ lệ tham gia: {total ? `${(attended/total*100).toFixed(1)}% (${attended}/${total} buổi)` : "Chưa có lịch"}</strong>{rows.map(row=>{const stats=attendanceSummary(row,now);return <div key={idOf(row)} className={stats.warning ? "attendance-warning" : ""}><strong>{display(pick(row,"Course.Name"))}</strong><span>Tham gia: {stats.participation === null ? "Chưa có lịch" : `${stats.participation.toFixed(1)}% (${stats.attended}/${stats.total} buổi)`}</span><span>Vắng: {stats.missed} buổi{stats.absence !== null && ` (${stats.absence.toFixed(1)}%)`} · Có phép: {stats.excused} · Không phép: {stats.absent}</span>{stats.warning && <strong role="alert">Cảnh báo: Vắng vượt 25% số buổi</strong>}</div>;})}</div>;
}
