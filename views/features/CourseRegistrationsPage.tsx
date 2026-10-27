"use client";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import type { MetadataData, ToastHandler } from "@/models/dashboard";
import { type RegistrationOffering, type RegistrationRow, registrationLabels } from "@/models/registrations";
import { FeatureDialog } from "@/components/common/FeatureDialog";

function RegistrationDetails({ row }: { row: RegistrationRow }) {
  const offering = row.CourseOffering;
  return <div><p>Mã đăng ký: #{row.ID}</p><p>Trạng thái: {registrationLabels[row.Status] || row.Status}</p><p>Học kỳ: {offering?.Semester?.Name || "Chưa cập nhật"} · Lớp: {row.Class?.ClassCode || "Chưa cập nhật"}</p><p>Học phí: {row.PaymentConfirmedAt ? `Đã xác nhận ${new Date(row.PaymentConfirmedAt).toLocaleString("vi-VN")}` : "Chưa đối chiếu / xác nhận thu học phí"}</p><p>Giảng viên: {offering?.Teacher?.User?.FullName || "Chưa phân công"} · Phòng: {offering?.Room?.Name || "Chưa xếp"}</p><h3>Lịch học hiện có</h3>{offering?.Schedules?.length ? offering.Schedules.map(lesson => <p key={lesson.ID}>{lesson.FullDate ? new Date(lesson.FullDate.slice(0, 10) + "T12:00:00").toLocaleDateString("vi-VN") : lesson.DayOfWeek} · {lesson.StartTime}–{lesson.EndTime}</p>) : <p>Chưa có lịch học.</p>}{row.Status === "registered" && <p>Đây là dữ liệu đăng ký cũ. Chọn “Xác nhận đã đóng học phí” sau khi đối chiếu với học vụ. Lịch và kết quả học tập đã có được giữ nguyên.</p>}{row.Status === "cancelled" && <p>Đăng ký đã hủy, không thể xác nhận học phí hoặc xếp lịch.</p>}</div>;
}

