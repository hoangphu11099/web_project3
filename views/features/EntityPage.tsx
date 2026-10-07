"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { apiRequest, display, idOf, inputDate, keyOf, pick, statusLabel } from "@/controllers/api.controller";
import { entityConfigs, numericKeys, type MetadataData, type Row, type ToastHandler } from "@/models/dashboard";
import { coursesForClass, changeDependentField } from "@/controllers/course-options";
import { FormField } from "@/components/common/FormField";
import { FileImport } from "@/components/common/FileImport";
import { Icon } from "@/components/ui/Icon";

function classCodeOf(row: Row) {
  return String(pick(row, "Class.ClassCode") ?? keyOf(row, "ClassCode") ?? "").trim();
}

function cohortOf(classCode: string) {
  return classCode.split("_")[0]?.toUpperCase() || "";
}

function majorCodeOf(classCode: string) {
  return classCode.split("_")[1]?.toUpperCase() || "";
}

const teachingSessions: Record<string, { startTime: string; endTime: string }> = {
  "Sáng": { startTime: "07:30", endTime: "11:30" },
  "Chiều": { startTime: "13:30", endTime: "16:30" },
  "Tối": { startTime: "18:00", endTime: "21:00" },
};
function schoolToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

type ScheduleDraft = {
  customTime: boolean;
  semesterId: string;
  courseId: string;
  teacherId: string;
  roomId: string;
  teachingDate: string;
  teachingDates: string[];
  session: string;
  startTime: string;
  endTime: string;
};

const emptyScheduleDraft: ScheduleDraft = {
  semesterId: "",
  courseId: "",
  teacherId: "",
  roomId: "",
  teachingDate: "",
  teachingDates: [],
  session: "Sáng",
  startTime: "07:30",
  endTime: "11:30",
  customTime: false,
};

function dayOfWeekFromDate(value: string) {
  if (!value) return "";
  const day = new Date(`${value}T00:00:00`).getDay();
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] || "";
}

function vietnameseDayFromDate(value: string) {
  const labels: Record<string, string> = { Mon: "Thứ Hai", Tue: "Thứ Ba", Wed: "Thứ Tư", Thu: "Thứ Năm", Fri: "Thứ Sáu", Sat: "Thứ Bảy", Sun: "Chủ Nhật" };
  return labels[dayOfWeekFromDate(value)] || "";
}

