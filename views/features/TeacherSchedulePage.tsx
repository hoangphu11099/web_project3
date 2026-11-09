"use client";
import { PaginatedItems } from "@/components/common/Pagination";

import { PaginatedTable } from "@/components/common/Pagination";

import { useErrorFeedback } from "@/components/common/ErrorFeedback";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import {
  nextTeachingLessons,
  offeringLessonDates,
  matchesTeachingSession,
  matchesTeachingWeekday,
  addDays,
  dayLabel,
  formatTeachingDate,
  formatTeachingWeek,
  normalizeTeacherSchedules,
  schedulesForWeek,
  startOfTeachingWeek,
  teachingState,
  teachingStateLabel,
  timeRange,
  todaySchedules,
} from "@/controllers/teaching-schedule.controller";
import type { TeachingSchedule } from "@/models/teaching-schedule";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { Icon } from "@/components/ui/Icon";

export function TeacherSchedulePage({ token, onNavigate }: { token: string; onNavigate: (value: string) => void }) {
  const [detailTab,setDetailTab] = useState<"upcoming"|"ended">("upcoming");
  const [offeringDetail,setOfferingDetail] = useState<number|null>(null);
  const [scheduleTab,setScheduleTab] = useState("upcoming");
  const [weekdayFilter,setWeekdayFilter] = useState("");
  const [sessionFilter,setSessionFilter] = useState("");
  const [rows, setRows] = useState<TeachingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useErrorFeedback();
  const [now, setNow] = useState(() => new Date());
  const [selectedWeek, setSelectedWeek] = useState(() => startOfTeachingWeek(new Date()));

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows(normalizeTeacherSchedules(await apiRequest(token, "/teacher/schedule")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch dạy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const upcomingLessons = useMemo(() => nextTeachingLessons(rows,now),[rows,now]);
  const filteredSchedules = rows.filter(item => matchesTeachingSession(item.session,item.startTime,sessionFilter) && matchesTeachingWeekday(item.teachingDate,item.dayOfWeek,weekdayFilter));
  const nextLesson = upcomingLessons.find(l=>matchesTeachingSession(l.item.session,l.item.startTime,sessionFilter) && matchesTeachingWeekday(l.date,l.item.dayOfWeek,weekdayFilter));
  const activeOfferings = new Set(upcomingLessons.map(l=>l.item.courseOfferingId));
  const displayedRows = filteredSchedules.filter(item => scheduleTab === "upcoming" ? activeOfferings.has(item.courseOfferingId) : !activeOfferings.has(item.courseOfferingId));
  const offeringRows=Array.from(new Map(displayedRows.map(item=>[item.courseOfferingId,item])).values());
  const detailRows=offeringLessonDates(filteredSchedules.filter(item=>item.courseOfferingId===offeringDetail),now);
  const visibleDetails=detailRows.filter(item=>detailTab==="ended"?item.ended:!item.ended);
  const today = todaySchedules(filteredSchedules, now);
  const current = today.filter((item) => teachingState(item, now) === "current");
  const weekItems = schedulesForWeek(filteredSchedules, selectedWeek, now);
  const classCount = new Set(filteredSchedules.map((item) => item.classId)).size;
  const currentWeekStart = startOfTeachingWeek(now);
  const isCurrentWeek = selectedWeek.getTime() === currentWeekStart.getTime();

  const changeWeek = (amount: number) => setSelectedWeek((week) => addDays(week, amount * 7));
  const returnToCurrentWeek = () => setSelectedWeek(startOfTeachingWeek(now));

  return <section className="feature-page">
    <div className="feature-heading">
      <div>
        <p className="eyebrow">Thời khóa biểu giảng viên</p>
        <h1>Lịch dạy</h1>
        <p>Xem ngày dạy cụ thể, lớp, môn học, phòng và giờ dạy theo từng tuần.</p>
      </div>
      <button className="refresh-button" onClick={load}><Icon name="refresh" size={15} />Làm mới</button>
    </div>

    {error && <div className="feature-error">! {error}<button onClick={load}>Thử lại</button></div>}

    <div className="feature-tools"><label>Ca dạy <select value={sessionFilter} onChange={e=>setSessionFilter(e.target.value)}><option value="">Tất cả ca dạy</option><option value="morning">Sáng</option><option value="afternoon">Trưa / Chiều</option><option value="evening">Tối</option></select></label><select aria-label="Lọc theo thứ trong tuần" value={weekdayFilter} onChange={e=>setWeekdayFilter(e.target.value)}><option value="">Tất cả thứ trong tuần</option>{[1,2,3,4,5,6,0].map(day=><option key={day} value={day}>{day===0?"Chủ nhật":`Thứ ${day+1}`}</option>)}</select>{(sessionFilter || weekdayFilter) && <button className="refresh-button" onClick={()=>{setSessionFilter("");setWeekdayFilter("");}}>Xóa bộ lọc</button>}</div>
    {(sessionFilter || weekdayFilter) && <p className="filter-summary">Đang hiển thị lịch theo bộ lọc đã chọn.</p>}
    <div className="schedule-summary-grid">
      <article><span className="blue"><Icon name="class" size={19} /></span><div><small>Lớp được phân công</small><strong>{classCount}</strong></div></article>
      <article><span className="violet"><Icon name="calendar" size={19} /></span><div><small>Buổi trong tuần xem</small><strong>{weekItems.length}</strong></div></article>
      <article><span className="green"><Icon name="attendance" size={19} /></span><div><small>Lịch hôm nay</small><strong>{today.length}</strong></div></article>
      <article><span className="orange"><Icon name="warning" size={19} /></span><div><small>Đang dạy</small><strong>{current.length}</strong></div></article>
    </div>

    <section className="panel teaching-today">
      <div className="teaching-section-heading">
        <div><h2>Lịch dạy hôm nay</h2><p>{formatTeachingDate(now)}</p></div>
        {current.length > 0 && <button className="primary-button" onClick={() => onNavigate("Điểm danh")}><Icon name="attendance" size={15} />Mở điểm danh</button>}
      </div>
      {loading
        ? <p className="empty-note">Đang tải lịch dạy...</p>
        : today.length === 0
          ? <p className="empty-note">Hôm nay không có lịch dạy phù hợp bộ lọc.</p>
          : <div className="teaching-card-list">{(<PaginatedItems>{today.map((item) => <ScheduleCard key={item.id} item={item} now={now} onAttendance={() => onNavigate("Điểm danh")} />)}</PaginatedItems>)}</div>}
    </section>

    {!loading && !error && <section className="panel teaching-next"><div className="teaching-section-heading"><div><h2>Buổi dạy tiếp theo</h2><p>{!today.length?"Hôm nay không có lịch dạy phù hợp bộ lọc.":"Theo dõi buổi dạy gần nhất của bạn."}</p></div></div>{nextLesson ? <><strong>{formatTeachingDate(new Date(`${nextLesson.date}T12:00:00+07:00`))}</strong><dl className="offer-plan-summary"><div><dt>Lớp</dt><dd>{nextLesson.item.classCode}</dd></div><div><dt>Môn học</dt><dd>{nextLesson.item.courseName}</dd></div><div><dt>Phòng</dt><dd>{nextLesson.item.roomName || "Chưa xếp phòng"} · {nextLesson.item.building}</dd></div><div><dt>Thời gian</dt><dd>{timeRange(nextLesson.item)} · {nextLesson.item.session}</dd></div></dl></> : <p>Chưa có buổi dạy tiếp theo được xếp lịch.</p>}</section>}

    <section className="panel weekly-schedule teaching-today">
      <div className="teaching-section-heading">
        <div>
          <h2>Lịch dạy theo ngày</h2>
          <p>Tuần {formatTeachingWeek(selectedWeek)}{isCurrentWeek ? " · Tuần hiện tại" : ""}</p>
        </div>
        <div className="form-actions">
          <button type="button" className="refresh-button" onClick={() => changeWeek(-1)}><Icon name="arrowLeft" size={16} /> Tuần trước</button>
          {!isCurrentWeek && <button type="button" className="refresh-button" onClick={returnToCurrentWeek}>Tuần này</button>}
          <button type="button" className="refresh-button" onClick={() => changeWeek(1)}>Tuần sau <Icon name="arrowRight" size={16} /></button>
        </div>
      </div>

      <div className="feature-table-wrap">
        <PaginatedTable>
          <thead><tr><th>Ngày dạy</th><th>Thời gian</th><th>Lớp</th><th>Môn học</th><th>Phòng</th><th>Học kỳ</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7}>Đang tải dữ liệu...</td></tr>
              : weekItems.length === 0
                ? <tr><td colSpan={7}>Không có buổi dạy nào trong tuần này hoặc tuần nằm ngoài thời gian học kỳ.</td></tr>
                : weekItems.map(({ item, date, state }) => <tr key={`${item.id}-${date.getTime()}`}>
                    <td><strong>{formatTeachingDate(date)}</strong></td>
                    <td>{timeRange(item)}<small className="table-sub">{item.session}</small></td>
                    <td><strong>{item.classCode}</strong><small className="table-sub">{item.majorName}</small></td>
                    <td>{item.courseName}<small className="table-sub">{item.courseCode}</small></td>
                    <td>{item.roomName || "—"}<small className="table-sub">{item.building}</small></td>
                    <td>{item.semesterName}<small className="table-sub">{item.semesterStartDate} – {item.semesterEndDate}</small></td>
                    <td><span className={`teaching-badge ${state}`}>{teachingStateLabel(state)}</span></td>
                  </tr>)}
          </tbody>
        </PaginatedTable>
      </div>
    </section>

    <section className="panel weekly-schedule">
      <div className="teaching-section-heading">
        <div><h2>Lịch theo học phần</h2><p>Tách các môn còn lịch dạy và các môn đã kết thúc.</p></div>
      </div>
      <div className="teacher-tabs" role="tablist" aria-label="Lịch theo trạng thái"><button role="tab" aria-selected={scheduleTab==="upcoming"} onClick={()=>setScheduleTab("upcoming")}>Đang hoạt động / Sắp tới</button><button role="tab" aria-selected={scheduleTab==="ended"} onClick={()=>setScheduleTab("ended")}>Đã kết thúc</button></div>
      <div className="feature-table-wrap"><PaginatedTable><thead><tr><th>Môn học</th><th>Lớp</th><th>Học kỳ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{loading?<tr><td colSpan={5}>Đang tải…</td></tr>:offeringRows.map(item=><tr key={item.courseOfferingId} style={scheduleTab==="ended"?{color:"#94a3b8",background:"#f8fafc"}:undefined}><td><button className="refresh-button" onClick={()=>{setDetailTab(scheduleTab==="ended"?"ended":"upcoming");setOfferingDetail(item.courseOfferingId);}}>{item.courseName}</button><small className="table-sub">{item.courseCode}</small></td><td>{item.classCode}</td><td>{item.semesterName}</td><td>{scheduleTab==="ended"?"Đã kết thúc":"Còn lịch dạy"}</td><td><button className="refresh-button" onClick={()=>{setDetailTab(scheduleTab==="ended"?"ended":"upcoming");setOfferingDetail(item.courseOfferingId);}}>Chi tiết lịch dạy</button></td></tr>)}{!loading&&!offeringRows.length&&<tr><td colSpan={5}>Không có môn phù hợp.</td></tr>}</tbody></PaginatedTable></div>
      {offeringDetail!==null&&<FeatureDialog title="Chi tiết lịch dạy" description={`${detailRows[0]?.courseName||""} · ${detailRows[0]?.classCode||""} · ${detailRows[0]?.semesterName||""}`} onClose={()=>setOfferingDetail(null)}><div className="teacher-tabs" role="tablist" aria-label="Buổi dạy"><button role="tab" aria-selected={detailTab==="upcoming"} onClick={()=>setDetailTab("upcoming")}>Sắp tới ({detailRows.filter(item=>!item.ended).length})</button><button role="tab" aria-selected={detailTab==="ended"} onClick={()=>setDetailTab("ended")}>Đã dạy ({detailRows.filter(item=>item.ended).length})</button></div><div className="feature-table-wrap"><PaginatedTable><thead><tr><th>Ngày / Thứ</th><th>Giờ dạy</th><th>Phòng</th><th>Trạng thái</th></tr></thead><tbody>{visibleDetails.map(item=><tr key={`${item.id}-${item.teachingDate}`}><td>{item.teachingDate?formatTeachingDate(new Date(`${item.teachingDate}T12:00:00+07:00`)):dayLabel(item.dayOfWeek)}</td><td>{timeRange(item)}<small className="table-sub">{item.session}</small></td><td>{item.roomName||"Chưa xếp"}</td><td>{item.ended?"Đã kết thúc":teachingStateLabel(teachingState(item,now))}</td></tr>)}{!visibleDetails.length&&<tr><td colSpan={4}>{detailTab==="ended"?"Chưa có buổi đã dạy.":"Không còn buổi sắp tới."}</td></tr>}</tbody></PaginatedTable></div></FeatureDialog>}

    </section>
  </section>;
}

function ScheduleCard({ item, now, onAttendance }: { item: TeachingSchedule; now: Date; onAttendance: () => void }) {
  const state = teachingState(item, now);
  return <article className={`teaching-card ${state}`}>
    <div className="teaching-time"><strong>{item.startTime}</strong><span>{item.endTime}</span></div>
    <div className="teaching-detail">
      <div><span className={`teaching-badge ${state}`}>{teachingStateLabel(state)}</span><small>{item.session}</small></div>
      <h3>{item.classCode} · {item.courseName}</h3>
      <p><Icon name="class" size={14} />{item.roomName || "Chưa xếp phòng"}{item.building ? ` · ${item.building}` : ""}<span>•</span>{item.courseCode}</p>
    </div>
    {(state === "current" || state === "upcoming") && <button onClick={onAttendance}><Icon name="attendance" size={15} />Điểm danh</button>}
  </article>;
}
