"use client";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, display, idOf, pick } from "@/controllers/api.controller";
import { lessonShift, schoolClassCount, schoolLessonsOnDate, schoolShifts } from "@/controllers/school-schedule";
import { PaginatedTable } from "@/components/common/Pagination";
import type { Row } from "@/models/dashboard";

const schoolToday = () => new Date(Date.now()+7*3600000).toISOString().slice(0,10);
export function SchoolSchedulePage({token}:{token:string}) {
  const [date,setDate]=useState(schoolToday),[shift,setShift]=useState(""),[query,setQuery]=useState("");
  const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    apiRequest(token,"/course-offerings",{signal:controller.signal,cache:"no-store"}).then(payload=>{
      if(!controller.signal.aborted){setRows(payload.data||[]);setError("");}
    }).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Không tải được lịch học");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[token,revision]);
  const lessons=useMemo(()=>schoolLessonsOnDate(rows,date),[rows,date]);
  const visible=lessons.filter(lesson=>(!shift||lessonShift(lesson.startTime)===shift)&&["Class.ClassCode","Course.Name","Teacher.User.FullName","Teacher.User.Email","Room.Name"].some(path=>String(pick(lesson.offering,path)||"").toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))));
  const move=(offset:number)=>{const next=new Date(`${date}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+offset);setDate(next.toISOString().slice(0,10));};
  return <section className="feature-page school-schedule-page">
    <div className="feature-heading"><div><p className="eyebrow">Quản lý đào tạo</p><h1>Lịch học toàn trường</h1><p>Theo dõi lớp có lịch học theo ngày và ca, từ các phân công đã xác nhận.</p></div><button className="refresh-button" disabled={loading} onClick={()=>{setLoading(true);setRevision(v=>v+1);}}>Làm mới</button></div>
    <div className="school-day-controls"><button className="refresh-button" onClick={()=>move(-1)} disabled={!date}>← Ngày trước</button><label>Ngày học<input type="date" value={date} onChange={e=>{if(e.target.value)setDate(e.target.value);}}/></label><button className="refresh-button" onClick={()=>move(1)} disabled={!date}>Ngày sau →</button><button className="refresh-button" onClick={()=>setDate(schoolToday())}>Hôm nay</button></div>
    <h2>{new Date(`${date}T12:00:00Z`).toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"})}</h2>
    {error&&<div className="feature-error" role="alert">{error}</div>}
    <div className="school-shift-cards" aria-label="Thống kê lớp theo ca">
      {["",...schoolShifts].map(value=>{const group=value?lessons.filter(l=>lessonShift(l.startTime)===value):lessons;return <button key={value} className={`school-shift-card ${shift===value?"selected":""}`} aria-pressed={shift===value} onClick={()=>setShift(value)}><span>{value||"Cả ngày"}</span><strong>{loading||error?"—":schoolClassCount(group)} lớp</strong><small>{loading||error?"Đang chờ dữ liệu":`${group.length} buổi học`}</small></button>;})}
    </div>
    <p className="muted">Sáng: trước 12:00 · Trưa / Chiều: 12:00–17:59 · Tối: từ 18:00. Ca được xác định theo giờ bắt đầu; một lớp có thể học nhiều ca.</p>
    <label className="school-schedule-search">Tìm lớp, môn, giảng viên hoặc phòng<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nhập tên hoặc mã lớp…"/></label>
    {!loading&&!error&&<p>Tìm thấy <strong>{schoolClassCount(visible)} lớp · {visible.length} buổi học</strong>{shift?` · Ca ${shift.toLocaleLowerCase("vi")}`:""}.</p>}
    <div className="feature-table-wrap"><PaginatedTable><thead><tr><th>Ca / Giờ học</th><th>Lớp</th><th>Môn học</th><th>Giảng viên</th><th>Phòng</th></tr></thead><tbody>
      {loading?<tr><td colSpan={5}>Đang tải lịch học…</td></tr>:error?<tr><td colSpan={5}>Chưa tải được lịch học. Vui lòng thử lại.</td></tr>:visible.map(lesson=><tr key={`${idOf(lesson.offering)}:${lesson.date}:${lesson.startTime}:${lesson.endTime}`}><td><strong>{lesson.startTime.slice(0,5)} – {lesson.endTime.slice(0,5)}</strong><small className="cell-sub">{lessonShift(lesson.startTime)}</small></td><td>{display(pick(lesson.offering,"Class.ClassCode"))}</td><td>{display(pick(lesson.offering,"Course.Name"))}<small className="cell-sub">{display(pick(lesson.offering,"OfferingCode"))}</small></td><td>{display(pick(lesson.offering,"Teacher.User.FullName"))}<small className="cell-sub">{display(pick(lesson.offering,"Teacher.User.Email"))}</small></td><td>{display(pick(lesson.offering,"Room.Name"))}</td></tr>)}
      {!loading&&!error&&!visible.length&&<tr><td colSpan={5}>Không có lịch học phù hợp trong ngày và ca đã chọn.</td></tr>}
    </tbody></PaginatedTable></div>
  </section>;
}
