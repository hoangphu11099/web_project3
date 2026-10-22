"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import type { ToastHandler } from "@/models/dashboard";

type Consultation = {id:number;fullName:string;phone:string;email:string;program:string;location:string;preferredSession:string;message:string;status:string;createdAt:string};
export function ConsultationInbox({ token, onToast }: {token:string;onToast:ToastHandler}) {
  const [rows,setRows] = useState<Consultation[]>([]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [filter,setFilter] = useState("");
  const [busy,setBusy] = useState(0);
  const load = async () => {
    setLoading(true);
    try {const payload=await apiRequest(token,"/admin/consultations");setRows(payload.data || []);setError("");}
    catch(reason){setError(reason instanceof Error ? reason.message : "Không tải được yêu cầu tư vấn");}
    finally{setLoading(false);}
  };
  useEffect(() => {void load();},[token]);
  const update = async (row:Consultation,status:string) => {
    setBusy(row.id);
    try{await apiRequest(token,`/admin/consultations/${row.id}`,{method:"PUT",body:JSON.stringify({status})});setRows(current=>current.map(item=>item.id===row.id?{...item,status}:item));onToast("Đã cập nhật trạng thái tư vấn");}
    catch(reason){onToast(reason instanceof Error ? reason.message : "Không lưu được trạng thái","error");}
    finally{setBusy(0);}
  };
  const visible=rows.filter(row=>!filter||row.status===filter);
  return <section><div className="feature-tools"><select aria-label="Lọc trạng thái tư vấn" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Tất cả trạng thái</option><option value="new">Mới đăng ký</option><option value="contacted">Đã liên hệ</option><option value="completed">Hoàn tất</option></select><span>{rows.filter(row=>row.status==="new").length} yêu cầu mới · Hiển thị tối đa 500 đăng ký gần nhất</span><button className="refresh-button" onClick={load} disabled={loading}>Làm mới</button></div>{error&&<p className="feature-error" role="alert">{error}</p>}{loading?<p>Đang tải đăng ký tư vấn…</p>:!visible.length?<p className="empty-note">Chưa có yêu cầu phù hợp.</p>:<div className="feature-table-wrap"><table><thead><tr><th>Người đăng ký</th><th>Ngành & Nguyện vọng</th><th>Nội dung</th><th>Thời gian</th><th>Trạng thái</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td><strong>{row.fullName}</strong><a className="consultation-admin-link" href={`tel:${row.phone}`}>{row.phone}</a><a className="consultation-admin-link" href={`mailto:${row.email}`}>{row.email}</a></td><td>{row.program}<small className="cell-sub">{row.location} · {row.preferredSession}</small></td><td className="consultation-admin-message">{row.message||"Không có ghi chú"}</td><td>{new Date(row.createdAt).toLocaleString("vi-VN")}</td><td><select aria-label={`Trạng thái tư vấn của ${row.fullName}`} disabled={Boolean(busy)} value={row.status} onChange={e=>update(row,e.target.value)}><option value="new">Mới đăng ký</option><option value="contacted">Đã liên hệ</option><option value="completed">Hoàn tất</option></select></td></tr>)}</tbody></table></div>}</section>;
}
