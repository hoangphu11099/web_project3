"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { useErrorFeedback } from "@/components/common/ErrorFeedback";
import { apiRequest, idOf, keyOf, pick, display } from "@/controllers/api.controller";
import { reportWorkbook } from "@/controllers/report-export";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { MetadataData, Role, ToastHandler } from "@/models/dashboard";
import type { DashboardReport, MonthlyAttendance } from "@/models/report";

type Filters = Record<"academicYearId" | "semesterId" | "majorId" | "cohort" | "classId" | "courseId" | "from" | "to", string>;
type ReportKind = "attendance" | "grades" | "teaching" | "risks" | "assignments" | "rooms" | "warnings";
type Cell = string | number | null;
const emptyFilters: Filters = { academicYearId: "", semesterId: "", majorId: "", cohort: "", classId: "", courseId: "", from: "", to: "" };
const labels: Record<ReportKind, string> = { attendance: "Chuyên cần", grades: "Kết quả học tập", teaching: "Giảng dạy", risks: "Cần theo dõi", warnings: "Cảnh báo học vụ", assignments: "Phân công", rooms: "Phòng học" };
const number = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
const dateLabel = (value: string) => value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
const attendanceRate = (present: number, late: number, absent: number, excused: number) => { const total = present + late + absent + excused; return total ? `${number((present + late) * 100 / total)}%` : "—"; };

function AttendanceChart({ rows }: { rows: MonthlyAttendance[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!rows.length) return <p className="report-empty">Chưa có phiên điểm danh đã chốt trong phạm vi này.</p>;
  const width = Math.max(650, rows.length * 70), height = 220, pad = 32;
  const x = (index: number) => pad + (width - pad * 2) * (rows.length === 1 ? .5 : index / (rows.length - 1));
  const y = (rate: number) => height - pad - rate * (height - pad * 2) / 100;
  const active = rows.find(row => row.month === selected);
  return <><div className="report-chart-scroll"><svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: width }} className="report-line-chart" role="img" aria-label="Tỷ lệ tham dự theo tháng, tính có mặt cộng đi trễ trên tổng lượt điểm danh đã chốt">
    {[0, 25, 50, 75, 100].map(tick => <g key={tick}><line x1={pad} x2={width - pad} y1={y(tick)} y2={y(tick)} stroke="currentColor" strokeOpacity=".12" strokeDasharray="4 4" /><text x="0" y={y(tick) + 4}>{tick}%</text></g>)}
    <polyline points={rows.map((row, i) => `${x(i)},${y(row.attendanceRate)}`).join(" ")} fill="none" stroke="#3459e6" strokeWidth="3" />
    {rows.map((row, i) => <g key={row.month}><circle cx={x(i)} cy={y(row.attendanceRate)} r="6" fill="#3459e6" stroke="white" strokeWidth="2" tabIndex={0} role="button" aria-label={`${row.month}: tham dự ${row.attendanceRate}%, ${row.total} lượt`} onMouseEnter={() => setSelected(row.month)} onFocus={() => setSelected(row.month)} onClick={() => setSelected(row.month)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(row.month); } }}><title>{`${row.month}: ${row.attendanceRate}% tham dự; ${row.absent} vắng, ${row.excused} có phép`}</title></circle><text x={x(i)} y={height - 8} textAnchor="middle">{row.month.slice(5)}/{row.month.slice(2, 4)}</text></g>)}
  </svg></div><div className="report-chart-caption" aria-live="polite">{active ? <><b>{active.month}</b> · Có mặt {number(active.present)} · Đi trễ {number(active.late)} · Vắng {number(active.absent)} · Có phép {number(active.excused)}</> : "Chọn một điểm trên biểu đồ để xem chi tiết tháng."}</div></>;
}

