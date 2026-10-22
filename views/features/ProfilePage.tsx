"use client";
import { useEffect, useState } from "react";
import { apiRequest, display, keyOf, pick } from "@/controllers/api.controller";
import type { Row, ToastHandler } from "@/models/dashboard";

export function ProfilePage({token,onToast,onUpdated}:{token:string;onToast:ToastHandler;onUpdated:(name:string)=>void}) {
 const [profile,setProfile]=useState<Row|null>(null), [error,setError]=useState("");
 const [form,setForm]=useState({fullName:"",email:"",phone:"",address:""});
 const [password,setPassword]=useState({currentPassword:"",newPassword:"",confirm:""});
 const [busy,setBusy]=useState("");
 useEffect(()=>{let cancelled=false;apiRequest(token,"/profile").then(p=>{if(cancelled)return;setProfile(p.data);setForm({fullName:String(keyOf(p.data,"FullName")||""),email:String(keyOf(p.data,"Email")||""),phone:String(pick(p.data,"Teacher.Phone")||""),address:String(pick(p.data,"Teacher.Address")||"")});}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[token]);
 const submit=async(e:React.FormEvent,kind:string)=>{
  e.preventDefault();if(busy)return;
  if(kind==="password" && password.newPassword!==password.confirm){onToast("Mật khẩu xác nhận không khớp","error");return;}
  setBusy(kind);
  try {const result=await apiRequest(token,kind==="profile"?"/profile":"/profile/password",{method:kind==="profile"?"PUT":"POST",body:JSON.stringify(kind==="profile"?form:{currentPassword:password.currentPassword,newPassword:password.newPassword})});onToast(result.message,"success");if(kind==="profile")onUpdated(form.fullName.trim());else setPassword({currentPassword:"",newPassword:"",confirm:""});}
  catch(e){onToast(e instanceof Error?e.message:"Không lưu được thay đổi","error");}finally{setBusy("");}
 };
 return <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">Tài khoản của bạn</p><h1>Hồ sơ cá nhân</h1><p>Cập nhật thông tin liên hệ và bảo mật tài khoản.</p></div></div>{error?<div className="feature-error" role="alert">{error}</div>:!profile?<p>Đang tải hồ sơ...</p>:<div className="profile-page-grid">
 <form className="feature-form" onSubmit={e=>submit(e,"profile")}><h2>Thông tin cá nhân</h2><p>Tên đăng nhập: <strong>{display(keyOf(profile,"Username"))}</strong> · {pick(profile,"Role.Name")==="admin"?"Quản trị viên":"Giảng viên"}</p><div className="form-grid"><label>Họ và tên<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} autoComplete="name" /></label><label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email" /></label>{keyOf(profile,"Teacher") && <><label>Số điện thoại<input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} autoComplete="tel" /></label><label>Địa chỉ<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} autoComplete="street-address" /></label><p>Ngành dạy: <strong>{display(pick(profile,"Teacher.Major.Name"))}</strong></p><p>Trình độ: {display(pick(profile,"Teacher.Qualification"))}</p></>}</div><div className="form-actions"><button className="primary-button" disabled={!!busy}>{busy==="profile"?"Đang lưu...":"Lưu thông tin"}</button></div></form>
 <form className="feature-form" onSubmit={e=>submit(e,"password")}><h2>Đổi mật khẩu</h2><p>Xác nhận mật khẩu hiện tại trước khi đặt mật khẩu mới.</p><div className="profile-password-fields"><label>Mật khẩu hiện tại<input type="password" required autoComplete="current-password" value={password.currentPassword} onChange={e=>setPassword({...password,currentPassword:e.target.value})} /></label><label>Mật khẩu mới<input type="password" required minLength={6} autoComplete="new-password" value={password.newPassword} onChange={e=>setPassword({...password,newPassword:e.target.value})} /></label><label>Xác nhận mật khẩu mới<input type="password" required minLength={6} autoComplete="new-password" value={password.confirm} onChange={e=>setPassword({...password,confirm:e.target.value})} /></label></div><div className="form-actions"><button className="primary-button" disabled={!!busy}>{busy==="password"?"Đang đổi...":"Đổi mật khẩu"}</button></div></form>
 </div>}</section>;
}
