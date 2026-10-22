"use client";
import { useEffect, useState } from "react";
import { apiRequest, display, idOf, keyOf, pick, statusLabel } from "@/controllers/api.controller";
import { classLessons, overlappingLessons, offeringStudyStatus, classStudyStatus } from "@/controllers/class-schedule";
import type { Row } from "@/models/dashboard";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { TeachingOfferDetails } from "./TeachingOfferPlan";
import { attendanceSummary } from "@/controllers/learning-summary";

const dateLabel = (date: string) => date ? new Intl.DateTimeFormat("vi-VN", { weekday: "short", day:"2-digit", month:"2-digit", year:"numeric" }).format(new Date(`${date}T12:00:00`)) : "Chưa có lịch";

export function ClassStudyDetails({ token, classRow, onClose, onSchedule, onStudentDetails }: { token:string; classRow:Row; onClose:()=>void; onSchedule:()=>void; onStudentDetails:(student:Row)=>void }) {
  const [learning,setLearning] = useState<Row[]>([]);
  const [learningError,setLearningError] = useState("");
  const [learningLoading,setLearningLoading] = useState(true);
  useEffect(() => {
    let cancelled=false;
    apiRequest(token,`/classes/${idOf(classRow)}/learning-detail`).then(p=>{if(!cancelled)setLearning(p.data || []);}).catch(e=>{if(!cancelled)setLearningError(e.message);}).finally(()=>{if(!cancelled)setLearningLoading(false);});
    return ()=>{cancelled=true;};
  },[token,classRow]);
  const [offerings,setOfferings] = useState<Row[]>([]);
  const [pending,setPending] = useState<Row[]>([]);
  const [currentClass,setCurrentClass] = useState(classRow);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [semesterId,setSemesterId] = useState("");
  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [students,setStudents] = useState<Row[]>([]);
  const [studentQuery,setStudentQuery] = useState("");
  const [studentError,setStudentError] = useState("");
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
  },[token,classRow]);
  const visible=offerings.filter(o=>!semesterId || String(keyOf(o,"SemesterID"))===semesterId);
  const allLessons=visible.flatMap(classLessons);
  const activeLessons=allLessons.filter(l=>keyOf(l.offering,"Status")==="open" && pick(l.offering,"Semester.Status")!=="closed");
  const conflicts=overlappingLessons(activeLessons);
  const lessons=allLessons.filter(l=>(!from||l.date>=from)&&(!to||l.date<=to)).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
  const semesters=Array.from(new Map(offerings.map(o=>[String(keyOf(o,"SemesterID")),display(pick(o,"Semester.Name"))])).entries());
  const visibleStudents = students.filter(s => [keyOf(s,"StudentCode"),pick(s,"User.FullName"),pick(s,"User.Email")].some(value => String(value || "").toLocaleLowerCase("vi").includes(studentQuery.trim().toLocaleLowerCase("vi"))));
  return <FeatureDialog title={`Chi tiết lớp ${display(keyOf(classRow,"ClassCode"))}`} description="Đối chiếu môn đang học, giảng viên và lịch từng buổi trước khi xếp lịch mới." onClose={onClose}>
    {loading ? <p>Đang tải chi tiết lớp...</p> : error ? <div className="feature-error" role="alert">{error}</div> : <>
      <dl className="offer-plan-summary class-summary"><div><dt>Chuyên ngành</dt><dd>{display(pick(currentClass,"Major.Name"))}</dd></div><div><dt>Sĩ số hiện tại / tối đa</dt><dd>{display(studentsLoading || studentError ? keyOf(currentClass,"currentStudents") : students.length)} / {display(keyOf(currentClass,"MaxStudents"))} sinh viên</dd></div><div><dt>Trạng thái lớp</dt><dd>{statusLabel(classStudyStatus(currentClass,offerings,now))}</dd></div><div><dt>Môn đang mở</dt><dd>{offerings.filter(o=>offeringStudyStatus(o,now)==="open").length}</dd></div></dl>
      <div className="feature-tools"><label>Học kỳ<select value={semesterId} onChange={e=>setSemesterId(e.target.value)}><option value="">Tất cả học kỳ</option>{semesters.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Từ ngày<input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label><label>Đến ngày<input type="date" value={to} onChange={e=>setTo(e.target.value)} /></label><button className="primary-button" onClick={onSchedule} disabled={keyOf(currentClass,"Status")!=="open"}>Xếp lịch mới</button></div>
      <h3>Các môn của lớp</h3>
      {!visible.length ? <p>Lớp chưa có môn trong học kỳ này.</p> : <div className="feature-table-wrap"><table><thead><tr><th>Môn / Học kỳ</th><th>Giảng viên</th><th>Phòng</th><th>Số buổi</th><th>Bắt đầu</th><th>Kết thúc dự kiến</th><th>Trạng thái</th></tr></thead><tbody>{visible.map(o=>{const dates=classLessons(o);return <tr key={idOf(o)}><td><strong>{display(pick(o,"Course.Name"))}</strong><small className="cell-sub">{display(pick(o,"Semester.Name"))}</small></td><td>{display(pick(o,"Teacher.User.FullName"))}</td><td>{display(pick(o,"Room.Name"))}</td><td>{dates.length}</td><td>{dateLabel(dates[0]?.date || "")}</td><td>{dateLabel(dates[dates.length-1]?.date || "")}</td><td>{statusLabel(offeringStudyStatus(o,now))}</td></tr>;})}</tbody></table></div>}
      <h3>Lịch học chi tiết ({lessons.length} buổi)</h3>
      {conflicts.size>0 && <div className="feature-error" role="alert">Có {conflicts.size} buổi thuộc các môn đang mở bị trùng giờ. Các dòng trùng được đánh dấu đỏ.</div>}
      {!lessons.length ? <p>Không có lịch trong khoảng đã chọn.</p> : <div className="feature-table-wrap class-calendar-table"><table><thead><tr><th>Ngày học</th><th>Ca / Giờ học</th><th>Môn</th><th>Giảng viên</th><th>Phòng</th></tr></thead><tbody>{lessons.map((l,i)=><tr key={i} className={conflicts.has(l)?"class-lesson-conflict":""}><td>{dateLabel(l.date)}</td><td>{l.session} · {l.startTime} – {l.endTime}{conflicts.has(l)&&<small className="cell-sub">Trùng giờ</small>}</td><td>{display(pick(l.offering,"Course.Name"))}</td><td>{display(pick(l.offering,"Teacher.User.FullName"))}</td><td>{display(pick(l.offering,"Room.Name"))}</td></tr>)}</tbody></table></div>}
      {pending.filter(o=>!semesterId||String(keyOf(o,"SemesterID"))===semesterId).length>0 && <section className="class-pending-plans"><h3>Kế hoạch đang chờ giáo viên xác nhận</h3><p>Các lịch dưới đây chưa được xếp chính thức; cần đối chiếu khi lập thêm lịch.</p>{pending.filter(o=>!semesterId||String(keyOf(o,"SemesterID"))===semesterId).map(o=><article className="teaching-offer-card" key={idOf(o)}><strong>Giảng viên: {display(pick(o,"Teacher.User.FullName"))}</strong><TeachingOfferDetails row={o} /></article>)}</section>}
      <section className="class-roster-section">
      <div className="class-roster-toolbar">
      <h3>Danh sách sinh viên ({students.length})</h3>
      <p>Tỷ lệ tham gia = số buổi có mặt/đi trễ đã chốt trên tổng số buổi của môn. Buổi chưa chốt không tính vắng; cảnh báo vắng tính riêng từng môn.</p>
      <div className="feature-tools"><label>Tìm sinh viên<input type="search" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="Mã sinh viên, họ tên hoặc email" /></label></div>
      </div>
      {studentsLoading ? <p>Đang tải danh sách sinh viên...</p> : studentError ? <div className="feature-error" role="alert">Không tải được danh sách sinh viên: {studentError}</div> : !students.length ? <p>Lớp chưa có sinh viên.</p> : !visibleStudents.length ? <p>Không tìm thấy sinh viên phù hợp.</p> : <div className="class-student-list">{visibleStudents.map(s => <article className="class-student-card" key={idOf(s)}>
        <header className="class-student-header"><div><span className="class-student-code">{display(keyOf(s,"StudentCode"))}</span><h4>{display(pick(s,"User.FullName"))}</h4></div><button type="button" className="refresh-button" onClick={()=>onStudentDetails(s)}>Điểm & chuyên cần</button></header>
        <dl className="class-student-info"><div><dt>Email</dt><dd>{display(pick(s,"User.Email"))}</dd></div><div><dt>Số điện thoại</dt><dd>{display(keyOf(s,"Phone"))}</dd></div><div><dt>Trạng thái</dt><dd>{statusLabel(keyOf(s,"Status"))}</dd></div></dl>
        {learningLoading ? <p>Đang tải chuyên cần...</p> : learningError ? <p role="alert">Không tải được chuyên cần</p> : <StudentAttendance rows={learning.filter(r=>Number(keyOf(r,"StudentID"))===idOf(s) && (!semesterId || String(pick(r,"CourseOffering.SemesterID"))===semesterId))} now={now} />}
      </article>)}</div>}
      </section>

    </>}
  </FeatureDialog>;
}

