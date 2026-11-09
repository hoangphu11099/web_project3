"use client";
import { DEFAULT_EXAM_NOTE } from "@/models/exam-note";
import { useErrorFeedback } from "@/components/common/ErrorFeedback";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { apiRequest, display, idOf, inputDate, keyOf, pick, statusLabel } from "@/controllers/api.controller";
import { entityConfigs, numericKeys, type MetadataData, type Row, type ToastHandler } from "@/models/dashboard";
import { coursesForClass, changeDependentField } from "@/controllers/course-options";
import { classStudyStatus } from "@/controllers/class-schedule";
import { classFilterInfo, matchesClassFilters } from "@/controllers/class-filters";
import { FormField } from "@/components/common/FormField";
import { FileImport } from "@/components/common/FileImport";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { StudentEditorDialog } from "./StudentEditorDialog";
import { ClassStudentPicker } from "./ClassStudentPicker";
import { ClassStudyDetails } from "./ClassStudyDetails";
import { TeachingOfferDialog } from "./TeachingOfferPlan";
import { LearningDetail } from "./LearningDetail";
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
export function EntityPage({ active, token, metadata: initialMetadata, onToast }: { active: string; token: string; metadata: MetadataData; onToast: ToastHandler }) {
  const [customExamType, setCustomExamType] = useState(false);
  const [metadata,setMetadata] = useState(initialMetadata);
  useEffect(() => { setMetadata(initialMetadata); }, [initialMetadata]);
  const [studentEditor,setStudentEditor] = useState<{row:Row|null}|null>(null);
  useEffect(()=>{setStudentEditor(null);},[active]);
  const [classDetail, setClassDetail] = useState<Row | null>(null);
  useEffect(() => { setClassDetail(null); }, [active]);
  const [learningRow, setLearningRow] = useState<Row | null>(null);
  useEffect(() => { setLearningRow(null); }, [active]);
  const [statusNow, setStatusNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setStatusNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const config = entityConfigs[active]; const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useErrorFeedback();
  const [query, setQuery] = useState(""); const [formOpen, setFormOpen] = useState(false); const [form, setForm] = useState<Record<string, string>>({}); const [saving, setSaving] = useState(false); const [editing, setEditing] = useState<Row | null>(null);
  const [page, setPage] = useState(1);
  const [roomFilter, setRoomFilter] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("");
  const [creditFilter, setCreditFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  useEffect(() => { setBuildingFilter(""); setCapacityFilter(""); setCreditFilter(""); setActivityFilter(""); }, [active]);
  const [cohortFilter, setCohortFilter] = useState(""); const [majorFilter, setMajorFilter] = useState(""); const [classFilter, setClassFilter] = useState("");
  const [classAction, setClassAction] = useState<{ row: Row; kind: "assign" | "offer" | "students" } | null>(null); const [teacherId, setTeacherId] = useState(""); const [note, setNote] = useState("");

  const load = async () => { setLoading(true); setError(""); try { const payload = await apiRequest(token, config.endpoint); setRows(Array.isArray(payload.data) ? (active === "Lớp học" ? [...payload.data].sort((a, b) => idOf(b) - idOf(a)) : payload.data) : []); } catch (err) { setError(err instanceof Error ? err.message : "Không tải được dữ liệu"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [active, token]);
  useEffect(() => { setRoomFilter(""); setQuery(""); setCohortFilter(""); setMajorFilter(""); setClassFilter(""); setFormOpen(false); setForm({}); setEditing(null); setClassAction(null); setError(""); }, [active]);

  const isClassPage = active === "Lớp học";
  const isStudentPage = active === "Sinh viên";
  const isTeacherPage = active === "Giảng viên";
  const isCoursePage = active === "Môn học";
  const isRoomPage = active === "Phòng học";
  const buildings = Array.from(new Set(rows.map(r => String(keyOf(r,"Building") || "")).filter(Boolean))).sort((a,b) => a.localeCompare(b,"vi"));
  const credits = Array.from(new Set(rows.map(r => Number(keyOf(r,"Credits"))))).filter(Number.isFinite).sort((a,b) => a-b);
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
  const classCohorts = Array.from(new Set(rows.map(row => classFilterInfo(row).cohort))).sort();
  const availableClassMajors = Array.from(new Map(rows.filter(row => matchesClassFilters(row, cohortFilter, "", "")).map(row => {
    const value = classFilterInfo(row).major;
    return [value, { value, label: value === "none" ? "Chưa có chuyên ngành" : String(pick(row, "Major.Name") || keyOf(metadata.majors.find(major => String(idOf(major)) === value), "Name") || `Ngành #${value}`) }];
  })).values()).sort((a, b) => a.label.localeCompare(b.label, "vi"));
  const availableClassRooms = Array.from(new Map(rows.filter(row => matchesClassFilters(row, cohortFilter, majorFilter, "")).map(row => {
    const value = classFilterInfo(row).room;
    return [value, { value, label: value === "none" ? "Chưa có phòng" : String(pick(row, "Room.Name") || keyOf(metadata.rooms.find(room => String(idOf(room)) === value), "Name") || `Phòng #${value}`) }];
  })).values()).sort((a, b) => a.label.localeCompare(b.label, "vi"));
  const normalizedQuery = query.trim().toLowerCase();
  const hasStudentFilter = Boolean(normalizedQuery || cohortFilter || majorFilter || classFilter);
  const filtered = rows.filter((row) => {
    if (normalizedQuery && !JSON.stringify(row).toLowerCase().includes(normalizedQuery)) return false;
    if (isClassPage) return matchesClassFilters(row, cohortFilter, majorFilter, roomFilter);
    if (isTeacherPage) return (!majorFilter || String(keyOf(row,"MajorID") || "none") === majorFilter) && (!creditFilter || String(keyOf(row,"Qualification") || "none") === creditFilter);
    if (isCoursePage || isRoomPage) {
      if (activityFilter && String(keyOf(row,"IsActive")) !== activityFilter) return false;
      if (isCoursePage) return (!majorFilter || String(keyOf(row,"MajorID") || "none") === majorFilter) && (!creditFilter || String(keyOf(row,"Credits")) === creditFilter);
      const capacity = Number(keyOf(row,"Capacity"));
      return (!buildingFilter || String(keyOf(row,"Building") || "none") === buildingFilter) && (!capacityFilter || (capacityFilter === "small" ? capacity < 30 : capacityFilter === "medium" ? capacity >= 30 && capacity <= 50 : capacity > 50));
    }
    if (!isStudentPage) return true;
    const info = classInfo(row);
    return (!cohortFilter || info.cohort === cohortFilter)
      && (!majorFilter || info.majorKey === majorFilter)
      && (!classFilter || info.classCode === classFilter);
  });
  const paginated = true;
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = paginated ? filtered.slice((currentPage - 1) * 20, currentPage * 20) : filtered;
  useEffect(() => { setPage(1); }, [active, query, cohortFilter, majorFilter, classFilter, creditFilter, buildingFilter, capacityFilter, activityFilter, roomFilter]);

  const startEdit = (row: Row) => {
    if (isStudentPage) { setStudentEditor({row}); return; }
    const next: Record<string, string> = {};
    for (const field of config.fields || []) {
      let value = keyOf(row, field.key);
      if ((isStudentPage || active === "Giảng viên") && ["username", "fullName", "email"].includes(field.key)) value = pick(row, `User.${field.key}`);
      if (field.key === "password") value = "";
      if (field.key.endsWith("Id")) value = keyOf(row, field.key) ?? keyOf(row, field.key.replace(/Id$/, "ID"));
      if (field.type === "date") value = inputDate(value); if (field.type === "datetime-local") value = inputDate(value, true);
      next[field.key] = value == null ? "" : String(value);
    }
    setCustomExamType(active === "Lịch thi" && !["Trực tiếp","Online",""].includes(next.examType || "")); setEditing(row); setForm(next); setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildBody = () => {
    const body: Row = {};
    for (const [key, value] of Object.entries(form)) {
      if (["dayOfWeek", "session", "startTime", "endTime"].includes(key) && active === "Lớp học") continue;
      body[key] = key === "isActive" ? value === "true" : numericKeys.has(key) ? (value === "" ? 0 : Number(value)) : value;
    }
    if (active === "Lớp học" && form.dayOfWeek && form.session) body.schedules = [{ dayOfWeek: form.dayOfWeek, session: form.session, startTime: form.startTime || "", endTime: form.endTime || "" }];
    if (active === "Lịch thi") { const session = form.session || "Sáng"; Object.assign(body, {session, ...teachingSessions[session], examType: form.examType || "Trực tiếp"}); }
    if (active === "Chuyên ngành" && !editing) delete body.code;
    return body;
  };

  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (saving || examOptionsLoading) return; if (hasCourseField && !formMetadata.courses.some(course => String(idOf(course)) === form.courseId && !keyOf(course,"disabledReason"))) { setError("Vui lòng chọn môn học thuộc ngành của lớp."); return; } setSaving(true); setError(""); try { const id = editing ? idOf(editing) : 0; const method = editing ? "PUT" : "POST"; const path = editing ? `${config.endpoint}/${id}` : config.endpoint; const payload = await apiRequest(token, path, { method, body: JSON.stringify(buildBody()) }); onToast(payload.message || "Đã lưu thành công", "success"); if (isTeacherPage) { const fresh = await apiRequest(token,"/metadata"); setMetadata(fresh.data); } if (isClassPage && !editing) { setQuery(""); setCohortFilter(""); setMajorFilter(""); setRoomFilter(""); window.scrollTo({ top: 0, behavior: "smooth" }); } setForm({}); setEditing(null); setFormOpen(false); await load(); } catch (err) { const message = err instanceof Error ? err.message : "Không thể lưu dữ liệu"; setError(message); onToast(message, "error"); } finally { setSaving(false); } };
  const remove = async (row: Row) => { if (!confirm(isStudentPage ? `Xóa sinh viên ${display(keyOf(row, "StudentCode"))} và tài khoản đăng nhập?` : "Bạn chắc chắn muốn xóa mục này?")) return; try { const payload = await apiRequest(token, `${config.endpoint}/${idOf(row)}`, { method: "DELETE" }); onToast(payload.message || "Đã xóa"); await load(); } catch (err) { const message = err instanceof Error ? err.message : "Không thể xóa"; setError(message); onToast(message, "error"); } };

  const openStudents = (row: Row) => { setClassAction({ row, kind: "students" }); setError(""); };

  const submitClassAction = async (event: React.FormEvent) => {
    event.preventDefault(); if (!classAction || classAction.kind === "students" || saving || !teacherId) return;
    setSaving(true);
    try {
      const id = idOf(classAction.row);
      const path = classAction.kind === "assign" ? `/classes/${id}/assign-teacher` : "/class-offers";
      const method = classAction.kind === "assign" ? "PUT" : "POST";
      const body = classAction.kind === "assign" ? { teacherId: Number(teacherId), note } : { classId: id, teacherId: Number(teacherId), message: note };
      const payload = await apiRequest(token, path, { method, body: JSON.stringify(body) });
      onToast(payload.message || "Đã xử lý thành công", "success");
      setClassAction(null); setTeacherId(""); setNote(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể xử lý"); } finally { setSaving(false); }
  };

  const [examOfferings,setExamOfferings] = useState<Row[]>([]);
  const [examOptionsLoading,setExamOptionsLoading] = useState(false);
  useEffect(()=>{
    if(active !== "Lịch thi" || !formOpen || !form.classId){setExamOfferings([]);return;}
    const controller=new AbortController();let current=true;setExamOptionsLoading(true);setExamOfferings([]);
    apiRequest(token,`/course-offerings?classId=${form.classId}&summary=true`,{signal:controller.signal}).then(result=>{if(current)setExamOfferings(result.data||[]);}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:"Cannot load class courses");}).finally(()=>{if(current)setExamOptionsLoading(false);});
    return ()=>{current=false;controller.abort();};
  },[active,token,formOpen,form.classId]);
  const selectedFormClass = metadata.classes.find(row => String(idOf(row)) === form.classId);
  const hasCourseField = Boolean(config.fields?.some(field => field.optionKey === "courses"));
  const isExam = active === "Lịch thi";
  const openedCourses = new Set(examOfferings.filter(offering=>!form.semesterId||String(keyOf(offering,"SemesterID"))===form.semesterId).map(offering=>Number(keyOf(offering,"CourseID"))));
  const examDuplicates = rows.filter(row=>idOf(row)!==idOf(editing||{})&&String(keyOf(row,"ClassID"))===form.classId&&String(keyOf(row,"SemesterID"))===form.semesterId);
  const scopedCourses = coursesForClass(metadata.courses, selectedFormClass).filter(course=>!isExam||openedCourses.has(idOf(course))).map(course=>({...course,...(isExam&&examDuplicates.some(exam=>Number(keyOf(exam,"CourseID"))===idOf(course))?{disabledReason:"Đã có lịch thi"}:{})}));
  const examTimes=teachingSessions[form.session||"Sáng"];
  const scopedRooms=metadata.rooms.map(room=>({...room,...(isExam&&form.examDate&&examTimes&&rows.some(exam=>idOf(exam)!==idOf(editing||{})&&Number(keyOf(exam,"RoomID"))===idOf(room)&&String(keyOf(exam,"ExamDate")).slice(0,10)===form.examDate&&String(keyOf(exam,"StartTime")).slice(0,5)<examTimes.endTime&&String(keyOf(exam,"EndTime")).slice(0,5)>examTimes.startTime)?{disabledReason:"Trùng lịch thi"}:{})}));
  const formMetadata = hasCourseField ? { ...metadata, courses: scopedCourses, rooms:scopedRooms } : metadata;
  const changeFormField = (key: string, value: string) => setForm(current => {
    const next = changeDependentField(current, key, value);
    if (active === "Chuyên ngành" && !editing && key === "name") {
      next.code = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "D").toUpperCase().split(/[^A-Z]+/).filter(Boolean).map(word => word[0]).join("").slice(0, 12);
    }
    return next;
  });


  return <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">Quản lý đào tạo</p><h1>{config.title}</h1><p>{config.desc}</p></div><div className="form-actions">{config.canImport && <FileImport token={token} kind={active === "Sinh viên" ? "students" : "teachers"} onToast={onToast} onDone={load} />}{config.fields && <button className="primary-button" onClick={() => { if (isStudentPage) { setStudentEditor({row:null}); return; } setCustomExamType(false); setEditing(null); setForm(active === "Lịch thi" ? {session:"Sáng",examType:"Trực tiếp",note:DEFAULT_EXAM_NOTE} : {}); setFormOpen(!formOpen); }}><Icon name={formOpen ? "close" : "plus"} size={16} />{formOpen ? "Đóng form" : config.createLabel}</button>}</div></div>
    {studentEditor && isStudentPage && <StudentEditorDialog key={studentEditor.row ? idOf(studentEditor.row) : "new-student"} token={token} student={studentEditor.row} metadata={metadata} onClose={()=>setStudentEditor(null)} onSaved={()=>{setStudentEditor(null);void load();}} onToast={onToast}/>}
    {formOpen && !isStudentPage && config.fields && <FeatureDialog className="entity-editor-dialog" title={editing ? "Cập nhật thông tin" : config.createLabel || config.title} description="Kiểm tra thông tin trước khi lưu. Các trường có dấu * là bắt buộc." onClose={() => { if (!saving) { setFormOpen(false); setEditing(null); } }}><form className="feature-form entity-editor-form" onSubmit={submit}><fieldset disabled={saving}><div className="form-grid">{config.fields.filter(field => active !== "Lịch thi" || !["startTime", "endTime"].includes(field.key)).map((field) => <FormField key={field.key} field={active === "Lịch thi" && field.key === "examType" && customExamType ? {...field, options: undefined, placeholder: "Nhập hình thức thi khác"} : editing && field.key === "password" ? { ...field, placeholder: "Để trống để giữ mật khẩu hiện tại" } : field} value={form[field.key] || ""} metadata={formMetadata} disabled={(active === "Chuyên ngành" && field.key === "code") || field.optionKey === "courses" && (!form.classId || (isExam&&examOptionsLoading))} onChange={(value) => changeFormField(field.key, value)} />)}</div>{active === "Lịch thi" && <button type="button" className="refresh-button" onClick={() => { setCustomExamType(value => !value); setForm(current => ({...current, examType: ""})); }}>{customExamType ? "Chọn hình thức có sẵn" : "Tùy chọn · Thêm hình thức thi"}</button>}{hasCourseField && <p className="filter-summary">{!form.classId ? "Chọn lớp trước để xem môn học thuộc ngành của lớp." : formMetadata.courses.length === 0 ? "Lớp chưa có ngành hoặc ngành chưa có môn học. Vui lòng kiểm tra thông tin lớp và môn học." : "Chỉ hiện môn phù hợp với lớp và học kỳ đã chọn. Mục đã có hoặc trùng lịch được làm mờ và không thể chọn."}</p>}</fieldset><div className="form-actions"><button type="button" className="refresh-button" disabled={saving} onClick={() => {setFormOpen(false);setEditing(null);}}>Hủy bỏ</button><button className="primary-button" disabled={saving}>{saving ? "Đang lưu..." : editing ? "Cập nhật" : "Lưu dữ liệu"}</button></div></form></FeatureDialog>}
    {classAction?.kind === "offer" && <TeachingOfferDialog key={idOf(classAction.row)} token={token} metadata={metadata} onToast={onToast} initialClass={classAction.row} onSent={() => { setClassAction(null); load(); }} onClose={() => setClassAction(null)} />}
    {classAction?.kind === "students" && <ClassStudentPicker key={idOf(classAction.row)} token={token} classRow={classAction.row} onClose={() => setClassAction(null)} onAdded={() => { setClassAction(null); void load(); }} onToast={onToast} />}
    {classAction?.kind === "assign" && <form className="inline-action-card" onSubmit={submitClassAction}>
      <div className="action-card-heading"><strong>{classAction.kind === "assign" ? "Phân công phụ trách lớp" : "Xếp sinh viên vào lớp"}</strong><p>Lớp {display(keyOf(classAction.row, "ClassCode"))}</p></div>
      <><label>Giảng viên<select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">Chọn giảng viên</option>{metadata.teachers.filter(row => Number(keyOf(row,"MajorID")) > 0 && Number(keyOf(row,"MajorID")) === Number(keyOf(classAction?.row,"MajorID"))).map((row) => <option key={idOf(row)} value={idOf(row)}>{display(keyOf(row, "TeacherCode"))} · {display(pick(row, "User.FullName"))}</option>)}</select></label><label>Ghi chú<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nội dung phân công/đề xuất" /></label></>
      <div className="form-actions"><button type="button" className="refresh-button" onClick={() => setClassAction(null)}>Hủy bỏ</button><button className="primary-button" disabled={saving}>{saving ? "Đang lưu..." : "Xác nhận"}</button></div>
    </form>}
    {classDetail && <ClassStudyDetails key={idOf(classDetail)} token={token} classRow={classDetail} onUpdated={load} onStudentDetails={student => { setClassDetail(null); setLearningRow(student); }} onClose={() => setClassDetail(null)} />}
    {learningRow && <LearningDetail key={`${active}:${idOf(learningRow)}`} token={token} student={active !== "Lớp của tôi" ? learningRow : undefined} classRow={active === "Lớp của tôi" ? learningRow : undefined} onClose={() => setLearningRow(null)} />}
    {error && <div className="feature-error">! {error}<button onClick={load}>Thử lại</button></div>}
    <div className="feature-tools"><label className="feature-search"><Icon name="search" size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Tìm trong ${config.title.toLowerCase()}...`} /></label>{isStudentPage && <><select aria-label="Lọc theo khóa" value={cohortFilter} onChange={(e) => { setCohortFilter(e.target.value); setMajorFilter(""); setClassFilter(""); }}><option value="">Tất cả khóa</option>{cohortOptions.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}</select><select aria-label="Lọc theo ngành" value={majorFilter} onChange={(e) => { setMajorFilter(e.target.value); setClassFilter(""); }}><option value="">Tất cả ngành</option>{majorOptions.map((major) => { const value = String(idOf(major) || keyOf(major, "Code") || ""); return <option key={value} value={value}>{display(keyOf(major, "Code"))} · {display(keyOf(major, "Name"))}</option>; })}</select><select aria-label="Lọc theo lớp" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="">Tất cả lớp</option>{classOptions.map((classCode) => <option key={classCode} value={classCode}>{classCode}</option>)}</select></>}{isClassPage && <>
      <select aria-label="Lọc lớp theo khóa" value={cohortFilter} onChange={e => { setCohortFilter(e.target.value); setMajorFilter(""); setRoomFilter(""); }}><option value="">Tất cả khóa</option>{classCohorts.map(value => <option key={value} value={value}>{value === "none" ? "Chưa có khóa" : value}</option>)}</select>
      <select aria-label="Lọc lớp theo chuyên ngành" value={majorFilter} onChange={e => { setMajorFilter(e.target.value); setRoomFilter(""); }}><option value="">Tất cả chuyên ngành</option>{availableClassMajors.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <select aria-label="Lọc lớp theo phòng" value={roomFilter} onChange={e => setRoomFilter(e.target.value)}><option value="">Tất cả phòng</option>{availableClassRooms.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
    </>}
    {isTeacherPage && <>
      <select aria-label="Lọc giảng viên theo ngành" value={majorFilter} onChange={e => setMajorFilter(e.target.value)}><option value="">Tất cả ngành dạy</option><option value="none">Chưa có ngành dạy</option>{metadata.majors.map(m => <option key={idOf(m)} value={idOf(m)}>{display(keyOf(m,"Name"))}</option>)}</select>
      <select aria-label="Lọc theo trình độ" value={creditFilter} onChange={e => setCreditFilter(e.target.value)}><option value="">Tất cả trình độ</option><option value="none">Chưa có trình độ</option>{Array.from(new Set(rows.map(r => String(keyOf(r,"Qualification") || "")).filter(Boolean))).sort().map(q => <option key={q} value={q}>{q}</option>)}</select>
    </>}
    {isCoursePage && <>
      <select aria-label="Lọc môn theo ngành" value={majorFilter} onChange={e => setMajorFilter(e.target.value)}><option value="">Tất cả ngành</option><option value="none">Chưa có ngành</option>{metadata.majors.map(m => <option key={idOf(m)} value={idOf(m)}>{display(keyOf(m,"Name"))}</option>)}</select>
      <select aria-label="Lọc theo tín chỉ" value={creditFilter} onChange={e => setCreditFilter(e.target.value)}><option value="">Tất cả tín chỉ</option>{credits.map(c => <option key={c} value={c}>{c} tín chỉ</option>)}</select>
    </>}
    {isRoomPage && <>
      <select aria-label="Lọc theo tòa nhà" value={buildingFilter} onChange={e => setBuildingFilter(e.target.value)}><option value="">Tất cả tòa nhà</option><option value="none">Chưa có tòa nhà</option>{buildings.map(b => <option key={b} value={b}>{b}</option>)}</select>
      <select aria-label="Lọc theo sức chứa" value={capacityFilter} onChange={e => setCapacityFilter(e.target.value)}><option value="">Tất cả sức chứa</option><option value="small">Dưới 30 chỗ</option><option value="medium">30–50 chỗ</option><option value="large">Trên 50 chỗ</option></select>
    </>}
    {(isCoursePage || isRoomPage) && <select aria-label="Lọc theo hoạt động" value={activityFilter} onChange={e => setActivityFilter(e.target.value)}><option value="">Tất cả trạng thái</option><option value="true">Hoạt động</option><option value="false">Ngừng hoạt động</option></select>}
    <button className="refresh-button" onClick={load}><Icon name="refresh" size={15} />Làm mới</button></div>
    {(isCoursePage || isRoomPage || isTeacherPage) && <p className="filter-summary">Tìm thấy <strong>{filtered.length}</strong> / {rows.length} {config.title.toLowerCase()}{(query || majorFilter || creditFilter || buildingFilter || capacityFilter || activityFilter) && <> · <button type="button" className="text-link" onClick={() => { setQuery(""); setMajorFilter(""); setCreditFilter(""); setBuildingFilter(""); setCapacityFilter(""); setActivityFilter(""); }}>Xóa bộ lọc</button></>}</p>}
    {isClassPage && <p className="filter-summary">Tìm thấy <strong>{filtered.length}</strong> / {rows.length} lớp học{(query || cohortFilter || majorFilter || roomFilter) && <> · <button type="button" className="text-link" onClick={() => { setQuery(""); setCohortFilter(""); setMajorFilter(""); setRoomFilter(""); }}>Xóa bộ lọc</button></>}</p>}
    {isStudentPage && <p className="filter-summary">Tìm thấy <strong>{filtered.length}</strong> / {rows.length} sinh viên{hasStudentFilter && <> · <button type="button" className="text-link" onClick={() => { setQuery(""); setCohortFilter(""); setMajorFilter(""); setClassFilter(""); }}>Xóa bộ lọc</button></>}</p>}
    <div className="feature-table-wrap"><table><thead><tr>{config.columns.map(([label]) => <th key={label}>{label}</th>)}<th>Thao tác</th></tr></thead><tbody>{loading ? <tr><td colSpan={config.columns.length + 1}>Đang tải dữ liệu...</td></tr> : filtered.length === 0 ? <tr><td colSpan={config.columns.length + 1}>{rows.length === 0 ? "Chưa có dữ liệu." : "Không có kết quả phù hợp với bộ lọc hiện tại."}</td></tr> : visibleRows.map((row, index) => <tr key={idOf(row) || index}>{config.columns.map(([label, path], col) => <td key={label}>{col === 0 ? <strong>{path.toLowerCase().includes("status") ? statusLabel(active === "Lớp học" && path === "Status" ? classStudyStatus(row, (keyOf(row,"CourseOfferings") || []) as Row[], statusNow) : pick(row, path)) : display(pick(row, path))}</strong> : path.toLowerCase().includes("status") ? statusLabel(active === "Lớp học" && path === "Status" ? classStudyStatus(row, (keyOf(row,"CourseOfferings") || []) as Row[], statusNow) : pick(row, path)) : active === "Chuyên ngành" && path === "IsActive" ? (keyOf(row,"IsActive") ? "Đang đào tạo" : "Ngừng đào tạo") : display(pick(row, path))}</td>)}<td><div className="row-actions">{(isStudentPage || active === "Lớp của tôi") && <button onClick={() => { setLearningRow(row); }}>{isStudentPage ? "Chi tiết học tập" : "Sinh viên & chuyên cần"}</button>}{active === "Lớp học" && <><button onClick={() => setClassDetail(row)}>Chi tiết lớp</button><button onClick={() => openStudents(row)}>Thêm SV</button></>}{config.canEdit && <button onClick={() => startEdit(row)}>Sửa</button>}{config.canDelete && <button className="danger" onClick={() => remove(row)}>Xóa</button>}</div></td></tr>)}</tbody></table></div>
    {paginated && !loading && <nav className="entity-pagination" aria-label="Phân trang danh sách"><span>{filtered.length ? `${(currentPage - 1) * 20 + 1}–${Math.min(currentPage * 20, filtered.length)}` : "0"} / {filtered.length} {config.title.toLowerCase()}</span><button type="button" className="refresh-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trang trước</button><span>Trang {currentPage} / {pageCount}</span><button type="button" className="refresh-button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Trang sau</button></nav>}
  </section>;
}
