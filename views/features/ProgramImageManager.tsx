"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import { programs } from "@/models/programs";
import type { ToastHandler } from "@/models/dashboard";
import { Icon } from "@/components/ui/Icon";

export function ProgramImageManager({token,onToast}:{token:string;onToast:ToastHandler}) {
  const [images,setImages] = useState<Record<string,string>>({});
  const [drafts,setDrafts] = useState<Record<string,string>>({});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState("");
  const [query,setQuery] = useState("");
  useEffect(()=>{
    const controller=new AbortController();
    apiRequest(token,"/admin/program-images",{signal:controller.signal,cache:"no-store"}).then(payload=>{
      if(controller.signal.aborted)return;
      const next=Object.fromEntries((payload.data||[]).map((row:{slug:string;imageUrl:string})=>[row.slug,row.imageUrl]));setImages(next);setDrafts(next);setError("");
    }).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Không tải được ảnh ngành học");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[token]);
  const save = async (slug:string,value:string) => {
    if(busy)return;setBusy(slug);setError("");
    try{
      const payload=await apiRequest(token,`/admin/program-images/${slug}`,{method:"PUT",body:JSON.stringify({imageUrl:value.trim()})});
      const saved=payload.data.imageUrl || "";setImages(old=>({...old,[slug]:saved}));setDrafts(old=>({...old,[slug]:saved}));onToast("Đã lưu ảnh. Trang công khai sẽ dùng ảnh mới khi tải lại.");
    }catch(reason){const message=reason instanceof Error?reason.message:"Không lưu được ảnh";setError(message);onToast(message,"error");}
    finally{setBusy("");}
  };
  if(loading)return <p>Đang tải ảnh ngành học…</p>;
  return <section><div className="feature-form"><h2>Ảnh các ngành học</h2><p>Thay ảnh nền cho từng ngành. Ảnh sẽ hiển thị ở thẻ ngành học và banner trang chi tiết; lớp màu xanh và icon vẫn được giữ.</p><p>Dán link ảnh trực tiếp (https://…) hoặc đường dẫn ảnh đã có trên website (/ten-anh.jpg). Khuyến nghị ảnh ngang, rộng từ 1200 px.</p><label>Tìm ngành học<input value={query} placeholder="Nhập tên ngành…" onChange={e=>setQuery(e.target.value)} /></label></div>
    {error&&<p className="feature-error" role="alert">{error}</p>}
    <div className="program-image-admin-grid">{programs.filter(program=>program.name.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))).map(program=>{
      const draft=drafts[program.slug] || "";
      const changed=draft!==(images[program.slug] || "");
      return <form className="program-image-admin-card" key={program.slug} onSubmit={event=>{event.preventDefault();void save(program.slug,draft);}}>
        <div className="program-image-preview"><img key={draft || program.image} src={draft || program.image} alt={`Ảnh nền ${program.name}`} onError={event=>{event.currentTarget.style.visibility="hidden";}} /><span>Xem trước ảnh gốc</span></div>
        <div><small>{program.group}</small><h3>{program.name}</h3><label>Đường dẫn ảnh<input maxLength={2048} placeholder={program.image} value={draft} onChange={e=>setDrafts(old=>({...old,[program.slug]:e.target.value}))} /></label><p>{draft?"Ảnh tùy chỉnh":"Đang dùng ảnh mặc định"}{changed?" · Có thay đổi chưa lưu":""}</p><div className="form-actions"><button className="primary-button" disabled={Boolean(busy)||!changed}><Icon name="check" size={15} />{busy===program.slug?"Đang lưu…":"Lưu ảnh"}</button><button type="button" className="refresh-button" disabled={Boolean(busy)||(!draft&&!images[program.slug])} onClick={()=>{if(confirm(`Khôi phục ảnh mặc định cho ${program.name}?`))void save(program.slug,"");}}>Ảnh mặc định</button></div><a className="text-link" href={`/?public=1#nganh-hoc/${program.slug}`} target="_blank" rel="noreferrer">Xem trang ngành <Icon name="arrow" size={14} /></a></div>
      </form>;
    })}</div>
  </section>;
}