function StudentAttendance({rows,now}:{rows:Row[];now:number}) {
 if (!rows.length) return <span>Chưa đăng ký môn trong học kỳ đã chọn</span>;
 const summaries = rows.map(row=>attendanceSummary(row,now));
 const total = summaries.reduce((sum,s)=>sum+s.total,0), attended = summaries.reduce((sum,s)=>sum+s.attended,0);
 return <div className="class-student-attendance"><strong>Tham gia toàn lớp: {total ? `${(attended/total*100).toFixed(1)}% (${attended}/${total} buổi)` : "Chưa có lịch"}</strong>{rows.map(row=>{const stats=attendanceSummary(row,now);return <div key={idOf(row)} className={stats.warning ? "attendance-warning" : ""}><strong>{display(pick(row,"Course.Name"))}</strong><span>Tham gia: {stats.participation === null ? "Chưa có lịch" : `${stats.participation.toFixed(1)}% (${stats.attended}/${stats.total} buổi)`}</span><span>Vắng: {stats.missed} buổi{stats.absence !== null && ` (${stats.absence.toFixed(1)}%)`} · Có phép: {stats.excused} · Không phép: {stats.absent}</span>{stats.warning && <strong role="alert">Cảnh báo: Vắng vượt 25% số buổi</strong>}</div>;})}</div>;
}