export function EntityPage({ active, token, metadata, onToast }: { active: string; token: string; metadata: MetadataData; onToast: ToastHandler }) {
  const config = entityConfigs[active]; const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [query, setQuery] = useState(""); const [formOpen, setFormOpen] = useState(false); const [form, setForm] = useState<Record<string, string>>({}); const [saving, setSaving] = useState(false); const [editing, setEditing] = useState<Row | null>(null);
  const [cohortFilter, setCohortFilter] = useState(""); const [majorFilter, setMajorFilter] = useState(""); const [classFilter, setClassFilter] = useState("");
  const [classAction, setClassAction] = useState<{ row: Row; kind: "assign" | "offer" | "students" | "schedule" } | null>(null); const [teacherId, setTeacherId] = useState(""); const [note, setNote] = useState(""); const [studentIds, setStudentIds] = useState<number[]>([]); const [allStudents, setAllStudents] = useState<Row[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<Row[]>([]);
  const [scheduleLookupError, setScheduleLookupError] = useState("");
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(emptyScheduleDraft);

  const load = async () => { setLoading(true); setError(""); try { const payload = await apiRequest(token, config.endpoint); setRows(Array.isArray(payload.data) ? payload.data : []); } catch (err) { setError(err instanceof Error ? err.message : "Không tải được dữ liệu"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [active, token]);
  useEffect(() => { setQuery(""); setCohortFilter(""); setMajorFilter(""); setClassFilter(""); setFormOpen(false); setForm({}); setEditing(null); setClassAction(null); setError(""); }, [active]);

  useEffect(() => {
    setSavedSchedules([]); setScheduleLookupError("");
    if (classAction?.kind !== "schedule" || !scheduleDraft.courseId || !scheduleDraft.semesterId) return;
    let cancelled = false;
    apiRequest(token, `/course-offerings?semesterId=${scheduleDraft.semesterId}`).then(payload => {
      if (cancelled) return;
      const offering = ((payload.data || []) as Row[]).find(row => Number(keyOf(row,"ClassID")) === idOf(classAction.row) && Number(keyOf(row,"CourseID")) === Number(scheduleDraft.courseId));
      if (offering) {
        setSavedSchedules((keyOf(offering,"Schedules") || []) as Row[]);
        setScheduleDraft(draft => ({...draft, teacherId: String(keyOf(offering,"TeacherID")), roomId: String(keyOf(offering,"RoomID"))}));
      }
    }).catch(err => { if (!cancelled) setScheduleLookupError(err instanceof Error ? err.message : "Không tải được lịch đã lưu"); });
    return () => { cancelled = true; };
  }, [token, classAction, scheduleDraft.courseId, scheduleDraft.semesterId]);

  const isStudentPage = active === "Sinh viên";
  const classesByCode = new Map(metadata.classes.map((row) => [String(keyOf(row, "ClassCode") ?? "").toUpperCase(), row]));
  const majorsByCode = new Map(metadata.majors.map((row) => [String(keyOf(row, "Code") ?? "").toUpperCase(), row]));
  const classInfo = (student: Row) => {
    const classCode = classCodeOf(student);
    const classRow = classesByCode.get(classCode.toUpperCase());
    const studentMajor = pick(student, "Class.Major") as Row | undefined;
    const classMajor = pick(classRow, "Major") as Row | undefined;
    const major = (studentMajor && (idOf(studentMajor) || keyOf(studentMajor, "Code")) ? studentMajor : undefined)
      || (classMajor && (idOf(classMajor) || keyOf(classMajor, "Code")) ? classMajor : undefined)
      || majorsByCode.get(majorCodeOf(classCode));
    return {
      classCode,
      cohort: cohortOf(classCode),
      majorKey: String(idOf(major || {}) || keyOf(major || {}, "Code") || majorCodeOf(classCode)),
    };
  };
  const cohortOptions = Array.from(new Set(rows.map((row) => classInfo(row).cohort).filter(Boolean))).sort();
  const majorOptions = metadata.majors.filter((major) => {
    if (!cohortFilter) return true;
    const key = String(idOf(major) || keyOf(major, "Code") || "");
    return rows.some((row) => { const info = classInfo(row); return info.cohort === cohortFilter && info.majorKey === key; });
  });
  const classOptions = Array.from(new Set(rows.map((row) => classInfo(row)).filter((info) =>
    info.classCode && (!cohortFilter || info.cohort === cohortFilter) && (!majorFilter || info.majorKey === majorFilter),
  ).map((info) => info.classCode))).sort();
  const normalizedQuery = query.trim().toLowerCase();
  const hasStudentFilter = Boolean(normalizedQuery || cohortFilter || majorFilter || classFilter);
  const filtered = rows.filter((row) => {
    if (normalizedQuery && !JSON.stringify(row).toLowerCase().includes(normalizedQuery)) return false;
    if (!isStudentPage) return true;
    const info = classInfo(row);
    return (!cohortFilter || info.cohort === cohortFilter)
      && (!majorFilter || info.majorKey === majorFilter)
      && (!classFilter || info.classCode === classFilter);
  });

  const startEdit = (row: Row) => {
    const next: Record<string, string> = {};
    for (const field of config.fields || []) {
      let value = keyOf(row, field.key);
      if ((isStudentPage || active === "Giảng viên") && ["username", "fullName", "email"].includes(field.key)) value = pick(row, `User.${field.key}`);
      if (field.key === "password") value = "";
      if (field.key.endsWith("Id")) value = keyOf(row, field.key) ?? keyOf(row, field.key.replace(/Id$/, "ID"));
      if (field.type === "date") value = inputDate(value); if (field.type === "datetime-local") value = inputDate(value, true);
      next[field.key] = value == null ? "" : String(value);
    }
    setEditing(row); setForm(next); setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildBody = () => {
    const body: Row = {};
    for (const [key, value] of Object.entries(form)) {
      if (["dayOfWeek", "session", "startTime", "endTime"].includes(key) && active === "Lớp học") continue;
      body[key] = numericKeys.has(key) ? (value === "" ? 0 : Number(value)) : value;
    }
    if (active === "Lớp học" && form.dayOfWeek && form.session) body.schedules = [{ dayOfWeek: form.dayOfWeek, session: form.session, startTime: form.startTime || "", endTime: form.endTime || "" }];
    return body;
  };

  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (hasCourseField && !formMetadata.courses.some(course => String(idOf(course)) === form.courseId)) { setError("Vui lòng chọn môn học thuộc ngành của lớp."); return; } setSaving(true); setError(""); try { const id = editing ? idOf(editing) : 0; const method = editing ? "PUT" : "POST"; const path = editing ? `${config.endpoint}/${id}` : config.endpoint; const payload = await apiRequest(token, path, { method, body: JSON.stringify(buildBody()) }); onToast(payload.message || "Đã lưu thành công"); setForm({}); setEditing(null); setFormOpen(false); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Không thể lưu dữ liệu"); } finally { setSaving(false); } };
  const remove = async (row: Row) => { if (!confirm(isStudentPage ? `Xóa sinh viên ${display(keyOf(row, "StudentCode"))} và tài khoản đăng nhập?` : "Bạn chắc chắn muốn xóa mục này?")) return; try { const payload = await apiRequest(token, `${config.endpoint}/${idOf(row)}`, { method: "DELETE" }); onToast(payload.message || "Đã xóa"); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Không thể xóa"); } };

  const openStudents = async (row: Row) => {
    setClassAction({ row, kind: "students" }); setStudentIds([]); setError("");
    try { const payload = await apiRequest(token, "/students"); setAllStudents(payload.data || []); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được sinh viên"); }
  };

  const openSchedule = (row: Row) => {
    const assignedTeacherId = String(keyOf(row, "TeacherID") || pick(row, "Teacher.ID") || "");
    const assignedRoomId = String(keyOf(row, "RoomID") || pick(row, "Room.ID") || "");
    setScheduleDraft({ ...emptyScheduleDraft, teacherId: assignedTeacherId, roomId: assignedRoomId });
    setClassAction({ row, kind: "schedule" });
    setError("");
  };

  const submitClassAction = async (event: React.FormEvent) => {
    event.preventDefault(); if (!classAction) return;
    if (saving) return;
    setSaving(true);
    try {
      const id = idOf(classAction.row);
      if (classAction.kind === "schedule") {
        if (!scheduleDraft.semesterId || !scheduleDraft.courseId || !scheduleDraft.teacherId || !scheduleDraft.roomId || (!scheduleDraft.teachingDate && !scheduleDraft.teachingDates.length) || !scheduleDraft.startTime || !scheduleDraft.endTime) {
          setError("Vui lòng chọn đầy đủ môn, giảng viên, phòng, ngày và thời gian dạy");
          return;
        }
        const teachingDates = Array.from(new Set([...scheduleDraft.teachingDates, scheduleDraft.teachingDate].filter(Boolean))).sort();
        if (teachingDates.some(date => date < schoolToday())) { setError("Không được chọn ngày dạy trong quá khứ."); return; }
        const semesterStart = String(keyOf(selectedSemester, "StartDate") || "").slice(0, 10);
        const semesterEnd = String(keyOf(selectedSemester, "EndDate") || "").slice(0, 10);
        if (teachingDates.some(date => (semesterStart && date < semesterStart) || (semesterEnd && date > semesterEnd))) {
          setError(`Ngày dạy phải nằm trong học kỳ${semesterStart && semesterEnd ? ` (${semesterStart} đến ${semesterEnd})` : ""}`);
          return;
        }
        if (scheduleDraft.startTime >= scheduleDraft.endTime) {
          setError("Giờ kết thúc phải sau giờ bắt đầu");
          return;
        }
        const payload = await apiRequest(token, `/classes/${id}/course-offerings`, {
          method: "POST",
          body: JSON.stringify({
            semesterId: Number(scheduleDraft.semesterId),
            courseId: Number(scheduleDraft.courseId),
            teacherId: Number(scheduleDraft.teacherId),
            roomId: Number(scheduleDraft.roomId),
            teachingDates,
            session: scheduleDraft.session,
            startTime: scheduleDraft.startTime,
            endTime: scheduleDraft.endTime,
          }),
        });
        onToast(payload.message || "Đã phân công môn và lịch dạy");
      } else if (classAction.kind === "students") {
        const payload = await apiRequest(token, `/classes/${id}/students`, { method: "POST", body: JSON.stringify({ studentIds }) });
        onToast(payload.message || "Đã xếp sinh viên vào lớp");
      } else {
        if (!teacherId) return;
        const path = classAction.kind === "assign" ? `/classes/${id}/assign-teacher` : "/class-offers";
        const method = classAction.kind === "assign" ? "PUT" : "POST";
        const body = classAction.kind === "assign" ? { teacherId: Number(teacherId), note } : { classId: id, teacherId: Number(teacherId), message: note };
        const payload = await apiRequest(token, path, { method, body: JSON.stringify(body) }); onToast(payload.message || "Đã xử lý");
      }
      setClassAction(null); setTeacherId(""); setStudentIds([]); setNote(""); setScheduleDraft(emptyScheduleDraft); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể xử lý"); } finally { setSaving(false); }
  };

  const selectedSemester = metadata.semesters.find(row => String(idOf(row)) === scheduleDraft.semesterId) || {};
  const selectedClassCourses = coursesForClass(metadata.courses, classAction?.kind === "schedule" ? classAction.row : undefined);
  const selectedFormClass = metadata.classes.find(row => String(idOf(row)) === form.classId);
  const hasCourseField = Boolean(config.fields?.some(field => field.optionKey === "courses"));
  const formMetadata = hasCourseField ? { ...metadata, courses: coursesForClass(metadata.courses, selectedFormClass) } : metadata;
  const changeFormField = (key: string, value: string) => setForm(current => changeDependentField(current, key, value));


  return <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">Quản lý đào tạo</p><h1>{config.title}</h1><p>{config.desc}</p></div><div className="form-actions">{config.canImport && <FileImport token={token} kind={active === "Sinh viên" ? "students" : "teachers"} onToast={onToast} onDone={load} />}{config.fields && <button className="primary-button" onClick={() => { setEditing(null); setForm({}); setFormOpen(!formOpen); }}><Icon name={formOpen ? "close" : "plus"} size={16} />{formOpen ? "Đóng form" : config.createLabel}</button>}</div></div>
    {formOpen && config.fields && <form className="feature-form" onSubmit={submit}><header className="form-section-heading"><h2>{editing ? "Chỉnh sửa thông tin" : config.createLabel}</h2><p>Các trường có dấu <span className="field-required">*</span> là bắt buộc.</p></header><div className="form-grid">{config.fields.map((field) => <FormField key={field.key} field={editing && field.key === "password" ? { ...field, placeholder: "Để trống để giữ mật khẩu hiện tại" } : field} value={form[field.key] || ""} metadata={formMetadata} disabled={field.optionKey === "courses" && !form.classId} onChange={(value) => changeFormField(field.key, value)} />)}</div>{hasCourseField && <p className="filter-summary">{!form.classId ? "Chọn lớp trước để xem môn học thuộc ngành của lớp." : formMetadata.courses.length === 0 ? "Lớp chưa có ngành hoặc ngành chưa có môn học. Vui lòng kiểm tra thông tin lớp và môn học." : "Danh sách môn học chỉ gồm các môn thuộc ngành của lớp đã chọn."}</p>}<div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? "Đang lưu..." : editing ? "Cập nhật" : "Lưu dữ liệu"}</button>{editing && <button type="button" className="refresh-button" onClick={() => { setEditing(null); setForm({}); }}>Hủy sửa</button>}</div></form>}
    {classAction?.kind === "schedule" && <div className="schedule-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setClassAction(null); setScheduleDraft(emptyScheduleDraft); setError(""); } }}>
      <form className="schedule-modal" onSubmit={submitClassAction}>
        <header className="schedule-modal-header">
          <div className="schedule-modal-icon"><Icon name="calendar" size={21} /></div>
          <div><p className="eyebrow">Thiết lập học phần</p><h2>Phân công môn và lịch dạy</h2><p>Thêm ngày dạy cụ thể cho lớp <strong>{display(keyOf(classAction.row, "ClassCode"))}</strong>.</p></div>
          <button type="button" className="schedule-modal-close" aria-label="Đóng" onClick={() => { setClassAction(null); setScheduleDraft(emptyScheduleDraft); setError(""); }}><Icon name="close" size={18} /></button>
        </header>

        <div className="schedule-class-summary">
          <span><small>Lớp học</small><strong>{display(keyOf(classAction.row, "ClassCode"))}</strong></span>
          <span><small>Chuyên ngành</small><strong>{display(pick(classAction.row, "Major.Name"))}</strong></span>
          <span><small>Học kỳ</small><strong>{display(keyOf(selectedSemester, "Name"))}</strong></span>
        </div>

        <div className="schedule-modal-body">
{error && <div className="feature-error" role="alert">{error}</div>}
          <section>
            <h3><span>1</span> Thông tin giảng dạy</h3>
            <div className="schedule-form-grid">
              <label className="schedule-field schedule-field-wide"><span>Học kỳ *</span><select required value={scheduleDraft.semesterId} onChange={e => setScheduleDraft({ ...scheduleDraft, semesterId: e.target.value, teachingDate: "", teachingDates: [] })}><option value="">Chọn học kỳ</option>{metadata.semesters.filter(row => keyOf(row,"Status") !== "closed").map(row => <option key={idOf(row)} value={idOf(row)}>{display(keyOf(row,"Name"))} · {String(keyOf(row,"StartDate")).slice(0,10)} → {String(keyOf(row,"EndDate")).slice(0,10)}</option>)}</select><small>Chọn học kỳ bao gồm ngày dạy. Nếu ngày dạy nằm ngoài học kỳ, hệ thống sẽ báo rõ khi lưu.</small></label>
              <label className="schedule-field schedule-field-wide"><span>Môn học <b>*</b></span><select required value={scheduleDraft.courseId} onChange={(e) => setScheduleDraft({ ...scheduleDraft, courseId: e.target.value })}><option value="">-- Chọn môn học --</option>{selectedClassCourses.map((row) => <option key={idOf(row)} value={idOf(row)}>{display(keyOf(row, "Code"))} · {display(keyOf(row, "Name"))}</option>)}</select>{selectedClassCourses.length === 0 && <small className="field-warning">Không có môn thuộc chuyên ngành của lớp. Hãy tạo môn ở mục Môn học.</small>}</label>
              <label className="schedule-field"><span>Giảng viên dạy môn *</span><select required value={scheduleDraft.teacherId} onChange={e => setScheduleDraft({ ...scheduleDraft, teacherId: e.target.value })}><option value="">Chọn giảng viên</option>{metadata.teachers.map((row) => <option key={idOf(row)} value={idOf(row)}>{display(keyOf(row, "TeacherCode"))} · {display(pick(row, "User.FullName"))}</option>)}</select></label>
              <label className="schedule-field"><span>Phòng học <b>*</b></span><select required value={scheduleDraft.roomId} onChange={(e) => setScheduleDraft({ ...scheduleDraft, roomId: e.target.value })}><option value="">-- Chọn phòng --</option>{metadata.rooms.map((row) => <option key={idOf(row)} value={idOf(row)}>{display(keyOf(row, "Name"))}{keyOf(row, "Building") ? ` · ${display(keyOf(row, "Building"))}` : ""}</option>)}</select></label>
            </div>
          </section>

          <section>
            <h3><span>2</span> Ngày và thời gian</h3>
            {scheduleLookupError && <p className="field-warning">{scheduleLookupError}</p>}
            {savedSchedules.length > 0 && <div className="schedule-repeat-note"><div><strong>Lịch đã lưu của học phần</strong>{savedSchedules.map(row => {
              const date = String(keyOf(row,"FullDate") || "").slice(0,10);
              return <p key={idOf(row)}>{date || `Hằng tuần: ${String(keyOf(row,"DayOfWeek"))}`} · {String(keyOf(row,"StartTime"))}–{String(keyOf(row,"EndTime"))} {date && <button type="button" className="refresh-button" disabled={date < schoolToday()} onClick={() => setScheduleDraft({...scheduleDraft, customTime: false, teachingDate: date, teachingDates: [], startTime: String(keyOf(row,"StartTime")).slice(0,5), endTime: String(keyOf(row,"EndTime")).slice(0,5), session: String(keyOf(row,"Session") || "")})}>Sửa ngày này</button>}</p>;
            })}</div></div>}
            <div className="schedule-form-grid schedule-time-grid">
              <label className="schedule-field"><span>Ngày dạy <b>*</b></span><input type="date" required={!scheduleDraft.teachingDates.length} min={schoolToday()} onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch { /* Manual date entry remains available. */ } }} value={scheduleDraft.teachingDate} onChange={(e) => setScheduleDraft({ ...scheduleDraft, teachingDate: e.target.value })} />{scheduleDraft.teachingDate && <small>{vietnameseDayFromDate(scheduleDraft.teachingDate)} · chỉ dạy vào ngày đã chọn</small>}</label>
              <label className="schedule-field"><span>Ca học</span><select value={scheduleDraft.session} onChange={(e) => setScheduleDraft({ ...scheduleDraft, session: e.target.value, ...teachingSessions[e.target.value], customTime: false })}><option value="Sáng">Sáng · 07:30–11:30</option><option value="Chiều">Trưa/Chiều · 13:30–16:30</option><option value="Tối">Tối · 18:00–21:00</option></select></label>
              <label className="schedule-field"><span>Giờ bắt đầu <b>*</b></span><input type="time" required readOnly={!scheduleDraft.customTime} value={scheduleDraft.startTime} onChange={(e) => setScheduleDraft({ ...scheduleDraft, startTime: e.target.value })} /></label>
              <label className="schedule-field"><span>Giờ kết thúc <b>*</b></span><input type="time" required readOnly={!scheduleDraft.customTime} value={scheduleDraft.endTime} onChange={(e) => setScheduleDraft({ ...scheduleDraft, endTime: e.target.value })} /></label>
            </div>
            <button type="button" className="refresh-button" aria-pressed={scheduleDraft.customTime} onClick={() => setScheduleDraft(draft => ({ ...draft, customTime: !draft.customTime, ...(!draft.customTime ? {} : teachingSessions[draft.session] || teachingSessions["Sáng"]) }))}>{scheduleDraft.customTime ? "Dùng giờ cố định" : "Tùy chỉnh thời gian"}</button>
            <div className="schedule-repeat-note"><Icon name="refresh" size={16} /><div><strong>Chọn nhiều ngày dạy</strong><p>Các ngày dùng chung ca và giờ học. Có thể chọn hôm nay trong học kỳ. Lưu lại cùng ngày sẽ cập nhật giờ; các ngày khác đã lưu được giữ lại.</p>
<button type="button" className="refresh-button" disabled={!scheduleDraft.teachingDate || scheduleDraft.teachingDate < schoolToday()} onClick={() => setScheduleDraft({ ...scheduleDraft, teachingDates: Array.from(new Set([...scheduleDraft.teachingDates, scheduleDraft.teachingDate])).sort(), teachingDate: "" })}>Thêm ngày</button>
{scheduleDraft.teachingDates.map(date => <div key={date}>{date} · {vietnameseDayFromDate(date)} <button type="button" onClick={() => setScheduleDraft({ ...scheduleDraft, teachingDates: scheduleDraft.teachingDates.filter(value => value !== date) })}>Bỏ ngày</button></div>)}</div></div>
          </section>
        </div>

        <footer className="schedule-modal-footer"><button type="button" className="refresh-button" onClick={() => { setClassAction(null); setScheduleDraft(emptyScheduleDraft); setError(""); }}>Hủy bỏ</button><button className="primary-button" disabled={saving}><Icon name="check" size={16} />{saving ? "Đang lưu..." : "Lưu lịch dạy"}</button></footer>
      </form>
    </div>}
    {classAction && classAction.kind !== "schedule" && <form className="inline-action-card" onSubmit={submitClassAction}>
      <div className="action-card-heading"><strong>{classAction.kind === "assign" ? "Phân công trực tiếp" : classAction.kind === "offer" ? "Gửi đề xuất lớp" : "Xếp sinh viên vào lớp"}</strong><p>Lớp {display(keyOf(classAction.row, "ClassCode"))}</p></div>
      {classAction.kind === "students" ? <label className="student-picker">Sinh viên<select multiple required value={studentIds.map(String)} onChange={(e) => setStudentIds(Array.from(e.target.selectedOptions, (option) => Number(option.value)))}>{allStudents.map((row) => <option key={idOf(row)} value={idOf(row)}>{display(keyOf(row, "StudentCode"))} · {display(pick(row, "User.FullName"))}</option>)}</select><small>Giữ Ctrl (Windows) hoặc Command (Mac) để chọn nhiều sinh viên.</small></label> : <><label>Giảng viên<select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">Chọn giảng viên</option>{metadata.teachers.map((row) => <option key={idOf(row)} value={idOf(row)}>{display(keyOf(row, "TeacherCode"))} · {display(pick(row, "User.FullName"))}</option>)}</select></label><label>Ghi chú<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nội dung phân công/đề xuất" /></label></>}
      <div className="form-actions"><button type="button" className="refresh-button" onClick={() => setClassAction(null)}>Hủy bỏ</button><button className="primary-button" disabled={saving}>{saving ? "Đang lưu..." : "Xác nhận"}</button></div>
    </form>}
    {error && <div className="feature-error">! {error}<button onClick={load}>Thử lại</button></div>}
    <div className="feature-tools"><label className="feature-search"><Icon name="search" size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Tìm trong ${config.title.toLowerCase()}...`} /></label>{isStudentPage && <><select aria-label="Lọc theo khóa" value={cohortFilter} onChange={(e) => { setCohortFilter(e.target.value); setMajorFilter(""); setClassFilter(""); }}><option value="">Tất cả khóa</option>{cohortOptions.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}</select><select aria-label="Lọc theo ngành" value={majorFilter} onChange={(e) => { setMajorFilter(e.target.value); setClassFilter(""); }}><option value="">Tất cả ngành</option>{majorOptions.map((major) => { const value = String(idOf(major) || keyOf(major, "Code") || ""); return <option key={value} value={value}>{display(keyOf(major, "Code"))} · {display(keyOf(major, "Name"))}</option>; })}</select><select aria-label="Lọc theo lớp" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="">Tất cả lớp</option>{classOptions.map((classCode) => <option key={classCode} value={classCode}>{classCode}</option>)}</select></>}<button className="refresh-button" onClick={load}><Icon name="refresh" size={15} />Làm mới</button></div>
    {isStudentPage && <p className="filter-summary">Đang hiển thị <strong>{filtered.length}</strong> / {rows.length} sinh viên{hasStudentFilter && <> · <button type="button" className="text-link" onClick={() => { setQuery(""); setCohortFilter(""); setMajorFilter(""); setClassFilter(""); }}>Xóa bộ lọc</button></>}</p>}
    <div className="feature-table-wrap"><table><thead><tr>{config.columns.map(([label]) => <th key={label}>{label}</th>)}<th>Thao tác</th></tr></thead><tbody>{loading ? <tr><td colSpan={config.columns.length + 1}>Đang tải dữ liệu...</td></tr> : filtered.length === 0 ? <tr><td colSpan={config.columns.length + 1}>{rows.length === 0 ? "Chưa có dữ liệu." : "Không có kết quả phù hợp với bộ lọc hiện tại."}</td></tr> : filtered.map((row, index) => <tr key={idOf(row) || index}>{config.columns.map(([label, path], col) => <td key={label}>{col === 0 ? <strong>{path.toLowerCase().includes("status") ? statusLabel(pick(row, path)) : display(pick(row, path))}</strong> : path.toLowerCase().includes("status") ? statusLabel(pick(row, path)) : display(pick(row, path))}</td>)}<td><div className="row-actions">{active === "Lớp học" && <><button onClick={() => { setClassAction({ row, kind: "assign" }); setTeacherId(String(keyOf(row, "TeacherID") || "")); }}>Phân công</button><button onClick={() => { setClassAction({ row, kind: "offer" }); setTeacherId(""); }}>Đề xuất</button><button onClick={() => openSchedule(row)}>Môn & lịch</button><button onClick={() => openStudents(row)}>Thêm SV</button></>}{config.canEdit && <button onClick={() => startEdit(row)}>Sửa</button>}{config.canDelete && <button className="danger" onClick={() => remove(row)}>Xóa</button>}</div></td></tr>)}</tbody></table></div>
  </section>;
}
