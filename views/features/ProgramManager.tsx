"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import { mergePrograms, type Program } from "@/models/programs";
import type { ToastHandler } from "@/models/dashboard";
import { Icon } from "@/components/ui/Icon";
import { ProgramCard } from "@/views/public/Programs";

const symbols: [Program["symbol"],string][] = [["code","Lập trình"],["ai","AI / Dữ liệu"],["shield","Bảo mật"],["cloud","Đám mây"],["chip","Vi mạch"],["design","Thiết kế"],["ux","Giao diện"],["marketing","Marketing"],["business","Kinh doanh"],["logistics","Logistics"]];
const emptyProgram = ():Program => ({slug:"",name:"",group:"Công nghệ",symbol:"code",image:"/pp-academy-tech-lab.webp",tagline:"",description:"",tools:[""],skills:[""],careers:[""],project:"",stages:[{title:"",topics:[""]}],published:true});

export function ProgramManager({token,onToast}:{token:string;onToast:ToastHandler}) {
  const [items,setItems] = useState<Program[]>([]);
  const [draft,setDraft] = useState<Program|null>(null);
  const [original,setOriginal] = useState("");
  const [newItem,setNewItem] = useState(false);
  const [query,setQuery] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const dirty=Boolean(draft && JSON.stringify(draft)!==original);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.all([apiRequest(token,"/admin/programs",{signal:controller.signal}),apiRequest(token,"/admin/program-images",{signal:controller.signal})]).then(([content,images])=>{
      if(controller.signal.aborted)return;
      const imageMap=Object.fromEntries((images.data||[]).map((row:{slug:string;imageUrl:string})=>[row.slug,row.imageUrl]));
      setItems(mergePrograms(content.data||[],imageMap));setError("");
    }).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Không tải được nội dung ngành học");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[token]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  const choose=(program:Program,isNew=false)=>{
    if(dirty&&!confirm("Nội dung đang chỉnh chưa được lưu. Bỏ thay đổi để chọn ngành khác?"))return;
    const copy=structuredClone(program);setDraft(copy);setOriginal(JSON.stringify(copy));setNewItem(isNew);setError("");
  };
  const change=<K extends keyof Program>(key:K,value:Program[K])=>setDraft(current=>current?{...current,[key]:value}:current);
  const listField=(key:"tools"|"skills"|"careers",label:string)=>draft&&<label className="program-editor-wide">{label}<small>Mỗi nội dung trên một dòng.</small><textarea required rows={4} value={draft[key].join("\n")} onChange={e=>change(key,e.target.value.split("\n"))} /></label>;
  const save=async(event:React.FormEvent)=>{
    event.preventDefault();if(!draft||busy)return;
    if(newItem&&items.some(item=>item.slug===draft.slug)){setError("Đường dẫn này đã thuộc một ngành khác. Vui lòng chọn đường dẫn mới.");return;}
    const clean=(list:string[])=>list.map(item=>item.trim()).filter(Boolean);
    const next={...draft,name:draft.name.trim(),published:draft.published!==false,tools:clean(draft.tools),skills:clean(draft.skills),careers:clean(draft.careers),stages:draft.stages.map(stage=>({...stage,title:stage.title.trim(),topics:clean(stage.topics)}))};
    setBusy(true);setError("");
    try{
      const payload=await apiRequest(token,`/admin/programs/${encodeURIComponent(next.slug)}`,{method:"PUT",body:JSON.stringify(next)});
      const saved=payload.data as Program;setItems(current=>current.some(item=>item.slug===saved.slug)?current.map(item=>item.slug===saved.slug?saved:item):[...current,saved]);setDraft(saved);setOriginal(JSON.stringify(saved));setNewItem(false);onToast("Đã lưu nội dung ngành học. Trang công khai sẽ cập nhật khi tải lại.");
    }catch(reason){const message=reason instanceof Error?reason.message:"Không lưu được nội dung";setError(message);onToast(message,"error");}
    finally{setBusy(false);}
  };
  if(loading)return <p>Đang tải các ngành học…</p>;
  return <section className="program-management"><div className="feature-form"><div className="program-management-heading"><div><h2>Quản lý ngành học</h2><p>Chỉnh nội dung hiển thị trên thẻ ngành và trang chi tiết. Các thay đổi được lưu vào hệ thống, không cần chỉnh code.</p></div><button className="primary-button" disabled={busy||Boolean(error&&!items.length)} onClick={()=>choose(emptyProgram(),true)}><Icon name="plus" size={16} />Thêm ngành học</button></div></div>
    {error&&<div className="feature-error" role="alert">{error}</div>}
    <div className="program-management-layout"><aside className="program-management-list"><label>Tìm ngành học<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nhập tên ngành…" /></label>{items.filter(item=>item.name.toLowerCase().includes(query.toLowerCase())).map(item=><button key={item.slug} disabled={busy} className={draft?.slug===item.slug&&!newItem?"selected":""} onClick={()=>choose(item)}><strong>{item.name}</strong><span>{item.group} · {item.published===false?"Đang ẩn":"Đang hiển thị"}</span></button>)}</aside>
    {!draft?<div className="feature-form program-editor-empty"><Icon name="course" size={36} /><h3>Chọn ngành để chỉnh sửa</h3><p>Bạn có thể cập nhật toàn bộ nội dung ngành hoặc thêm một ngành mới.</p></div>:<form className="feature-form program-content-editor" onSubmit={save}><fieldset disabled={busy}><header><h2>{newItem?"Thêm ngành học":`Chỉnh sửa: ${draft.name}`}</h2><p>{dirty?"Có thay đổi chưa lưu":"Nội dung đã đồng bộ"}</p></header>
      <details open><summary>Thông tin chung & hình ảnh</summary><div className="program-editor-grid"><label>Tên ngành *<input required maxLength={160} value={draft.name} onChange={e=>change("name",e.target.value)} /></label><label>Đường dẫn ngành *<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} readOnly={!newItem} value={draft.slug} onChange={e=>change("slug",e.target.value)} placeholder="vi-du-nganh-hoc" /><small>{newItem?"Chữ không dấu, số và dấu gạch ngang.":"Giữ cố định để các liên kết đã chia sẻ tiếp tục hoạt động."}</small></label>
      <label>Nhóm ngành<select value={draft.group} onChange={e=>change("group",e.target.value as Program["group"])}><option>Công nghệ</option><option>Sáng tạo</option><option>Kinh doanh</option></select></label><label>Biểu tượng<select value={draft.symbol} onChange={e=>change("symbol",e.target.value as Program["symbol"])}>{symbols.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label className="program-editor-wide">Link ảnh *<input required maxLength={2048} value={draft.image} onChange={e=>change("image",e.target.value)} placeholder="https://… hoặc /ten-anh.jpg" /></label><label className="program-editor-wide">Mô tả ngắn trên thẻ ngành *<textarea required maxLength={5000} rows={2} value={draft.tagline} onChange={e=>change("tagline",e.target.value)} /></label><label className="program-editor-wide">Giới thiệu chi tiết *<textarea required maxLength={5000} rows={5} value={draft.description} onChange={e=>change("description",e.target.value)} /></label><label className="program-editor-check"><input type="checkbox" checked={draft.published!==false} onChange={e=>change("published",e.target.checked)} />Hiển thị ngành trên website</label></div></details>
      <details open><summary>Công cụ, kỹ năng & nghề nghiệp</summary><div className="program-editor-grid">{listField("tools","Công cụ / Công nghệ *")}{listField("skills","Kỹ năng & chuẩn đầu ra định hướng *")}{listField("careers","Hướng nghề nghiệp *")}<label className="program-editor-wide">Dự án thực hành gợi ý *<textarea required maxLength={5000} rows={4} value={draft.project} onChange={e=>change("project",e.target.value)} /></label></div></details>
      <details open><summary>Lộ trình học tập</summary><div className="program-editor-stages">{draft.stages.map((stage,index)=><div key={index}><header><strong>Chặng {index+1}</strong><button className="danger-button" type="button" disabled={draft.stages.length===1} onClick={()=>change("stages",draft.stages.filter((_,i)=>i!==index))}>Xóa chặng</button></header><label>Tên chặng *<input required maxLength={200} value={stage.title} onChange={e=>change("stages",draft.stages.map((item,i)=>i===index?{...item,title:e.target.value}:item))} /></label><label>Nội dung học *<small>Mỗi nội dung trên một dòng.</small><textarea required rows={4} value={stage.topics.join("\n")} onChange={e=>change("stages",draft.stages.map((item,i)=>i===index?{...item,topics:e.target.value.split("\n")}:item))} /></label></div>)}<button className="refresh-button" type="button" disabled={draft.stages.length>=12} onClick={()=>change("stages",[...draft.stages,{title:"",topics:[""]}])}><Icon name="plus" size={15} />Thêm chặng học</button></div></details>
      <details><summary>Xem trước thẻ ngành học</summary><div className="program-content-preview"><ProgramCard program={draft} /></div></details>
      <div className="program-editor-actions"><button className="primary-button" disabled={busy||(!dirty&&!newItem)}><Icon name="check" size={16} />{busy?"Đang lưu…":"Lưu nội dung ngành"}</button><button type="button" className="refresh-button" disabled={busy||!dirty} onClick={()=>{if(confirm("Bỏ các thay đổi chưa lưu?"))setDraft(JSON.parse(original));}}>Bỏ thay đổi</button>{!newItem&&<a href={`/?public=1#nganh-hoc/${draft.slug}`} target="_blank" rel="noreferrer">Xem trang công khai <Icon name="arrow" size={15} /></a>}</div>
    </fieldset></form>}</div>
  </section>;
}
