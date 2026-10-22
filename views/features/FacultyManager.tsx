"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import { Icon } from "@/components/ui/Icon";
import type { ToastHandler } from "@/models/dashboard";

type Faculty = {id:number;name:string;major:string;qualification:string;biography:string;avatarUrl:string};
export function FacultyManager({token,onToast}:{token:string;onToast:ToastHandler}) {
  const [items,setItems]=useState<Faculty[]>([]);
  const [drafts,setDrafts]=useState<Record<number,{biography:string;avatarUrl:string}>>({});
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    apiRequest(token,"/admin/faculty",{signal:controller.signal}).then(payload=>{
      if(controller.signal.aborted)return;
      const rows=payload.data || [];setItems(rows);setDrafts(Object.fromEntries(rows.map((row:Faculty)=>[row.id,{biography:row.biography||"",avatarUrl:row.avatarUrl||""}])));
    }).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Không tải được giảng viên");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[token]);
  const save=async(teacher:Faculty)=>{
    if(busy)return;setBusy(teacher.id);setError("");
    const draft=drafts[teacher.id];
    try{await apiRequest(token,`/admin/faculty/${teacher.id}`,{method:"PUT",body:JSON.stringify(draft)});setItems(rows=>rows.map(row=>row.id===teacher.id?{...row,...draft}:row));onToast("Đã lưu giới thiệu giảng viên");}
    catch(reason){const message=reason instanceof Error?reason.message:"Không lưu được giới thiệu";setError(message);onToast(message,"error");}
    finally{setBusy(0);}
  };
  return <section><div className="feature-form"><h2>Giới thiệu giảng viên</h2><p>Thêm ảnh chân dung và phần giới thiệu hiển thị trong đội ngũ giảng viên trên website. Tên, chuyên ngành và trình độ lấy từ hồ sơ giảng viên.</p><label>Tìm giảng viên<input placeholder="Tên hoặc chuyên ngành…" value={query} onChange={e=>setQuery(e.target.value)} /></label></div>{error&&<p className="feature-error" role="alert">{error}</p>}{loading?<p>Đang tải giảng viên…</p>:<div className="faculty-admin-grid">{items.filter(teacher=>`${teacher.name} ${teacher.major}`.toLowerCase().includes(query.toLowerCase())).map(teacher=>{
    const draft=drafts[teacher.id];const dirty=draft.biography!==(teacher.biography||"")||draft.avatarUrl!==(teacher.avatarUrl||"");
    return <form className="feature-form faculty-admin-card" key={teacher.id} onSubmit={event=>{event.preventDefault();void save(teacher);}}><header><div className="faculty-admin-avatar">{draft.avatarUrl?<img key={draft.avatarUrl} src={draft.avatarUrl} alt={`Ảnh ${teacher.name}`} />:<Icon name="teacher" size={32} />}</div><div><h3>{teacher.name}</h3><p>{teacher.major || "Chưa có chuyên ngành"} · {teacher.qualification || "Chưa có trình độ"}</p></div></header><label>Link ảnh chân dung<input maxLength={2048} placeholder="https://… hoặc /giang-vien.jpg" value={draft.avatarUrl} onChange={e=>setDrafts(current=>({...current,[teacher.id]:{...draft,avatarUrl:e.target.value}}))} /></label><label>Giới thiệu<textarea rows={6} maxLength={5000} placeholder="Giới thiệu chuyên môn, lĩnh vực giảng dạy, phương pháp hướng dẫn và kinh nghiệm đã được xác nhận…" value={draft.biography} onChange={e=>setDrafts(current=>({...current,[teacher.id]:{...draft,biography:e.target.value}}))} /><small>{draft.biography.length}/5000 ký tự · Để trống sẽ hiển thị giới thiệu cơ bản theo hồ sơ.</small></label><div className="form-actions"><button className="primary-button" disabled={Boolean(busy)||!dirty}><Icon name="check" size={15} />{busy===teacher.id?"Đang lưu…":"Lưu giới thiệu"}</button><button type="button" className="refresh-button" disabled={Boolean(busy)||!dirty} onClick={()=>setDrafts(current=>({...current,[teacher.id]:{biography:teacher.biography||"",avatarUrl:teacher.avatarUrl||""}}))}>Bỏ thay đổi</button></div></form>;
  })}</div>}</section>;
}