export function ReportPage({role,token,onToast,metadata}:{role:Role;token:string;onToast:ToastHandler;metadata:MetadataData}) {
  const [selected,setSelected]=useState(0),[query,setQuery]=useState("");
  if(role!=="admin")return <DetailedReport role={role} token={token} onToast={onToast}/>;
  if(selected)return <DetailedReport key={selected} role={role} token={token} onToast={onToast} classID={String(selected)} onBack={()=>setSelected(0)}/>;
  const classes=metadata.classes.filter(row=>`${keyOf(row,"ClassCode")} ${pick(row,"Major.Name")}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));
  return <section className="feature-page report-page"><div className="feature-heading"><div><h1>Báo cáo theo lớp</h1><p>Chọn lớp để xem chuyên cần, kết quả học tập, giảng dạy và các báo cáo liên quan.</p></div></div>
    <div className="feature-tools"><input aria-label="Tìm lớp báo cáo" placeholder="Tìm mã lớp, chuyên ngành…" value={query} onChange={event=>setQuery(event.target.value)}/><span>{classes.length} lớp</span></div>
    <div className="feature-table-wrap"><table><thead><tr><th>Lớp học</th><th>Chuyên ngành</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{classes.map(row=><tr key={idOf(row)}><td><button className="refresh-button" onClick={()=>setSelected(idOf(row))}>{display(keyOf(row,"ClassCode"))}</button></td><td>{display(pick(row,"Major.Name"))}</td><td>{keyOf(row,"Status")==="open"?"Đang mở":"Đã đóng"}</td><td><button className="primary-button" onClick={()=>setSelected(idOf(row))}>Xem báo cáo</button></td></tr>)}{!classes.length&&<tr><td colSpan={4}>Không có lớp phù hợp.</td></tr>}</tbody></table></div>
  </section>;
}

function DetailedReport({ role, token, onToast, classID = "", onBack }: { role: Role; token: string; onToast: ToastHandler; classID?: string; onBack?:()=>void }) {
  const [data, setData] = useState<DashboardReport | null>(null);
  const [filters, setFilters] = useState<Filters>({...emptyFilters,classId:classID}), [applied, setApplied] = useState<Filters>({...emptyFilters,classId:classID});
  const [kind, setKind] = useState<ReportKind>("attendance"), [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0), [error, setError] = useErrorFeedback();
  const admin = role === "admin";
  useEffect(() => {
    let current = true; const controller = new AbortController(); setLoading(true); setError("");
    const params = new URLSearchParams(Object.entries(applied).filter(([, value]) => value));
    apiRequest(token, `/statistical-report?${params}`, { signal: controller.signal }).then(payload => { if (current) setData(payload.data as DashboardReport); }).catch(e => { if (current) { setData(null); setError(e instanceof Error ? e.message : "Không tải được báo cáo"); } }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [token, applied, refresh]);
  const optionSummary = useMemo(() => {
    const mappings = { academicYearId: "academicYears", semesterId: "semesters", majorId: "majors", cohort: "cohorts", classId: "classes", courseId: "courses" } as const;
    return Object.entries(applied).filter(([, value]) => value).map(([key, value]) => key === "from" ? `Từ ${dateLabel(value)}` : key === "to" ? `Đến ${dateLabel(value)}` : data?.options[mappings[key as keyof typeof mappings]]?.find(option => String(option.id) === value)?.name ?? value).join(" · ") || (admin ? "Toàn trường · Tất cả học kỳ" : "Các học phần được phân công · Tất cả học kỳ");
  }, [applied, data]);
  const table = useMemo<{ headers: string[]; rows: Cell[][] }>(() => {
    if (!data) return { headers: [], rows: [] };
    const common = (r: DashboardReport["teaching"][number]) => [r.class, r.course, r.semester];
    if (kind === "attendance") return { headers: ["Lớp", "Môn học", "Học kỳ", "Có mặt", "Đi trễ", "Vắng", "Có phép", "Tỷ lệ tham dự"], rows: data.teaching.map(r => [...common(r), r.present, r.late, r.absent, r.excused, attendanceRate(r.present, r.late, r.absent, r.excused)]) };
    if (kind === "grades") return { headers: ["Lớp", "Môn học", "Học kỳ", "Lượt đăng ký", "Đã duyệt", "Bản nháp", "Điểm TB /100", "Đạt", "Chưa đạt"], rows: data.teaching.map(r => [...common(r), r.students, r.approved, r.draft, r.average, r.passed, r.approved - r.passed]) };
    if (kind === "teaching") return { headers: ["Lớp", "Môn học", "Học kỳ", ...(admin ? ["Giảng viên"] : []), "Phòng", "Số buổi", "Giờ dự kiến", "Buổi đã qua", "Buổi chốt điểm danh", "Buổi đầu", "Buổi cuối"], rows: data.teaching.map(r => [...common(r), ...(admin ? [r.teacher || "Chưa phân công"] : []), r.room, r.lessons, r.hours, r.elapsed, r.confirmed, dateLabel(r.first), dateLabel(r.last)]) };
    if (kind === "risks") return { headers: ["Mã SV", "Sinh viên", "Lớp", "Môn học", "Tỷ lệ vắng", "Lý do"], rows: data.risks.map(r => [r.code, r.student, r.class, r.course, `${number(r.absenceRate)}%`, r.reason]) };
    if (kind === "warnings") return { headers: ["Mã SV", "Sinh viên", "Lớp", "Học kỳ", "GPA", "Môn chưa đạt", "Tín chỉ chưa đạt", "Lý do", "Trạng thái"], rows: (data.academicWarnings ?? []).map(r => [r.code,r.student,r.class,r.semester,r.gpa,r.failedCourses,r.failedCredits,r.reason,r.status === "active" ? "Đang cảnh báo" : r.status === "resolved" ? "Đã xử lý" : r.status]) };
    if (kind === "rooms") return { headers: ["Phòng", "Buổi đã xếp", "Giờ sử dụng theo lịch", "Tình trạng trong phạm vi lọc"], rows: data.rooms.map(r => [r.room, r.lessons, r.hours, r.lessons ? "Đã có lịch" : "Chưa có lịch"]) };
    return { headers: ["Lớp", "Môn học", "Giảng viên", "Buổi đầu", "Nội dung", "Ghi chú"], rows: [
      ...(data.assignments?.pending ?? []).map(r => [r.class, r.course, r.teacher, dateLabel(r.first), "Chờ giảng viên xác nhận", r.urgent ? r.reason : "Chưa có lịch chính thức"]),
      ...(data.assignments?.shortNotice ?? []).map(r => [r.class, r.course, r.teacher, dateLabel(r.first), r.urgent ? "Ngoại lệ dưới 7 ngày" : "Chưa đủ 7 ngày chuẩn bị", r.reason || "Cần kiểm tra thời gian gửi lời mời"]),
      ...(data.assignments?.unassignedClasses ?? []).map(cl => [cl, "—", "—", "—", "Chưa có giảng viên trong phạm vi lọc", "Không đồng nghĩa lớp chưa từng được phân công"]),
      ...(data.assignments?.conflicts ?? []).map(r => [r.first, r.second, "—", dateLabel(r.date), `Trùng ${r.reason.toLowerCase()}`, "Cần điều chỉnh lịch"]),
    ] };
  }, [data, kind, admin]);
  const filteredRows = table.rows.slice((page - 1) * 25, page * 25), pages = Math.max(1, Math.ceil(table.rows.length / 25));
  const exportExcel = () => {
    if (!data || loading) return;
    try {
      const rows: Cell[][] = [["PP ACADEMY – BÁO CÁO " + labels[kind].toLocaleUpperCase("vi-VN")], [optionSummary], ["Phạm vi", admin ? "Quản trị viên" : "Học phần giảng viên được phân công"], ["Tạo lúc", new Date(data.generatedAt).toLocaleString("vi-VN")], table.headers, ...table.rows];
      const bytes = reportWorkbook(rows); const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `PP-Academy-${kind}-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); onToast("Đã xuất báo cáo Excel theo bộ lọc", "success");
    } catch (e) { setError(e instanceof Error ? e.message : "Không xuất được báo cáo"); }
  };
  const printReport = () => {
    if (!data || loading) return;
    const root = document.querySelector(".report-page");
    if (!root) return;
    // Printing a scoped document avoids unrelated dashboard content and includes every row.
    const frame = document.createElement("iframe"); frame.title = "In báo cáo PP Academy"; frame.style.cssText = "position:fixed;width:0;height:0;border:0"; document.body.appendChild(frame);
    const doc = frame.contentDocument, win = frame.contentWindow; if (!doc || !win) { frame.remove(); return; }
    const escape = (value: Cell) => String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    doc.open(); doc.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>PP Academy – ${labels[kind]}</title><style>@page{size:A4 landscape;margin:12mm}body{font:11px Arial;color:#182642}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd4e0;padding:7px;text-align:left;overflow-wrap:anywhere}th{background:#edf1fb}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>PP Academy – ${labels[kind]}</h1><p>${escape(optionSummary)}</p><p>Tạo lúc: ${escape(new Date(data.generatedAt).toLocaleString("vi-VN"))} · ${table.rows.length} dòng · ${admin ? "Báo cáo quản trị" : "Học phần giảng viên được phân công"}</p><table><thead><tr>${table.headers.map(h => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${table.rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`); doc.close();
    win.addEventListener("afterprint", () => frame.remove(), { once: true }); setTimeout(() => { win.focus(); win.print(); }, 150);
  };
  const changeFilter = (key: keyof Filters, value: string) => setFilters(old => ({ ...old, [key]: value, ...(key === "academicYearId" ? { semesterId: "" } : {}), ...(key === "majorId" ? { classId: classID, courseId: "" } : {}), ...(key === "cohort" ? { classId: classID, semesterId: "" } : {}) }));
  const optionsFor = (key: keyof DashboardReport["options"]) => (data?.options[key] ?? []).filter(option => {
    if (key === "semesters") return (!filters.academicYearId || String(option.parentId) === filters.academicYearId) && (!filters.cohort || option.name.endsWith(`K${Number(filters.cohort) % 100}`));
    if (key === "classes") return (!filters.majorId || String(option.parentId) === filters.majorId) && (!filters.cohort || String(option.cohort) === filters.cohort);
    if (key === "courses") return !filters.majorId || String(option.parentId) === filters.majorId;
    return true;
  });
  const cards: { label: string; value: Cell; icon: IconName; note?: string }[] = !data ? [] : admin ? [
    { label: "Sinh viên", value: data.totalStudents, icon: "students", note: "Sinh viên riêng biệt" }, { label: "Giảng viên", value: data.totalTeachers, icon: "teacher" }, { label: "Lớp học", value: data.totalClasses, icon: "class" }, { label: "Môn học", value: data.totalCourses, icon: "course" }, { label: "Đăng ký học phần", value: data.totalEnrollments, icon: "assign", note: "Lượt đăng ký chưa hủy" }, { label: "Cảnh báo học vụ", value: data.totalWarnings, icon: "warning", note: "Hồ sơ đang cảnh báo" },
  ] : [
    { label: "Lớp phụ trách", value: data.totalClasses, icon: "class" }, { label: "Sinh viên", value: data.totalStudents, icon: "students", note: "Không đếm trùng giữa các môn" }, { label: "Môn phụ trách", value: data.totalCourses, icon: "course" }, { label: "Buổi theo kế hoạch", value: data.scheduleSummary.lessons, icon: "calendar" }, { label: "Buổi đã chốt điểm danh", value: data.scheduleSummary.confirmed, icon: "attendance" }, { label: "Điểm TB đã duyệt", value: data.grades.averageScore, icon: "grade", note: "Thang 100 · Không tính bản nháp" },
  ];
  return <section className="feature-page report-page">
    <div className="feature-heading"><div>{onBack&&<button className="refresh-button" onClick={onBack}>← Danh sách lớp</button>}<p className="eyebrow">{admin ? "Quản lý đào tạo" : "Hoạt động giảng dạy"}</p><h1>{admin ? "Báo cáo đào tạo" : "Báo cáo giảng dạy của tôi"}</h1><p>{admin ? "Theo dõi chất lượng học tập, chuyên cần và kế hoạch giảng dạy." : "Chuyên cần, kết quả học tập và tiến độ của các học phần bạn phụ trách."}</p></div><div className="form-actions"><button className="refresh-button" disabled={loading} onClick={() => setRefresh(r => r + 1)}><Icon name="refresh" size={15} />Làm mới</button><button className="refresh-button" disabled={!data || loading} onClick={printReport}><Icon name="exercise" size={15} />In / Lưu PDF</button><button className="primary-button" disabled={!data || loading} onClick={exportExcel}><Icon name="download" size={15} />Xuất Excel</button></div></div>
    <form className="panel report-filter" onSubmit={event => { event.preventDefault(); if (filters.from && filters.to && filters.from > filters.to) { setError("Từ ngày không được lớn hơn đến ngày"); return; } setPage(1); setApplied({ ...filters, ...(classID?{classId:classID}:{}) }); }}>
      <div className="report-section-title"><div><h2>Bộ lọc báo cáo</h2><p>Áp dụng chung cho số liệu, biểu đồ và tệp xuất.</p></div><span className="report-scope-tag">{admin ? "Toàn trường" : "Học phần của tôi"}</span></div>
      <div className="report-filter-grid">{([
        ["academicYearId", "Năm học", "academicYears"], ["cohort", "Khóa", "cohorts"], ["semesterId", "Học kỳ", "semesters"], ["majorId", "Chuyên ngành", "majors"], ["classId", "Lớp học", "classes"], ["courseId", "Môn học", "courses"],
      ] as const).map(([key, label, optionKey]) => <label key={key}>{label}<select disabled={!!classID&&key==="classId"} value={filters[key]} onChange={event => changeFilter(key, event.target.value)}><option value="">Tất cả</option>{optionsFor(optionKey).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}<label>Từ ngày<input type="date" value={filters.from} max={filters.to || undefined} onChange={event => changeFilter("from", event.target.value)} /></label><label>Đến ngày<input type="date" value={filters.to} min={filters.from || undefined} onChange={event => changeFilter("to", event.target.value)} /></label></div>
      <div className="report-filter-actions"><span>Khoảng ngày giới hạn buổi học và điểm danh; điểm số thuộc các học phần có buổi trong khoảng.</span><button type="button" className="refresh-button" onClick={() => { setFilters({...emptyFilters,classId:classID}); setApplied({...emptyFilters,classId:classID}); setPage(1); }}>Đặt lại</button><button className="primary-button" type="submit" disabled={loading}>Áp dụng bộ lọc</button></div>
    </form>
    {error && <div role="alert" className="feature-error">{error}<button className="refresh-button" onClick={() => setRefresh(r => r + 1)}>Thử lại</button></div>}
    <div aria-live="polite" className="report-active-scope"><Icon name="report" size={16} /><span>{loading ? "Đang cập nhật báo cáo…" : optionSummary}</span>{data && !loading && <time>{new Date(data.generatedAt).toLocaleString("vi-VN")}</time>}</div>
    {data && <div className={loading ? "report-content is-loading" : "report-content"} aria-busy={loading}>
      <div className="report-overview-cards">{cards.map(card => <article key={card.label}><span className="report-card-icon"><Icon name={card.icon} /></span><span>{card.label}</span><strong>{typeof card.value === "number" ? number(card.value) : card.value ?? "—"}</strong><small>{card.note || "Trong phạm vi báo cáo"}</small></article>)}</div>
      <div className="report-insights"><section className="panel report-chart-panel"><div className="report-section-title"><div><h2>Chuyên cần theo tháng</h2><p>Tỷ lệ tham dự = (có mặt + đi trễ) / tổng lượt đã chốt.</p></div><span className="report-scope-tag">Điểm danh đã chốt</span></div><AttendanceChart rows={data.attendanceMonthly} /><div className="report-attendance-totals">{([ ["present", "Có mặt"], ["late", "Đi trễ"], ["absent", "Vắng"], ["excused", "Có phép"] ] as const).map(([key, label]) => <span key={key}>{label}<b>{number(data.attendance[key])}</b></span>)}</div></section>
        <section className="panel report-chart-panel"><div className="report-section-title"><div><h2>Phân bố kết quả học tập</h2><p>{number(data.grades.approved)} kết quả đã duyệt · {number(data.grades.draft)} kết quả chưa duyệt.</p></div></div>{data.grades.approved ? <div className="report-bars" role="img" aria-label="Phân bố lượt kết quả học tập đã duyệt">{["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Chưa đạt"].map((label, i) => <div className="report-bar-column" key={label}><b>{number(data.grades.distribution[i] ?? 0)}</b><div className="report-bar-track"><span style={{ height: `${(data.grades.distribution[i] ?? 0) / Math.max(1, ...data.grades.distribution) * 100}%` }} title={`${label}: ${data.grades.distribution[i] ?? 0} kết quả`} /></div><span>{label}</span></div>)}</div> : <p className="report-empty">Chưa có điểm đã duyệt để tổng hợp.</p>}<p className="report-footnote">Thang 100: xuất sắc ≥85, giỏi ≥80, khá ≥65, trung bình ≥40, chưa đạt &lt;40. Đếm theo kết quả môn học, không phải số sinh viên.</p><div className="report-grade-summary"><span>Điểm trung bình <b>{data.grades.averageScore === null ? "—" : number(data.grades.averageScore)}</b></span><span>Đạt <b>{number(data.grades.passed)}</b></span><span>Chưa đạt <b>{number(data.grades.failed)}</b></span></div></section></div>
      <div className="panel report-comparison"><Icon name="calendar" /><div><h2>So sánh học kỳ</h2><p>{data.comparison.available ? `So với ${data.comparison.semester}: ${number(data.comparison.enrollments ?? 0)} lượt đăng ký ở kỳ trước. Kỳ đang chọn ${data.comparison.enrollmentChange! >= 0 ? "tăng" : "giảm"} ${number(Math.abs(data.comparison.enrollmentChange ?? 0))} lượt.${data.comparison.enrollments ? ` (${number((data.comparison.enrollmentChange ?? 0) / data.comparison.enrollments * 100)}%)` : " Chưa có cơ sở tính phần trăm."}` : data.comparison.message}</p><small>So sánh quy mô đăng ký theo cùng bộ lọc và cùng khóa; không suy ra thay đổi chất lượng học tập.</small></div></div>
      <section className="panel report-detail"><div className="report-tabs" role="tablist" aria-label="Loại báo cáo">{(admin ? ["attendance", "grades", "teaching", "risks", "warnings", "assignments", "rooms"] : ["attendance", "grades", "teaching", "risks"]).map(key => <button key={key} role="tab" id={`report-tab-${key}`} aria-controls="report-details-panel" aria-selected={kind === key} onClick={() => { setKind(key as ReportKind); setPage(1); }}>{labels[key as ReportKind]}</button>)}</div><div role="tabpanel" id="report-details-panel" aria-labelledby={`report-tab-${kind}`}>
        <div className="report-section-title"><div><h2>{labels[kind]}</h2><p>{number(table.rows.length)} dòng kết quả · Excel/PDF bao gồm toàn bộ các dòng, không chỉ trang đang xem.</p></div></div>
        {kind === "teaching" && <p className="report-footnote">Buổi đã qua được tính theo thời gian lịch; buổi đã chốt điểm danh mới có xác nhận chuyên cần. Tổng giờ là giờ dự kiến theo lịch.</p>}
        {kind === "risks" && <p className="report-footnote">Gợi ý theo dõi khi vắng quá 25% lượt điểm danh đã chốt (gồm có phép), hoặc điểm môn đã duyệt dưới 40; không thay thế quyết định cảnh báo học vụ.</p>}
        {kind === "rooms" && <p className="report-footnote">Phòng chưa có lịch trong phạm vi lọc không có nghĩa đang trống tại mọi thời điểm.</p>}
        {kind === "assignments" && data.assignments && <div className="report-assignment-summary"><span>Lớp có giảng viên <b>{data.assignments.assignedClasses}</b></span><span>Lớp chưa có giảng viên trong bộ lọc <b>{data.assignments.unassignedClasses.length}</b></span><span>Chờ xác nhận <b>{data.assignments.pending.length}</b></span><span>Trùng lịch <b>{data.assignments.conflicts.length}</b></span></div>}
        <div className="report-table-scroll"><table className="report-table"><thead><tr>{table.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{filteredRows.length ? filteredRows.map((row, i) => <tr key={`${kind}-${page}-${i}`}>{row.map((cell, j) => <td key={j}>{typeof cell === "number" ? number(cell) : cell || "—"}</td>)}</tr>) : <tr><td colSpan={table.headers.length}><p className="report-empty">{kind === "assignments" ? "Không có trường hợp cần xử lý trong phạm vi lọc." : "Không có dữ liệu phù hợp. Hãy thử thay đổi bộ lọc."}</p></td></tr>}</tbody></table></div>
        <div className="report-pagination"><span>Trang {page}/{pages}</span><button className="refresh-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button><button className="refresh-button" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Sau</button></div>
      </div></section>
    </div>}
    {!data && loading && <div className="panel"><p className="report-empty">Đang tổng hợp dữ liệu báo cáo…</p></div>}
  </section>;
}
