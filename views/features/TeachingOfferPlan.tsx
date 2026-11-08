"use client";
import { useErrorFeedback } from "@/components/common/ErrorFeedback";
import { useEffect, useRef, useState } from "react";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { apiRequest, display, idOf, keyOf, pick } from "@/controllers/api.controller";
import { coursesForClass } from "@/controllers/course-options";
import { dayLabel } from "@/controllers/teaching-schedule.controller";
import { assignmentConflicts, weekdaysForStartDate, weeklyTeachingDates } from "@/controllers/class-schedule";
import type { MetadataData, Row, ToastHandler } from "@/models/dashboard";

export function offerSchedules(row: Row): Row[] {
  try { const plan = JSON.parse(String(keyOf(row, "PlanJSON") || "{}")); return Array.isArray(plan.schedules) ? plan.schedules : []; }
  catch { return []; }
}

function dateText(value: unknown) {
  const date = String(value || "").slice(0, 10);
  return date ? new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00`)) : "—";
}

export function TeachingOfferDetails({ row }: { row: Row }) {
  const schedules = offerSchedules(row);
  let exceptionReason = "";
  try { const plan = JSON.parse(String(keyOf(row,"PlanJSON") || "{}")); if (plan.urgentException) exceptionReason = String(plan.exceptionReason || ""); } catch { /* Older offers may have no plan. */ }
  const dates = schedules.map(s => String(keyOf(s, "FullDate") || "").slice(0, 10)).filter(Boolean).sort();
  if (!schedules.length) return <p className="offer-plan-note">Đề xuất cũ chưa có kế hoạch chi tiết. Admin cần gửi lại môn và lịch để giáo viên nhận dạy.</p>;
  return <div className="offer-plan-details">
    {exceptionReason && <p className="offer-urgent-notice"><strong>Ngoại lệ cấp bách:</strong> {exceptionReason}</p>}
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
  const [customTitle, setTitle] = useState<string | null>(null);
  const [customContent, setContent] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [count, setCount] = useState(6);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [exceptionReason, setExceptionReason] = useState<string | null>(null);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionDraft, setExceptionDraft] = useState("");
  const [session, setSession] = useState("Sáng");
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("11:30");
  const [, setError] = useErrorFeedback();
  const [busy, setBusy] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<{ kind: "TeacherID" | "RoomID"; mode: "reason" | "replace" | "schedule" } | null>(null);
  const lastConflict = useRef("");
  const [lookup, setLookup] = useState<{ key: string; row: Row | null; rows: Row[]; error: string }>({ key: "", row: null, rows: [], error: "" });
  const lookupKey = `${classId}:${courseId}:${semesterId}`;
  const existing = lookup.key === lookupKey ? lookup.row : null;
  const lookupError = lookup.key === lookupKey ? lookup.error : "";
  const lookupLoading = !!classId && !!courseId && !!semesterId && lookup.key !== lookupKey;
  const selectedClass = initialClass || metadata.classes.find(c => String(idOf(c)) === classId);
  const courses = coursesForClass(metadata.courses, selectedClass);
  const teachers = metadata.teachers.filter(t => Number(keyOf(t, "MajorID")) > 0 && Number(keyOf(t, "MajorID")) === Number(keyOf(selectedClass, "MajorID")));
  const semester = metadata.semesters.find(s => String(idOf(s)) === semesterId);
  const courseName = String(keyOf(metadata.courses.find(c => String(idOf(c)) === courseId), "Name") || "");
  const classCode = String(keyOf(selectedClass, "ClassCode") || "");
  const teacherName = String(pick(metadata.teachers.find(t => String(idOf(t)) === teacherId), "User.FullName") || "");
  const semesterName = String(keyOf(semester, "Name") || "");
  const title = customTitle ?? `Thư mời giảng dạy${courseName ? ` môn ${courseName}` : ""}${classCode ? ` – Lớp ${classCode}` : ""}`.slice(0, 255);
  const content = customContent ?? [
    `Kính gửi ${teacherName ? `Thầy/Cô ${teacherName}` : "Quý Thầy/Cô"},`,
    `Bộ phận Đào tạo PP Academy trân trọng kính mời Thầy/Cô tham gia giảng dạy${courseName ? ` môn ${courseName}` : " theo kế hoạch đề xuất"}${classCode ? ` cho lớp ${classCode}` : ""}${semesterName ? `, học kỳ ${semesterName}` : ""}.`,
    "Kính đề nghị Thầy/Cô xem xét thông tin lớp học, thời gian và địa điểm trong kế hoạch kèm theo, đồng thời phản hồi chấp nhận hoặc từ chối lời mời trên hệ thống. Lịch giảng dạy sẽ được xác nhận sau khi Thầy/Cô chấp nhận lời mời.",
    "Nếu cần trao đổi hoặc điều chỉnh kế hoạch, kính mong Thầy/Cô liên hệ Bộ phận Đào tạo để được hỗ trợ.",
    "Trân trọng cảm ơn sự hợp tác của Thầy/Cô.",
    "Bộ phận Đào tạo\nPP Academy",
  ].join("\n\n");
  const today = schoolToday();
  const preparationDate = new Date(`${today}T12:00:00Z`);
  preparationDate.setUTCDate(preparationDate.getUTCDate() + 7);
  const normalMinimum = preparationDate.toISOString().slice(0,10);
  const minDate = [exceptionReason === null ? normalMinimum : today, String(keyOf(semester, "StartDate") || "").slice(0,10)].sort().pop();
  const maxDate = String(keyOf(semester, "EndDate") || "").slice(0,10) || undefined;
  useEffect(() => {
    let cancelled = false;
    if (!classId || !courseId || !semesterId) return;
    apiRequest(token, `/course-offerings`).then(p => {
      if (!cancelled) setLookup({ key: lookupKey, row: ((p.data || []) as Row[]).find(o => Number(keyOf(o, "SemesterID")) === Number(semesterId) && Number(keyOf(o, "ClassID")) === Number(classId) && Number(keyOf(o, "CourseID")) === Number(courseId)) || null, rows: p.data || [], error: "" });
    }).catch(e => { if (!cancelled) setLookup({ key: lookupKey, row: null, rows: [], error: e.message }); });
    return () => { cancelled = true; };
  }, [token, classId, courseId, semesterId, lookupKey]);
  useEffect(() => {
    if (lookupError) setError(lookupError);
  }, [lookupError, setError]);
  const generate = () => {
    if (!startDate || count < 1 || count > 120) { setError("Chọn ngày bắt đầu và số buổi từ 1 đến 120"); return; }
    if (!weekdays.length) { setError("Chọn ít nhất một thứ học hằng tuần"); return; }
    if (startDate < (minDate || "")) { setError(exceptionReason === null ? "Ngày dạy phải cách ngày gửi phân công ít nhất 7 ngày và nằm trong học kỳ. Trường hợp cấp bách, hãy tạo ngoại lệ." : "Ngoại lệ vẫn phải nằm trong học kỳ và không được chọn ngày trong quá khứ."); return; }
    const generated = weeklyTeachingDates(startDate, count, weekdays, maxDate);
    if (generated.length !== count) { setError("Học kỳ không còn đủ ngày để xếp số buổi đã chọn. Hãy giảm số buổi hoặc chọn ngày bắt đầu sớm hơn."); return; }
    setDates(generated);
    setError("");
  };
  const previewDates = dates.length ? dates : weeklyTeachingDates(startDate, count, weekdays, maxDate);
  const retained = ((keyOf(existing, "Schedules") || []) as Row[]).filter(s => !previewDates.includes(String(keyOf(s, "FullDate") || "").slice(0,10)));
  const allDates = [...dates, ...retained.map(s => String(keyOf(s, "FullDate") || "").slice(0,10))].filter(Boolean).sort();
  const plan = [...previewDates.map(date => ({ date, startTime, endTime })), ...retained.map(s => ({ date: String(keyOf(s,"FullDate") || "").slice(0,10), startTime: String(keyOf(s,"StartTime") || ""), endTime: String(keyOf(s,"EndTime") || "") }))];
  const ready = !lookupLoading && !lookupError && lookup.key === lookupKey && (dates.length > 0 || previewDates.length === count) && previewDates.length > 0 && startTime < endTime && previewDates.every(d => !!d && d >= (minDate || ""));
  const conflictsFor = (resource: "TeacherID" | "RoomID" | "ClassID", id: string, candidate = plan) => assignmentConflicts(lookup.rows, candidate, resource, id, existing ? idOf(existing) : 0);
  const teacherConflicts = conflictsFor("TeacherID", teacherId);
  const roomConflicts = conflictsFor("RoomID", roomId);
  const classConflicts = conflictsFor("ClassID", classId);
  const blocked = teacherConflicts.length > 0 || roomConflicts.length > 0 || classConflicts.length > 0;
  const orderedTeachers = [...teachers].sort((a,b) => Number(conflictsFor("TeacherID", String(idOf(a))).length > 0) - Number(conflictsFor("TeacherID", String(idOf(b))).length > 0));
  const orderedRooms = [...metadata.rooms].sort((a,b) => Number(conflictsFor("RoomID", String(idOf(a))).length > 0) - Number(conflictsFor("RoomID", String(idOf(b))).length > 0));
  const conflictSignature = ready ? JSON.stringify([lookupKey, teacherId, roomId, plan, teacherConflicts.length, roomConflicts.length, classConflicts.length]) : "";
  useEffect(() => {
    if (!conflictSignature) { lastConflict.current = ""; return; }
    if (lastConflict.current === conflictSignature) return;
    lastConflict.current = conflictSignature;
    if (teacherConflicts.length || roomConflicts.length) setConflictDialog({ kind: teacherConflicts.length ? "TeacherID" : "RoomID", mode: "reason" });
    else {
      setConflictDialog(null);
      if (classConflicts.length) setError(`Lớp đã có buổi học trùng giờ:\n${classConflicts.map(l => `${dateText(l.date)} · ${l.startTime.slice(0,5)} – ${l.endTime.slice(0,5)} · ${display(pick(l.offering,"Course.Name"))}`).join("\n")}\nVui lòng đổi ngày hoặc giờ học; đổi giáo viên/phòng sẽ không giải quyết lịch trùng của lớp.`);
    }
  }, [conflictSignature, teacherConflicts.length, roomConflicts.length, classConflicts.length, setError]);
  const alternatives = (id: string, kind: "TeacherID" | "RoomID" = "TeacherID") => {
    const options: { label: string; dates: string[]; start: string; end: string }[] = [];
    for (let offset = 0; offset <= 7 && options.length < 3; offset++) {
      for (const [start, end] of [["07:30","11:30"],["13:30","16:30"],["18:00","21:00"]]) {
        const shifted = previewDates.map(d => {
          const date = new Date(`${d}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset);
          return { date: date.toISOString().slice(0,10), startTime: start, endTime: end };
        });
        const candidate = [...shifted, ...((keyOf(existing, "Schedules") || []) as Row[]).filter(s => !shifted.some(p => p.date === String(keyOf(s,"FullDate") || "").slice(0,10))).map(s => ({date: String(keyOf(s,"FullDate") || "").slice(0,10), startTime: String(keyOf(s,"StartTime") || ""), endTime: String(keyOf(s,"EndTime") || "")}))];
        if (candidate.some(p => p.date < (minDate || "") || (maxDate && p.date > maxDate))) continue;
        if (shifted.some(p => Date.parse(`${p.date}T${p.startTime}+07:00`) <= Date.now())) continue;
        const checkedTeacher = kind === "TeacherID" ? id : teacherId;
        const checkedRoom = kind === "RoomID" ? id : roomId;
        if ((!checkedTeacher || !conflictsFor("TeacherID", checkedTeacher, candidate).length) && !conflictsFor("ClassID", classId, candidate).length && (!checkedRoom || !conflictsFor("RoomID", checkedRoom, candidate).length)) {
          const weekdaysText = (values: string[]) => [...new Set(values.map(d => new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))))].join(", ");
          const label = offset
            ? `Đổi ngày học từ ${weekdaysText(previewDates)} sang ${weekdaysText(shifted.map(p => p.date))}. Mỗi buổi trong ${previewDates.length} buổi sẽ học muộn hơn ${offset} ngày. Giờ học: ${startTime} – ${endTime} → ${start} – ${end}`
            : `Giữ nguyên ngày học (${weekdaysText(previewDates)}), chỉ đổi giờ từ ${startTime} – ${endTime} sang ${start} – ${end}`;
          options.push({ label, dates: candidate.slice(0, previewDates.length).map(p => p.date), start, end });
          if (options.length === 3) break;
        }
      }
    }
    return options;
  };
  const chooseResource = (kind: "TeacherID" | "RoomID", value: string) => {
    if (kind === "TeacherID") setTeacherId(value); else setRoomId(value);
    if (ready && conflictsFor(kind, value).length) setConflictDialog({ kind, mode: "reason" });
  };
  const dialogKind = conflictDialog?.kind || "TeacherID";
  const dialogId = dialogKind === "TeacherID" ? teacherId : roomId;
  const dialogResource = (dialogKind === "TeacherID" ? metadata.teachers : metadata.rooms).find(r => String(idOf(r)) === dialogId);
  const dialogName = display(dialogKind === "TeacherID" ? pick(dialogResource,"User.FullName") : keyOf(dialogResource,"Name"));
  const replacements = (dialogKind === "TeacherID" ? orderedTeachers : orderedRooms).filter(r => !conflictsFor(dialogKind, String(idOf(r))).length);
  const changeClass = (value: string) => { setClassId(value); setCourseId(""); if (!initialTeacher) setTeacherId(""); setRoomId(""); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy || !ready) return;
    if (blocked) { setError("Giáo viên, phòng hoặc lớp bị trùng lịch. Hãy đổi lựa chọn hoặc ngày/giờ dạy."); return; }
    if (!dates.length || dates.some(d => !d || d < (minDate || "") || (maxDate && d > maxDate))) { setError("Ngày dạy phải nằm trong học kỳ và cách ngày gửi ít nhất 7 ngày, trừ trường hợp đã tạo ngoại lệ cấp bách."); return; }
    if (dates.some(d => Date.parse(`${d}T${startTime}+07:00`) <= Date.now())) { setError("Không được phân công buổi dạy đã qua hoặc đã đến giờ bắt đầu, kể cả khi tạo ngoại lệ."); return; }
    if (new Set(dates).size !== dates.length) { setError("Danh sách ngày dạy đang bị trùng"); return; }
    if (startTime >= endTime) { setError("Giờ kết thúc phải sau giờ bắt đầu"); return; }
    setBusy(true); setError("");
    try {
      const payload = await apiRequest(token, "/class-offers", { method: "POST", body: JSON.stringify({ classId: Number(classId), teacherId: Number(teacherId), courseId: Number(courseId), semesterId: Number(semesterId), roomId: Number(roomId), title: title.trim(), content: content.trim(), teachingDates: dates, session, startTime, endTime, urgentException: exceptionReason !== null, exceptionReason: exceptionReason || "" }) });
      onToast(payload.message || "Đã gửi kế hoạch giảng dạy", "success");
      setDates([]); setStartDate(""); setTitle(null); setContent(null); setExceptionReason(null); setExceptionDraft(""); onSent?.();
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
      <label>Giảng viên được đề xuất<select required value={teacherId} onChange={e => chooseResource("TeacherID", e.target.value)} disabled={!classId || busy}><option value="">Chọn giảng viên</option>{orderedTeachers.map(t => <option key={idOf(t)} value={idOf(t)} className={ready && conflictsFor("TeacherID", String(idOf(t))).length > 0 ? "busy-resource-option" : ""}>{display(pick(t,"User.FullName"))}{ready ? conflictsFor("TeacherID", String(idOf(t))).length ? " · Bận / trùng lịch" : " · Đề xuất: còn trống" : ""}</option>)}</select></label>
      <label>Phòng học<select required value={roomId} onChange={e => chooseResource("RoomID", e.target.value)} disabled={busy}><option value="">Chọn phòng</option>{orderedRooms.map(r => <option key={idOf(r)} value={idOf(r)} className={ready && conflictsFor("RoomID", String(idOf(r))).length > 0 ? "busy-resource-option" : ""}>{display(keyOf(r,"Name"))}{ready ? conflictsFor("RoomID", String(idOf(r))).length ? " · Bận / trùng lịch" : " · Còn trống" : ""}</option>)}</select></label>
      <label>Ca dạy<select value={session} disabled={busy} onChange={e => { setSession(e.target.value); const times = e.target.value === "Sáng" ? ["07:30","11:30"] : e.target.value === "Chiều" ? ["13:30","16:30"] : ["18:00","21:00"]; setStartTime(times[0]); setEndTime(times[1]); }}><option>Sáng</option><option>Chiều</option><option>Tối</option></select></label>
      <label>Giờ bắt đầu<input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} disabled={busy} /></label>
      <label>Giờ kết thúc<input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} disabled={busy} /></label>
    </div>
    {conflictDialog && ready && <FeatureDialog className="assignment-conflict-dialog" title={`${dialogKind === "TeacherID" ? "Giáo viên" : "Phòng học"} trùng lịch: ${dialogName}`} description="Chọn cách xử lý bên dưới để tiếp tục phân công." onClose={() => setConflictDialog(null)}>
      <div className="conflict-alert"><span aria-hidden="true">!</span><div><strong>Có {conflictsFor(dialogKind, dialogId).length} buổi bị trùng lịch</strong><p>{dialogName} đã có lịch trong các khung giờ dưới đây.</p></div></div>
      <div className="feature-table-wrap conflict-busy-table"><table><thead><tr><th>Ngày</th><th>Giờ bận</th><th>Lớp / Môn</th><th>Phòng</th></tr></thead><tbody>{conflictsFor(dialogKind, dialogId).map((l,i) => <tr key={i}><td>{dateText(l.date)}</td><td><span className="conflict-time-badge">{l.startTime.slice(0,5)} – {l.endTime.slice(0,5)}</span></td><td><strong>{display(pick(l.offering,"Class.ClassCode"))}</strong><small>{display(pick(l.offering,"Course.Name"))}</small></td><td>{display(pick(l.offering,"Room.Name"))}</td></tr>)}</tbody></table></div>
      <div className="conflict-resolution"><h3>Bạn muốn xử lý thế nào?</h3><div className="conflict-resolution-actions"><button type="button" aria-pressed={conflictDialog.mode === "replace"} onClick={() => setConflictDialog({kind: dialogKind, mode:"replace"})}><strong>Đổi {dialogKind === "TeacherID" ? "giáo viên" : "phòng học"} khác</strong><span>Giữ nguyên ngày và giờ đang chọn</span></button><button type="button" aria-pressed={conflictDialog.mode === "schedule"} onClick={() => setConflictDialog({kind: dialogKind, mode:"schedule"})}><strong>Giữ {dialogKind === "TeacherID" ? "giáo viên" : "phòng học"}, đổi lịch</strong><span>Tìm ngày, giờ trống cho {dialogName}</span></button></div></div>
      {conflictDialog.mode === "replace" && <section aria-label="Danh sách còn trống"><h3>{dialogKind === "TeacherID" ? "Giáo viên" : "Phòng học"} còn trống toàn bộ lịch dự kiến</h3>{!replacements.length && <p>Không có lựa chọn còn trống. Hãy đổi ngày/giờ.</p>}<div className="conflict-choice-list">{replacements.map(r => <button type="button" className="refresh-button" key={idOf(r)} onClick={() => { chooseResource(dialogKind, String(idOf(r))); setConflictDialog(null); }}>{display(dialogKind === "TeacherID" ? pick(r,"User.FullName") : keyOf(r,"Name"))} · Chọn</button>)}</div></section>}
      {conflictDialog.mode === "schedule" && <section className="conflict-suggestions" aria-label="Lịch đề xuất"><h3>Lịch trống cho {dialogName}</h3><p className="conflict-section-description">Đã kiểm tra lịch lớp, giáo viên và phòng. Chọn một phương án để cập nhật toàn bộ {previewDates.length} buổi mới; lịch đã có giữ nguyên.</p><div className="conflict-schedule-list">{alternatives(dialogId, dialogKind).map((s,i) => <article className="conflict-schedule-card" key={i}>
        <header><span className="conflict-option-number">Phương án {i+1}</span><span className="conflict-available-badge">Không trùng lịch</span></header>
        <h4>{s.dates[0] === previewDates[0] ? "Giữ ngày học · Đổi giờ" : "Đổi ngày học"}</h4><p className="conflict-change-description">{s.label}</p>
        <dl className="conflict-date-comparison">{[{ label: "Giờ học", before: `${startTime} – ${endTime}`, after: `${s.start} – ${s.end}` }, { label: "Buổi đầu", before: dateText(previewDates[0]), after: dateText(s.dates[0]) }, { label: "Buổi cuối", before: dateText(previewDates[previewDates.length-1]), after: dateText(s.dates[s.dates.length-1]) }].map(row => <div key={row.label}><dt>{row.label}</dt><dd><span className="conflict-old-value">{row.before}</span><span className="conflict-comparison-arrow" aria-label="chuyển sang">→</span><strong>{row.after}</strong></dd></div>)}</dl>
        <footer><span>{s.dates.length} buổi học</span><button type="button" className="primary-button" aria-label={`Áp dụng phương án ${i+1}`} onClick={() => { setDates(s.dates); setStartDate(s.dates[0]); setWeekdays([...new Set(s.dates.map(d => new Date(`${d}T12:00:00Z`).getUTCDay()))]); setStartTime(s.start); setEndTime(s.end); setSession(s.start < "12:00" ? "Sáng" : s.start < "18:00" ? "Chiều" : "Tối"); setConflictDialog(null); }}>Áp dụng lịch này <span aria-hidden="true">→</span></button></footer>
      </article>)}</div>{!alternatives(dialogId, dialogKind).length && <p className="conflict-empty">Chưa tìm thấy lịch phù hợp trong 7 ngày tiếp theo. Hãy đổi khoảng ngày, số buổi hoặc lựa chọn còn lại.</p>}</section>}
    </FeatureDialog>}
    {ready && (teacherConflicts.length > 0 || roomConflicts.length > 0) && <div className="form-actions">{teacherConflicts.length > 0 && <button type="button" className="refresh-button" onClick={() => setConflictDialog({kind:"TeacherID",mode:"reason"})}>Xử lý trùng lịch giáo viên</button>}{roomConflicts.length > 0 && <button type="button" className="refresh-button" onClick={() => setConflictDialog({kind:"RoomID",mode:"reason"})}>Xử lý trùng lịch phòng</button>}</div>}
    {exceptionOpen && <FeatureDialog title="Tạo ngoại lệ phân công cấp bách" description="Cho phép gửi lời mời trước buổi dạy dưới 7 ngày. Giảng viên vẫn cần chấp nhận; lịch trong quá khứ và trùng lịch vẫn bị chặn." onClose={() => setExceptionOpen(false)}><div className="offer-exception-form"><label>Lý do cấp bách<textarea maxLength={1000} rows={4} value={exceptionDraft} onChange={e => setExceptionDraft(e.target.value)} placeholder="Nêu rõ tình huống cần phân công gấp…" /></label><p>Lý do sẽ được lưu cùng lời mời và hiển thị cho giảng viên.</p><div className="form-actions"><button type="button" className="refresh-button" onClick={() => setExceptionOpen(false)}>Hủy</button><button type="button" className="primary-button" disabled={!exceptionDraft.trim()} onClick={() => { setExceptionReason(exceptionDraft.trim()); setExceptionOpen(false); }}>Xác nhận ngoại lệ</button></div></div></FeatureDialog>}
    <fieldset className="offer-date-builder" disabled={busy}><legend>Kế hoạch các buổi dạy</legend>
      <div className="offer-preparation-policy"><div>{exceptionReason === null ? <><strong>Thời gian chuẩn bị: tối thiểu 7 ngày</strong><p>Ngày dạy sớm nhất: {dateText(minDate)}.</p></> : <><strong>Ngoại lệ cấp bách đang áp dụng</strong><p>{exceptionReason}</p></>}</div><button type="button" className="refresh-button" onClick={() => { if (exceptionReason !== null) { setExceptionReason(null); setDates([]); } else { setExceptionDraft(""); setExceptionOpen(true); } }}>{exceptionReason === null ? "Tạo ngoại lệ" : "Hủy ngoại lệ"}</button></div>
      <div className="form-grid">
      <label>Ngày bắt đầu<input type="date" min={minDate} max={maxDate} value={startDate} onChange={e => { const value = e.target.value; setWeekdays(current => weekdaysForStartDate(current, startDate, value)); setStartDate(value); setDates([]); }} /></label>
      <label>Số buổi cần thêm<input type="number" min={1} max={120} value={count} onChange={e => { setCount(Number(e.target.value)); setDates([]); }} /></label>
    </div><fieldset className="weekly-day-picker"><legend>Ngày học cố định hằng tuần</legend><div>{[1,2,3,4,5,6,0].map(day => <label key={day}><input type="checkbox" checked={weekdays.includes(day)} onChange={e => { setWeekdays(current => e.target.checked ? [...current,day] : current.filter(d => d !== day)); setDates([]); }} />{day === 0 ? "Chủ nhật" : `Thứ ${day+1}`}</label>)}</div><p>Chọn một hoặc nhiều thứ, ví dụ thứ 2, 4, 6. Lịch lặp hằng tuần từ ngày bắt đầu đến khi đủ số buổi; có thể sửa từng ngày sau khi tạo.</p></fieldset><button type="button" className="refresh-button" onClick={generate}>Tạo danh sách ngày</button>
    <div className="offer-date-list">{dates.map((date, i) => <label key={i}>Buổi {i+1}<input type="date" required min={minDate} max={maxDate} value={date} onChange={e => setDates(current => current.map((d,index) => index === i ? e.target.value : d))} /><button type="button" onClick={() => setDates(current => current.filter((_,index) => index !== i))} aria-label={`Bỏ buổi ${i+1}`}>Bỏ</button></label>)}</div>
    </fieldset>
    {existing && <p className="offer-plan-note">Học phần đã tồn tại. Đề xuất sẽ chuyển môn này cho giảng viên được chọn; {retained.length} buổi cũ ngoài các ngày sửa được giữ nguyên. Giáo viên sẽ thấy toàn bộ lịch trước khi nhận.</p>}
    {allDates.length > 0 && <div className="offer-plan-preview"><strong>Tổng dự kiến: {allDates.length} buổi</strong><span>Bắt đầu: {dateText(allDates[0])}</span><span>Kết thúc: {dateText(allDates[allDates.length-1])}</span><span>Lịch mới: {startTime} – {endTime} · {session}</span></div>}
    <div className="form-grid"><label>Tiêu đề đề xuất<input maxLength={255} value={title} onChange={e => setTitle(e.target.value)} /></label><label className="span-3">Lời nhắn cho giảng viên<textarea value={content} onChange={e => setContent(e.target.value)} rows={12} /></label></div>
    <div className="form-actions">{onCancel && <button type="button" className="refresh-button" onClick={onCancel}>Đóng</button>}<button className="primary-button" disabled={busy || !dates.length || !ready || blocked}>{busy ? "Đang gửi..." : lookupLoading ? "Đang kiểm tra lịch..." : "Gửi kế hoạch cho giảng viên"}</button></div>
  </form>;
}
