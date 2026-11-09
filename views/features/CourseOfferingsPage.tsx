"use client";
import { PaginatedTable } from "@/components/common/Pagination";

import { useEffect, useState } from "react";
import { apiRequest, display, idOf, keyOf, pick, statusLabel } from "@/controllers/api.controller";
import { useErrorFeedback } from "@/components/common/ErrorFeedback";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import type { MetadataData, Row } from "@/models/dashboard";

export function CourseOfferingsPage({token, metadata}:{token:string;metadata:MetadataData}) {
  const [classID,setClassID]=useState(0),[query,setQuery]=useState(""),[term,setTerm]=useState(""),[refresh,setRefresh]=useState(0);
  const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[detail,setDetail]=useState<Row|null>(null);
  const [error,setError]=useErrorFeedback();
  useEffect(()=>{
    if(!classID)return;
    const controller=new AbortController();let active=true;
    apiRequest(token,`/course-offerings?classId=${classID}&summary=true`,{signal:controller.signal}).then(result=>{if(active){setRows(result.data||[]);setError("");}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Không tải được học phần");}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;controller.abort();};
  },[token,classID,refresh,setError]);
  const selectClass=(id:number)=>{setRows([]);setQuery("");setTerm("");setError("");setLoading(true);setClassID(id);};
  const openDetail=async(row:Row)=>{
    if(busy)return;setBusy(true);
    try{const result=await apiRequest(token,`/course-offerings?classId=${classID}&id=${idOf(row)}`);if(!result.data?.[0])throw new Error("Không tìm thấy học phần.");setDetail(result.data[0]);}
    catch(reason){setError(reason instanceof Error?reason.message:"Không tải được chi tiết học phần");}finally{setBusy(false);}
  };
  const search=(value:string)=>value.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"));
  const selected=metadata.classes.find(row=>idOf(row)===classID);
  const classes=metadata.classes.filter(row=>search(`${keyOf(row,"ClassCode")} ${pick(row,"Major.Name")}`));
  const terms=Array.from(new Map(rows.map(row=>[String(keyOf(row,"SemesterID")),String(pick(row,"Semester.Name")||"Chưa có học kỳ")])).entries());
  const visible=rows.filter(row=>(!term||String(keyOf(row,"SemesterID"))===term)&&search(`${pick(row,"Course.Name")} ${pick(row,"Course.Code")} ${pick(row,"Teacher.User.FullName")} ${pick(row,"Semester.Name")}`));
  return <section className="feature-page">
    <div className="feature-heading"><div>{!!classID&&<button className="refresh-button" onClick={()=>{setClassID(0);setQuery("");setError("");}}>← Danh sách lớp</button>}<h1>Học phần{classID?` · ${display(keyOf(selected,"ClassCode"))}`:""}</h1><p>{classID?"Xem học phần theo lớp và học kỳ. Bấm Chi tiết để xem lịch đã xếp.":"Mỗi môn có thể mở nhiều lớp học phần theo học kỳ. Chọn lớp sinh hoạt để xem các lớp học phần được tổ chức."}</p></div>{!!classID&&<button className="refresh-button" disabled={loading} onClick={()=>{setLoading(true);setRefresh(value=>value+1);}}>Làm mới</button>}</div>
    <div className="feature-tools"><input aria-label={classID?"Tìm học phần":"Tìm lớp"} placeholder={classID?"Tìm môn học, giảng viên…":"Tìm mã lớp, chuyên ngành…"} value={query} onChange={event=>setQuery(event.target.value)}/>{!!classID&&<select aria-label="Học kỳ" value={term} onChange={event=>setTerm(event.target.value)}><option value="">Tất cả học kỳ</option>{terms.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>}<span>{classID?`${visible.length} học phần`:`${classes.length} lớp`}</span></div>
    {error&&<p className="feature-error" role="alert">{error}</p>}
    <div className="feature-table-wrap">{!classID?<PaginatedTable><thead><tr><th>Lớp học</th><th>Chuyên ngành</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{classes.map(row=><tr key={idOf(row)}><td><button className="refresh-button" onClick={()=>selectClass(idOf(row))}>{display(keyOf(row,"ClassCode"))}</button></td><td>{display(pick(row,"Major.Name"))}</td><td>{statusLabel(keyOf(row,"Status"))}</td><td><button className="primary-button" onClick={()=>selectClass(idOf(row))}>Xem học phần</button></td></tr>)}{!classes.length&&<tr><td colSpan={4}>Không có lớp phù hợp.</td></tr>}</tbody></PaginatedTable>:<PaginatedTable><thead><tr><th>Lớp học phần / Môn học</th><th>Học kỳ</th><th>Giảng viên</th><th>Phòng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{loading?<tr><td colSpan={6}>Đang tải học phần…</td></tr>:visible.map(row=><tr key={idOf(row)}><td><strong>{display(keyOf(row,"OfferingCode"))}</strong><div>{display(pick(row,"Course.Name"))}</div><small className="cell-sub">{display(pick(row,"Course.Code"))}</small></td><td>{display(pick(row,"Semester.Name"))}</td><td>{display(pick(row,"Teacher.User.FullName"))}</td><td>{display(pick(row,"Room.Name"))}</td><td>{statusLabel(keyOf(row,"Status"))}</td><td><button className="refresh-button" disabled={busy} onClick={()=>void openDetail(row)}>Chi tiết</button></td></tr>)}{!loading&&!visible.length&&<tr><td colSpan={6}>Chưa có học phần phù hợp.</td></tr>}</tbody></PaginatedTable>}</div>
    {detail&&<FeatureDialog title="Chi tiết học phần" description={`${display(pick(detail,"Course.Name"))} · ${display(pick(detail,"Class.ClassCode"))}`} onClose={()=>setDetail(null)}><div className="inline-action-card"><p>Mã lớp học phần: <strong>{display(keyOf(detail,"OfferingCode"))}</strong></p><p>Mã môn: {display(pick(detail,"Course.Code"))} · Số tín chỉ: {display(pick(detail,"Course.Credits"))}</p><p>Học kỳ: {display(pick(detail,"Semester.Name"))}</p><p>Giảng viên: {display(pick(detail,"Teacher.User.FullName"))} · Phòng: {display(pick(detail,"Room.Name"))}</p><p>Trạng thái: {statusLabel(keyOf(detail,"Status"))}</p><h3>Lịch đã xếp</h3><div className="feature-table-wrap"><PaginatedTable><thead><tr><th>Ngày học</th><th>Giờ bắt đầu</th><th>Giờ kết thúc</th></tr></thead><tbody>{((keyOf(detail,"Schedules")||[]) as Row[]).map(lesson=><tr key={idOf(lesson)}><td>{keyOf(lesson,"FullDate")?new Date(String(keyOf(lesson,"FullDate")).slice(0,10)+"T12:00:00").toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}):display(keyOf(lesson,"DayOfWeek"))}</td><td>{display(keyOf(lesson,"StartTime"))}</td><td>{display(keyOf(lesson,"EndTime"))}</td></tr>)}{!((keyOf(detail,"Schedules")||[]) as Row[]).length&&<tr><td colSpan={3}>Chưa có lịch học.</td></tr>}</tbody></PaginatedTable></div></div></FeatureDialog>}
  </section>;
}
