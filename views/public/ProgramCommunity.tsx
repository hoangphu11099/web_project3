"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import { Icon } from "@/components/ui/Icon";
import { samplePosts } from "@/models/publicContent";
import type { Program } from "@/models/programs";
import type { SchoolPost, SiteSettings } from "@/models/publicWebsite";

export function ConsultationForm({ program, settings }: { program: Program; settings: SiteSettings }) {
  const [form, setForm] = useState({fullName:"",phone:"",email:"",location:"",preferredSession:"",message:"",consent:false,website:""});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const change = (key: string, value: string | boolean) => setForm(current => ({...current,[key]:value}));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true);setError("");
    try {
      const payload = await apiRequest("","/public/consultations",{method:"POST",body:JSON.stringify({...form,program:program.name})});
      setSuccess(`${payload.message} · Mã đăng ký #${payload.reference}`);
      setForm({fullName:"",phone:"",email:"",location:"",preferredSession:"",message:"",consent:false,website:""});
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Chưa gửi được đăng ký. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };
  return <section className="public-container consultation-section" id="program-contact"><div className="consultation-intro"><span className="consultation-icon"><Icon name="mail" size={28} /></span><p className="public-section-label">CÙNG BẠN CHỌN HƯỚNG ĐI</p><h2>Đăng ký<br />tư vấn nhanh</h2><p>Tìm hiểu ngành <strong>{program.name}</strong> cùng {settings.schoolName}.</p><div><Icon name="check" size={17} /> Tư vấn lộ trình theo mục tiêu của bạn</div><div><Icon name="check" size={17} /> Trao đổi về lịch học và điều kiện tham gia</div><a href={`tel:${settings.phone.replace(/[^+0-9]/g,"")}`}><Icon name="phone" size={18} />{settings.phone}</a></div>
    {success ? <div className="consultation-success" role="status"><span><Icon name="check" size={32} /></span><h3>Đã nhận thông tin của bạn!</h3><p>{success}</p><button type="button" className="public-secondary" onClick={() => setSuccess("")}>Gửi đăng ký khác</button></div> : <form onSubmit={submit} className="consultation-form"><div className="consultation-selected"><small>NGÀNH BẠN QUAN TÂM</small><strong>{program.name}</strong></div><div className="consultation-fields">
      <label className="consultation-wide">Họ và tên <span>*</span><input required autoComplete="name" minLength={2} maxLength={120} placeholder="Nhập họ và tên của bạn" value={form.fullName} onChange={e => change("fullName",e.target.value)} /></label>
      <label>Số điện thoại <span>*</span><input required type="tel" autoComplete="tel" maxLength={30} placeholder="Số điện thoại liên hệ" value={form.phone} onChange={e => change("phone",e.target.value)} /></label>
      <label>Email <span>*</span><input required type="email" autoComplete="email" maxLength={254} placeholder="email@example.com" value={form.email} onChange={e => change("email",e.target.value)} /></label>
      <label>Địa điểm / Hình thức quan tâm <span>*</span><select required value={form.location} onChange={e => change("location",e.target.value)}><option value="">Chọn nhu cầu của bạn</option><option value={settings.address}>Trực tiếp · {settings.address}</option><option value="Online">Quan tâm học online</option><option value="Cần tư vấn địa điểm">Cần tư vấn thêm về địa điểm</option></select></label>
      <label>Thời gian học mong muốn <span>*</span><select required value={form.preferredSession} onChange={e => change("preferredSession",e.target.value)}><option value="">Chọn khung thời gian</option><option>Sáng</option><option value="Chiều">Trưa / Chiều</option><option>Tối</option><option>Linh hoạt</option></select></label>
      <label className="consultation-wide">Bạn muốn được tư vấn thêm điều gì?<textarea maxLength={2000} rows={3} placeholder="Mục tiêu học tập, kiến thức hiện tại hoặc câu hỏi của bạn…" value={form.message} onChange={e => change("message",e.target.value)} /></label>
    </div><label className="consultation-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e => change("website",e.target.value)} /></label>
    <label className="consultation-consent"><input required type="checkbox" checked={form.consent} onChange={e => change("consent",e.target.checked)} /><span>Tôi đồng ý để {settings.schoolName} lưu thông tin đăng ký và liên hệ với tôi nhằm tư vấn ngành học đã chọn.</span></label>
    <p className="consultation-note">Khung giờ và hình thức bạn chọn là nguyện vọng để tư vấn, chưa phải xác nhận mở lớp.</p>
    {error && <p className="consultation-error" role="alert">{error}</p>}<button className="public-primary" disabled={busy}><Icon name="mail" size={17} />{busy ? "Đang gửi đăng ký…" : "Gửi đăng ký tư vấn"}<Icon name="arrowRight" size={18} /></button>
    </form>}
  </section>;
}

