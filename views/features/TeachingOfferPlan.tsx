"use client";
import { useEffect, useState } from "react";
import { apiRequest, display, idOf, keyOf, pick } from "@/controllers/api.controller";
import { coursesForClass } from "@/controllers/course-options";
import { dayLabel } from "@/controllers/teaching-schedule.controller";
import { classLessons, weeklyTeachingDates } from "@/controllers/class-schedule";
import type { MetadataData, Row, ToastHandler } from "@/models/dashboard";

export function offerSchedules(row: Row): Row[] {
  try { const plan = JSON.parse(String(keyOf(row, "PlanJSON") || "{}")); return Array.isArray(plan.schedules) ? plan.schedules : []; }
  catch { return []; }
}

function dateText(value: unknown) {
  const date = String(value || "").slice(0, 10);
  return date ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00`)) : "—";
}

export function TeachingOfferDetails({ row }: { row: Row }) {
  const schedules = offerSchedules(row);
  const dates = schedules.map(s => String(keyOf(s, "FullDate") || "").slice(0, 10)).filter(Boolean).sort();
  if (!schedules.length) return <p className="offer-plan-note">Đề xuất cũ chưa có kế hoạch chi tiết. Admin cần gửi lại môn và lịch để giáo viên nhận dạy.</p>;
  return <div className="offer-plan-details">
    <dl className="offer-plan-summary">
      <div><dt>Lớp</dt><dd>{display(pick(row, "Class.ClassCode"))}</dd></div>
      <div><dt>Môn dạy</dt><dd>{display(pick(row, "Course.Name"))}</dd></div>
      <div><dt>Học kỳ</dt><dd>{display(pick(row, "Semester.Name"))}</dd></div>
      <div><dt>Phòng học</dt><dd>{display(pick(row, "Room.Name"))}</dd></div>
      <div><dt>Số buổi</dt><dd>{schedules.length} buổi</dd></div>
      <div><dt>Bắt đầu dự kiến</dt><dd>{dateText(dates[0])}</dd></div>
      <div><dt>Kết thúc dự kiến</dt><dd>{dateText(dates[dates.length - 1])}</dd></div>
    </dl>
    <details><summary>Xem lịch từng buổi ({schedules.length} buổi)</summary><div className="feature-table-wrap"><table><thead><tr><th>Buổi</th><th>Ngày dạy</th><th>Thứ</th><th>Ca</th><th>Thời gian</th></tr></thead><tbody>{schedules.map((s, index) => <tr key={index}><td>{index + 1}</td><td>{dateText(keyOf(s, "FullDate"))}</td><td>{dayLabel(String(keyOf(s, "DayOfWeek")))}</td><td>{display(keyOf(s, "Session"))}</td><td>{display(keyOf(s, "StartTime"))} – {display(keyOf(s, "EndTime"))}</td></tr>)}</tbody></table></div></details>
  </div>;
}

function schoolToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function TeachingOfferForm({ token, metadata, onToast, initialClass, initialTeacher, onSent, onCancel }: { token: string; metadata: MetadataData; onToast: ToastHandler; initialClass?: Row; initialTeacher?: Row; onSent?: () => void; onCancel?: () => void }) {
  const [classId, setClassId] = useState(initialClass ? String(idOf(initialClass)) : "");
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [teacherId, setTeacherId] = useState(initialTeacher ? String(idOf(initialTeacher)) : "");
  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [count, setCount] = useState(6);
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [dates, setDates] = useState<string[]>([]);
  const [session, setSession] = useState("Sáng");
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("11:30");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<{ key: string; row: Row | null; rows: Row[]; error: string }>({ key: "", row: null, rows: [], error: "" });
  const lookupKey = `${classId}:${courseId}:${semesterId}`;
  const existing = lookup.key === lookupKey ? lookup.row : null;
  const lookupError = lookup.key === lookupKey ? lookup.error : "";
  const lookupLoading = !!classId && !!courseId && !!semesterId && lookup.key !== lookupKey;
  const selectedClass = initialClass || metadata.classes.find(c => String(idOf(c)) === classId);
  const courses = coursesForClass(metadata.courses, selectedClass);
  const teachers = metadata.teachers.filter(t => Number(keyOf(t, "MajorID")) > 0 && Number(keyOf(t, "MajorID")) === Number(keyOf(selectedClass, "MajorID")));
  const semester = metadata.semesters.find(s => String(idOf(s)) === semesterId);
  const minDate = [schoolToday(), String(keyOf(semester, "StartDate") || "").slice(0,10)].sort().pop();
  const maxDate = String(keyOf(semester, "EndDate") || "").slice(0,10) || undefined;
  useEffect(() => {
    let cancelled = false;
    if (!classId || !courseId || !semesterId) return;
    apiRequest(token, `/course-offerings?semesterId=${semesterId}`).then(p => {
      if (!cancelled) setLookup({ key: lookupKey, row: ((p.data || []) as Row[]).find(o => Number(keyOf(o, "ClassID")) === Number(classId) && Number(keyOf(o, "CourseID")) === Number(courseId)) || null, rows: p.data || [], error: "" });
    }).catch(e => { if (!cancelled) setLookup({ key: lookupKey, row: null, rows: [], error: e.message }); });
    return () => { cancelled = true; };
  }, [token, classId, courseId, semesterId, lookupKey]);
  const generate = () => {
    if (!startDate || count < 1 || count > 120) { setError("Chọn ngày bắt đầu và số buổi từ 1 đến 120"); return; }
    if (!weekdays.length) { setError("Chọn ít nhất một thứ học hằng tuần"); return; }
    if (startDate < (minDate || "")) { setError("Ngày bắt đầu phải từ hôm nay và nằm trong học kỳ"); return; }
    const generated = weeklyTeachingDates(startDate, count, weekdays, maxDate);
    if (generated.length !== count) { setError("Học kỳ không còn đủ ngày để xếp số buổi đã chọn. Hãy giảm số buổi hoặc chọn ngày bắt đầu sớm hơn."); return; }
    setDates(generated);
    setError("");
  };
  const retained = ((keyOf(existing, "Schedules") || []) as Row[]).filter(s => !dates.includes(String(keyOf(s, "FullDate") || "").slice(0,10)));
  const allDates = [...dates, ...retained.map(s => String(keyOf(s, "FullDate") || "").slice(0,10))].filter(Boolean).sort();
  const contextLessons = (lookup.key === lookupKey ? lookup.rows : []).filter(o => keyOf(o,"Status") === "open" && (Number(keyOf(o,"ClassID")) === Number(classId) || Number(keyOf(o,"TeacherID")) === Number(teacherId))).flatMap(classLessons).sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const changeClass = (value: string) => { setClassId(value); setCourseId(""); if (!initialTeacher) setTeacherId(""); setRoomId(""); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy || lookupLoading || lookupError) return;
    if (!dates.length || dates.some(d => !d || d < (minDate || "") || (maxDate && d > maxDate))) { setError("Chọn đầy đủ ngày dạy từ hôm nay và nằm trong học kỳ"); return; }
    if (new Set(dates).size !== dates.length) { setError("Danh sách ngày dạy đang bị trùng"); return; }
    if (startTime >= endTime) { setError("Giờ kết thúc phải sau giờ bắt đầu"); return; }
    setBusy(true); setError("");
    try {
      const payload = await apiRequest(token, "/class-offers", { method: "POST", body: JSON.stringify({ classId: Number(classId), teacherId: Number(teacherId), courseId: Number(courseId), semesterId: Number(semesterId), roomId: Number(roomId), title: title.trim(), content: content.trim(), teachingDates: dates, session, startTime, endTime }) });
      onToast(payload.message || "Đã gửi kế hoạch giảng dạy", "success");
      setDates([]); setStartDate(""); setTitle(""); setContent(""); onSent?.();
    } catch (err) { const message = err instanceof Error ? err.message : "Không gửi được đề xuất"; setError(message); onToast(message, "error"); }
    finally { setBusy(false); }
  };
  return <form className="feature-form teaching-offer-form" onSubmit={submit}>
    {initialTeacher && !Number(keyOf(initialTeacher,"MajorID")) && <p className="feature-error">Giảng viên chưa có ngành dạy. Vui lòng cập nhật ngành trong hồ sơ trước khi phân công.</p>}
    {classId && !initialTeacher && !teachers.length && <p className="offer-plan-note">Chưa có giảng viên thuộc ngành của lớp. Hãy thêm giảng viên hoặc cập nhật ngành dạy trong hồ sơ.</p>}
    <div className="form-grid">
      <label>Lớp cần phân công<select required disabled={!!initialClass || busy} value={classId} onChange={e => changeClass(e.target.value)}><option value="">Chọn lớp</option>{(initialClass ? [initialClass] : metadata.classes).filter(c => keyOf(c,"Status") === "open" && (!initialTeacher || Number(keyOf(initialTeacher,"MajorID")) > 0 && Number(keyOf(c,"MajorID")) === Number(keyOf(initialTeacher,"MajorID")))).map(c => <option key={idOf(c)} value={idOf(c)}>{display(keyOf(c,"ClassCode"))} · {display(pick(c,"Major.Name"))}</option>)}</select></label>
      <label>Môn dạy<select required value={courseId} onChange={e => setCourseId(e.target.value)} disabled={!classId || busy}><option value="">Chọn môn thuộc ngành của lớp</option>{courses.map(c => <option key={idOf(c)} value={idOf(c)}>{display(keyOf(c,"Name"))}</option>)}</select></label>
      <label>Học kỳ<select required value={semesterId} onChange={e => setSemesterId(e.target.value)} disabled={busy}><option value="">Chọn học kỳ</option>{metadata.semesters.filter(s => keyOf(s,"Status") !== "closed").map(s => <option key={idOf(s)} value={idOf(s)}>{display(keyOf(s,"Name"))}</option>)}</select></label>
      <label>Giảng viên được đề xuất<select required value={teacherId} onChange={e => setTeacherId(e.target.value)} disabled={!!initialTeacher || !classId || busy}><option value="">Chọn giảng viên</option>{(initialTeacher ? [initialTeacher] : teachers).map(t => <option key={idOf(t)} value={idOf(t)}>{display(pick(t,"User.FullName"))}</option>)}</select></label>
      <label>Phòng học<select required value={roomId} onChange={e => setRoomId(e.target.value)} disabled={busy}><option value="">Chọn phòng</option>{metadata.rooms.map(r => <option key={idOf(r)} value={idOf(r)}>{display(keyOf(r,"Name"))}</option>)}</select></label>
      <label>Ca dạy<select value={session} disabled={busy} onChange={e => { setSession(e.target.value); const times = e.target.value === "Sáng" ? ["07:30","11:30"] : e.target.value === "Chiều" ? ["13:30","16:30"] : ["18:00","21:00"]; setStartTime(times[0]); setEndTime(times[1]); }}><option>Sáng</option><option>Chiều</option><option>Tối</option></select></label>
      <label>Giờ bắt đầu<input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} disabled={busy} /></label>
      <label>Giờ kết thúc<input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} disabled={busy} /></label>
    </div>
    {lookup.key === lookupKey && !lookupError && <details className="assignment-context"><summary>Đối chiếu lịch hiện có của lớp và giảng viên ({contextLessons.length} buổi trong học kỳ)</summary>{!contextLessons.length ? <p>Chưa có lịch chính thức trong học kỳ đã chọn.</p> : <div className="feature-table-wrap class-calendar-table"><table><thead><tr><th>Ngày</th><th>Giờ</th><th>Lớp</th><th>Môn</th><th>Giảng viên</th><th>Phòng</th></tr></thead><tbody>{contextLessons.map((l,i)=><tr key={i}><td>{dateText(l.date)}</td><td>{l.startTime} – {l.endTime}</td><td>{display(pick(l.offering,"Class.ClassCode"))}</td><td>{display(pick(l.offering,"Course.Name"))}</td><td>{display(pick(l.offering,"Teacher.User.FullName"))}</td><td>{display(pick(l.offering,"Room.Name"))}</td></tr>)}</tbody></table></div>}</details>}
    <fieldset className="offer-date-builder" disabled={busy}><legend>Kế hoạch các buổi dạy</legend><div className="form-grid">
      <label>Ngày bắt đầu<input type="date" min={minDate} max={maxDate} value={startDate} onChange={e => { setStartDate(e.target.value); setDates([]); }} /></label>
      <label>Số buổi cần thêm<input type="number" min={1} max={120} value={count} onChange={e => { setCount(Number(e.target.value)); setDates([]); }} /></label>
    </div><fieldset className="weekly-day-picker"><legend>Ngày học cố định hằng tuần</legend><div>{[1,2,3,4,5,6,0].map(day => <label key={day}><input type="checkbox" checked={weekdays.includes(day)} onChange={e => { setWeekdays(current => e.target.checked ? [...current,day] : current.filter(d => d !== day)); setDates([]); }} />{day === 0 ? "Chủ nhật" : `Thứ ${day+1}`}</label>)}</div><p>Chọn một hoặc nhiều thứ, ví dụ thứ 2, 4, 6. Lịch lặp hằng tuần từ ngày bắt đầu đến khi đủ số buổi; có thể sửa từng ngày sau khi tạo.</p></fieldset><button type="button" className="refresh-button" onClick={generate}>Tạo danh sách ngày</button>
    <div className="offer-date-list">{dates.map((date, i) => <label key={i}>Buổi {i+1}<input type="date" required min={minDate} max={maxDate} value={date} onChange={e => setDates(current => current.map((d,index) => index === i ? e.target.value : d))} /><button type="button" onClick={() => setDates(current => current.filter((_,index) => index !== i))} aria-label={`Bỏ buổi ${i+1}`}>Bỏ</button></label>)}</div>
    </fieldset>
    {lookupError && <p className="feature-error">Không tải được lịch hiện có: {lookupError}</p>}
    {existing && <p className="offer-plan-note">Học phần đã tồn tại. Đề xuất sẽ chuyển môn này cho giảng viên được chọn; {retained.length} buổi cũ ngoài các ngày sửa được giữ nguyên. Giáo viên sẽ thấy toàn bộ lịch trước khi nhận.</p>}
    {allDates.length > 0 && <div className="offer-plan-preview"><strong>Tổng dự kiến: {allDates.length} buổi</strong><span>Bắt đầu: {dateText(allDates[0])}</span><span>Kết thúc: {dateText(allDates[allDates.length-1])}</span><span>Lịch mới: {startTime} – {endTime} · {session}</span></div>}
    <div className="form-grid"><label>Tiêu đề đề xuất<input maxLength={255} value={title} onChange={e => setTitle(e.target.value)} placeholder="Đề xuất phân công giảng dạy" /></label><label className="span-3">Lời nhắn cho giảng viên<textarea value={content} onChange={e => setContent(e.target.value)} rows={3} /></label></div>
    {error && <div className="feature-error" role="alert">{error}</div>}
    <div className="form-actions">{onCancel && <button type="button" className="refresh-button" onClick={onCancel}>Đóng</button>}<button className="primary-button" disabled={busy || !dates.length || !!lookupError || lookupLoading}>{busy ? "Đang gửi..." : lookupLoading ? "Đang kiểm tra lịch..." : "Gửi kế hoạch cho giảng viên"}</button></div>
  </form>;
}
