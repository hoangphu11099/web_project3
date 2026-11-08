"use client";
import { useState } from "react";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { useErrorReporter } from "@/components/common/ErrorFeedback";
import { apiRequest, display, pick } from "@/controllers/api.controller";
import type { ClassLesson } from "@/controllers/class-schedule";

const labelDate = (value: string) => new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));

export function RescheduleLessonForm({ token, classId, lesson, onClose, onSaved }: { token: string; classId: number; lesson: ClassLesson; onClose: () => void; onSaved: () => void }) {
  const [date,setDate] = useState(lesson.date);
  const [start,setStart] = useState(lesson.startTime.slice(0,5));
  const [end,setEnd] = useState(lesson.endTime.slice(0,5));
  const [session,setSession] = useState(lesson.session);
  const [reason,setReason] = useState("");
  const [saving,setSaving] = useState(false);
  const reportError = useErrorReporter();
  const today = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const minimum = [today,String(pick(lesson.offering,"Semester.StartDate") || "").slice(0,10)].sort().pop();
  const maximum = String(pick(lesson.offering,"Semester.EndDate") || "").slice(0,10) || undefined;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!date || date < (minimum || "") || (maximum && date > maximum) || Date.parse(`${date}T${start}+07:00`) <= Date.now()) { reportError("Ngày/giờ học bù phải ở tương lai và nằm trong học kỳ."); return; }
    if (start >= end) { reportError("Giờ kết thúc phải sau giờ bắt đầu."); return; }
    if (!reason.trim()) { reportError("Vui lòng ghi lý do đổi lịch, ví dụ nghỉ lễ hoặc giảng viên bận."); return; }
    setSaving(true);
    try {
      await apiRequest(token, `/classes/${classId}/schedules/${lesson.scheduleId}`, {method:"PUT",body:JSON.stringify({teachingDate:date,startTime:start,endTime:end,session,reason:reason.trim(),expectedDate:lesson.date,expectedStartTime:lesson.startTime,expectedEndTime:lesson.endTime})});
      onSaved();
    } catch (error) { reportError(error instanceof Error ? error.message : "Không cập nhật được lịch học bù."); }
    finally { setSaving(false); }
  };
  return <FeatureDialog title="Đổi lịch / Xếp buổi học bù" description="Điều chỉnh buổi đã phân công; cập nhật trực tiếp lịch của lớp, giảng viên và sinh viên." onClose={() => { if (!saving) onClose(); }}>
    <form className="feature-form makeup-lesson-form" onSubmit={save}>
      <dl className="offer-plan-summary"><div><dt>Môn học</dt><dd>{display(pick(lesson.offering,"Course.Name"))}</dd></div><div><dt>Giảng viên</dt><dd>{display(pick(lesson.offering,"Teacher.User.FullName"))}</dd></div><div><dt>Phòng</dt><dd>{display(pick(lesson.offering,"Room.Name"))}</dd></div><div><dt>Lịch đang có</dt><dd>{labelDate(lesson.date)} · {lesson.startTime.slice(0,5)} – {lesson.endTime.slice(0,5)}</dd></div></dl>
      <fieldset disabled={saving}><div className="form-grid"><label>Ngày học bù<input type="date" required min={minimum} max={maximum} value={date} onChange={e=>setDate(e.target.value)} />{date && <small>{labelDate(date)}</small>}</label><label>Ca học<select value={session} onChange={e=>{const value=e.target.value;setSession(value);const times=value==="Sáng"?["07:30","11:30"]:value==="Chiều"?["13:30","16:30"]:["18:00","21:00"];setStart(times[0]);setEnd(times[1]);}}>{!["Sáng","Chiều","Tối"].includes(session) && <option value={session}>{session || "Tùy chỉnh"}</option>}<option>Sáng</option><option>Chiều</option><option>Tối</option></select></label><label>Giờ bắt đầu<input type="time" required value={start} onChange={e=>setStart(e.target.value)} /></label><label>Giờ kết thúc<input type="time" required value={end} onChange={e=>setEnd(e.target.value)} /></label><label className="span-3">Lý do đổi lịch<textarea required maxLength={1000} rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Nghỉ lễ, chuyển buổi học sang ngày học bù…" /></label></div></fieldset>
      <p className="filter-summary">Buổi cũ sẽ được chuyển sang lịch mới, giữ nguyên tổng số buổi, giảng viên và phòng. Hệ thống kiểm tra trùng lịch trước khi lưu.</p>
      <div className="form-actions"><button type="button" className="refresh-button" disabled={saving} onClick={onClose}>Hủy</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Đang cập nhật…" : "Lưu lịch học bù"}</button></div>
    </form>
  </FeatureDialog>;
}