type Faculty = {id:number;name:string;qualification:string;major:string;biography?:string;avatarUrl?:string};
export function ProgramCommunity() {
  const [stories, setStories] = useState<SchoolPost[]>(samplePosts);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("","/public/posts",{signal:controller.signal}).then(payload => {if(controller.signal.aborted)return;const published=(payload.data || []).filter((post:SchoolPost)=>post.category === "student");setStories(published.length ? published : samplePosts);}).catch(()=>{});
    apiRequest("","/public/faculty",{signal:controller.signal}).then(payload => {setFaculty(Array.isArray(payload.data) ? payload.data : []);setState("ready");}).catch(() => {if (!controller.signal.aborted) setState("error");});
    return () => controller.abort();
  }, []);
  const pages = Math.ceil(faculty.length / 3);
  return <section className="degree-community"><div className="public-container"><div className="degree-section-title"><p className="public-section-label">NHỮNG NGƯỜI ĐỒNG HÀNH</p><h2>Đội ngũ giảng viên PP Academy</h2><p>Tìm hiểu chuyên môn và lĩnh vực giảng dạy của đội ngũ nhà trường.</p></div>
    {state === "loading" ? <p className="faculty-empty" role="status">Đang tải thông tin giảng viên…</p> : !faculty.length ? <div className="faculty-empty"><Icon name="teacher" size={36} /><p>{state === "error" ? "Chưa tải được thông tin giảng viên. Vui lòng thử lại khi kết nối ổn định." : "Hồ sơ giảng viên đang được cập nhật."}</p><span>Liên hệ nhà trường để tìm hiểu đội ngũ phụ trách ngành bạn quan tâm.</span></div> : <><div className="faculty-grid" aria-live="polite">{faculty.slice(page*3,page*3+3).map(teacher => <article className="faculty-card" key={teacher.id}><div className="faculty-avatar" aria-hidden="true"><Icon name="teacher" size={48} />{teacher.avatarUrl && <img src={teacher.avatarUrl} alt="" onError={event=>{event.currentTarget.style.display="none";}} />}</div><small>GIẢNG VIÊN PP ACADEMY</small><h3>{teacher.name}</h3><p>{teacher.major || "Chuyên môn đang cập nhật"}</p>{teacher.qualification && <div><Icon name="grade" size={16} />{teacher.qualification}</div>}<div className="faculty-biography">{teacher.biography || `${teacher.name} là giảng viên${teacher.major ? ` thuộc chuyên ngành ${teacher.major}` : ""} tại PP Academy.${teacher.qualification ? ` Trình độ chuyên môn: ${teacher.qualification}.` : ""}`}</div></article>)}</div>{pages > 1 && <div className="faculty-pagination" role="group" aria-label="Các trang giảng viên"><button disabled={page===0} onClick={() => setPage(p=>p-1)} aria-label="Giảng viên trang trước"><Icon name="arrowLeft" size={18} /></button>{Array.from({length:pages},(_,index) => <button key={index} aria-label={`Trang giảng viên ${index+1}`} aria-pressed={page===index} onClick={() => setPage(index)}>{index+1}</button>)}<button disabled={page===pages-1} onClick={() => setPage(p=>p+1)} aria-label="Giảng viên trang tiếp"><Icon name="arrowRight" size={18} /></button></div>}</>}
    <div className="degree-section-title student-story-heading"><p className="public-section-label">GÓC NHÌN TỪ HÀNH TRÌNH HỌC TẬP</p><h2>Câu chuyện sinh viên</h2><p>Khám phá những hành trình học ngành, thực hiện đồ án và xây dựng hướng đi riêng.</p></div><div className="community-story-grid">{stories.slice(0,2).map(post => <a key={post.slug} className="community-story" href={`#bai-viet/${post.slug}`}><img src={post.coverImageUrl} alt="" loading="lazy" /><div><small>{post.id < 0 ? "CÂU CHUYỆN MINH HỌA" : "GÓC SINH VIÊN"}</small><h3>{post.title}</h3><p>{post.excerpt}</p><span>Đọc câu chuyện <Icon name="arrowRight" size={17} /></span></div></a>)}</div>
  </div></section>;
}