export function CourseRegistrationsPage({ token, metadata, onToast }: { token: string; metadata: MetadataData; onToast: ToastHandler }) {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [offerings, setOfferings] = useState<RegistrationOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [action, setAction] = useState<{ row: RegistrationRow; kind: "payment" | "schedule" | "detail" }>();
  const [targetID, setTargetID] = useState("");
  const [editSchedule, setEditSchedule] = useState(false);
  const [draft, setDraft] = useState({ teacherId: "", roomId: "", dates: "", startTime: "07:30", endTime: "11:30" });
  const fetchData = useCallback(() => Promise.all([apiRequest(token, "/admin/course-registrations"), apiRequest(token, "/course-offerings")]), [token]);
  const load = useCallback(async () => {
    try { const [list, offers] = await fetchData(); setRows(list.data || []); setOfferings(offers.data || []); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không tải được đăng ký"); }
    finally { setLoading(false); }
  }, [fetchData]);
  useEffect(() => {
    let active = true;
    fetchData().then(([list, offers]) => { if (active) { setRows(list.data || []); setOfferings(offers.data || []); setError(""); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Không tải được đăng ký"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchData]);
  const open = (row: RegistrationRow, kind: "payment" | "schedule" | "detail") => {
    setActionError("");
    const offering = row.CourseOffering;
    setTargetID(String(offering?.ID || "")); setEditSchedule(!offering?.Schedules?.length);
    setDraft({ teacherId: String(offering?.TeacherID || ""), roomId: String(offering?.RoomID || ""), dates: "", startTime: "07:30", endTime: "11:30" });
    setAction({ row, kind });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!action || busy || action.kind === "detail") return;
    setBusy(true);
    setActionError("");
    try {
      const body = action.kind === "payment" ? {} : { courseOfferingId: Number(targetID), ...(editSchedule ? { assignment: { teacherId: Number(draft.teacherId), roomId: Number(draft.roomId), teachingDates: draft.dates.split(/[\s,;]+/).filter(Boolean), startTime: draft.startTime, endTime: draft.endTime, session: "" } } : {}) };
      const result = await apiRequest(token, `/admin/course-registrations/${action.row.ID}/${action.kind === "payment" ? "confirm-payment" : "schedule"}`, { method: "PUT", body: JSON.stringify(body) });
      if (result.data?.Status) {
        setRows(current => current.map(row => row.ID === action.row.ID ? { ...row, Status: result.data.Status, PaymentConfirmedAt: result.data.PaymentConfirmedAt } : row));
      }
      onToast(result.message); setAction(undefined); await load();
    } catch (reason) { const message = reason instanceof Error ? reason.message : "Không lưu được đăng ký"; setActionError(message); onToast(message, "error"); }
    finally { setBusy(false); }
  };
  const target = offerings.find(offering => offering.ID === Number(targetID));
  const eligible = offerings.filter(offering => offering.CourseID === action?.row.CourseID && offering.SemesterID === action?.row.CourseOffering?.SemesterID);
  const visible = rows.filter(row => (!status || row.Status === status) && `${row.Student?.StudentCode} ${row.Student?.User?.FullName} ${row.Course?.Name} ${row.Course?.Code} ${row.Class?.ClassCode}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));
  return <section className="feature-page"><div className="feature-heading"><div><h1>Đăng ký học phần</h1><p>Xác nhận học phí trước khi xếp sinh viên vào lịch học chính thức.</p></div><button className="refresh-button" disabled={loading || busy} onClick={() => { setLoading(true); void load(); }}>Làm mới</button></div>
    <div className="feature-tools"><input aria-label="Tìm sinh viên hoặc học phần" placeholder="Mã SV, họ tên, môn học, lớp…" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Trạng thái đăng ký" value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(registrationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span>{rows.filter(row => row.Status === "pending_payment").length} chờ học phí · {rows.filter(row => row.Status === "paid").length} chờ xếp lịch</span></div>
    {error && <p className="feature-error" role="alert">{error}</p>}
    <div className="feature-table-wrap"><table><thead><tr><th>Sinh viên</th><th>Học phần</th><th>Đăng ký / Học phí</th><th>Trạng thái & Lịch học</th><th>Thao tác</th></tr></thead><tbody>{loading ? <tr><td colSpan={5}>Đang tải…</td></tr> : !visible.length ? <tr><td colSpan={5}>Chưa có đăng ký phù hợp.</td></tr> : visible.map(row => <tr key={row.ID}><td><strong>{row.Student?.User?.FullName}</strong><small className="cell-sub">{row.Student?.StudentCode}</small><small className="cell-sub">{row.Student?.Phone || row.Student?.User?.Email}</small></td><td><strong>{row.Course?.Name}</strong><small className="cell-sub">{row.Course?.Code} · {row.Class?.ClassCode}</small><small className="cell-sub">{row.CourseOffering?.Semester?.Name}</small></td><td>{new Date(row.RegisteredAt).toLocaleString("vi-VN")}<small className="cell-sub">{row.PaymentConfirmedAt ? `Đã thu: ${new Date(row.PaymentConfirmedAt).toLocaleString("vi-VN")}` : "Chưa có xác nhận thu học phí"}</small></td><td><strong>{registrationLabels[row.Status] || row.Status}</strong>{row.Status === "scheduled" && <><small className="cell-sub">GV: {row.CourseOffering?.Teacher?.User?.FullName} · Phòng: {row.CourseOffering?.Room?.Name}</small>{row.CourseOffering?.Schedules?.map(lesson => <small key={lesson.ID} className="cell-sub">{lesson.FullDate ? new Date(lesson.FullDate.slice(0, 10) + "T12:00:00").toLocaleDateString("vi-VN") : lesson.DayOfWeek} · {lesson.StartTime}–{lesson.EndTime}</small>)}</>}</td><td><div className="row-actions"><button onClick={() => open(row, "detail")}>Xem chi tiết</button>{(row.Status === "pending_payment" || row.Status === "registered") && <button disabled={busy} onClick={() => open(row, "payment")}>Xác nhận đã đóng học phí</button>}{row.Status === "paid" && <button disabled={busy} onClick={() => open(row, "schedule")}>Xếp lịch</button>}</div></td></tr>)}</tbody></table></div>
    {action && <FeatureDialog title={action.kind === "detail" ? "Chi tiết đăng ký học phần" : action.kind === "payment" ? "Xác nhận học phí" : "Xếp lịch học phần"} onClose={() => { if (!busy) setAction(undefined); }}><form className="inline-action-card registration-action-form" onSubmit={submit} aria-busy={busy}><p><strong>{action.row.Student?.User?.FullName} · {action.row.Student?.StudentCode}</strong><br />{action.row.Course?.Name}</p>{action.kind === "detail" ? <RegistrationDetails row={action.row} /> : action.kind === "payment" ? <p>Chỉ xác nhận sau khi học vụ đã kiểm tra sinh viên đóng học phí cho học phần này. Thao tác ghi nhận người xác nhận và thời gian thu. Nếu đăng ký cũ đã có lịch và kết quả học tập, dữ liệu hiện có được giữ nguyên; nếu chưa có lịch thì chuyển sang chờ xếp lịch.</p> : <>
      <label>Học phần / Lớp<select required value={targetID} onChange={event => { const offering = offerings.find(item => item.ID === Number(event.target.value)); setTargetID(event.target.value); setEditSchedule(!offering?.Schedules?.length); setDraft(current => ({ ...current, teacherId: String(offering?.TeacherID || ""), roomId: String(offering?.RoomID || "") })); }}>{eligible.map(offering => <option value={offering.ID} key={offering.ID}>{offering.Class?.ClassCode} · {offering.Semester?.Name}</option>)}</select></label>
      <p>GV: {target?.Teacher?.User?.FullName || "Chưa phân công"} · Phòng: {target?.Room?.Name || "Chưa xếp"}</p>{target?.Schedules?.map(lesson => <p key={lesson.ID}>{lesson.FullDate?.slice(0, 10) || lesson.DayOfWeek}: {lesson.StartTime}–{lesson.EndTime}</p>)}
      <label><input type="checkbox" checked={editSchedule} onChange={event => setEditSchedule(event.target.checked)} /> Bổ sung lịch, giảng viên và phòng cho học phần</label>
      {editSchedule && <><p>Lịch này dùng chung cho cả lớp học phần. Hệ thống kiểm tra trùng phòng, giảng viên và lịch sinh viên.</p><label>Giảng viên<select required value={draft.teacherId} onChange={event => setDraft(current => ({ ...current, teacherId: event.target.value }))}><option value="">Chọn giảng viên</option>{metadata.teachers.filter(row => Number(row.MajorID) === target?.Class?.MajorID).map(row => <option key={Number(row.ID)} value={Number(row.ID)}>{String((row.User as { FullName?: string })?.FullName || row.TeacherCode)}</option>)}</select></label><label>Phòng<select required value={draft.roomId} onChange={event => setDraft(current => ({ ...current, roomId: event.target.value }))}><option value="">Chọn phòng</option>{metadata.rooms.map(room => <option key={Number(room.ID)} value={Number(room.ID)}>{String(room.Name)}</option>)}</select></label><label>Ngày học (YYYY-MM-DD, phân cách bằng dấu phẩy)<input required placeholder="2026-11-02, 2026-11-04" value={draft.dates} onChange={event => setDraft(current => ({ ...current, dates: event.target.value }))} /></label><label>Bắt đầu<input required type="time" value={draft.startTime} onChange={event => setDraft(current => ({ ...current, startTime: event.target.value }))} /></label><label>Kết thúc<input required type="time" value={draft.endTime} onChange={event => setDraft(current => ({ ...current, endTime: event.target.value }))} /></label></>}
    </>}{actionError && <p className="feature-error" role="alert">{actionError}</p>}{action.kind !== "detail" && <div className="form-actions registration-dialog-actions"><button type="button" className="refresh-button" disabled={busy} onClick={() => setAction(undefined)}>Hủy</button><button type="submit" className="primary-button" disabled={busy || (action.kind === "schedule" && !targetID)}>{busy ? "Đang lưu…" : action.kind === "payment" ? "OK, xác nhận đã thu học phí" : "Lưu và xếp lịch cho sinh viên"}</button></div>}</form></FeatureDialog>}
  </section>;
}
