"use client";
import { TemporaryPassword } from "@/components/common/TemporaryPassword";
import { useEffect, useRef, useState } from "react";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { useErrorFeedback } from "@/components/common/ErrorFeedback";
import { Icon } from "@/components/ui/Icon";
import { apiRequest, display, idOf, inputDate, keyOf, pick } from "@/controllers/api.controller";
import type { MetadataData, Row, ToastHandler } from "@/models/dashboard";

function initialForm(student: Row | null) {
  const gender = String(keyOf(student,"Gender") ?? "").toLowerCase();
  return {
    studentCode: String(keyOf(student,"StudentCode") ?? ""), fullName: String(pick(student,"User.FullName") ?? ""), username: String(pick(student,"User.Username") ?? ""), email: String(pick(student,"User.Email") ?? ""), password: "",
    trainingSystem: String(keyOf(student,"TrainingSystem") || "CQ"), majorId: String(keyOf(student,"MajorID") || pick(student,"Class.MajorID") || ""), classId: String(keyOf(student,"ClassID") || ""),
    gender: ["nam","male","m"].includes(gender) ? "Nam" : ["nữ","nu","female","f"].includes(gender) ? "Nữ" : "", dateOfBirth: inputDate(keyOf(student,"DateOfBirth")), phone: String(keyOf(student,"Phone") ?? ""), address: String(keyOf(student,"Address") ?? ""), enrollmentDate: inputDate(keyOf(student,"EnrollmentDate")) || inputDate(new Date()),
  };
}

export function StudentEditorDialog({ token, student, metadata: initialMetadata, onClose, onSaved, onToast }: { token: string; student: Row | null; metadata: MetadataData; onClose: () => void; onSaved: () => void; onToast: ToastHandler }) {
  const editing = !!student;
  const [form,setForm]=useState(()=>initialForm(student)),[metadata,setMetadata]=useState(initialMetadata);
  const [loading,setLoading]=useState(true),[codeBusy,setCodeBusy]=useState(false),[saving,setSaving]=useState(false),[retry,setRetry]=useState(0),[identityRefresh,setIdentityRefresh]=useState(0);
  const [error,setError]=useErrorFeedback();
  const busy=useRef(false);
  const originalMajor=Number(keyOf(student,"MajorID") || pick(student,"Class.MajorID") || 0);
  useEffect(()=>{
    let current=true;const controller=new AbortController();
    apiRequest(token,"/metadata",{signal:controller.signal}).then(meta=>{if(current&&meta.data)setMetadata(meta.data);}).catch(e=>{if(current)setError(e instanceof Error?e.message:"Không tải được chuyên ngành và lớp");}).finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;controller.abort();};
  },[token,retry,setError]);
  useEffect(()=>{
    if(editing)return;
    // Synchronize the preview's loading indicator with the admission inputs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCodeBusy(Boolean(form.majorId));
    if(!form.majorId)return;
    let current=true;const controller=new AbortController();
    const year=form.enrollmentDate?.slice(0,4)||String(new Date().getFullYear());
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({majorId:form.majorId,fullName:form.fullName,year,trainingSystem:form.trainingSystem});
      apiRequest(token,`/students/generate-code?${params}`,{signal:controller.signal,cache:"no-store"}).then(result=>{
        if(!current)return;
        const identity=result.data;
        if(!identity||typeof identity.studentCode!=="string"||!/^\d{4}/.test(identity.studentCode)||typeof identity.username!=="string"||typeof identity.email!=="string"||(form.fullName.trim()&&!identity.email)){
          throw new Error("API đang trả thông tin tạo sinh viên phiên bản cũ hoặc chưa đầy đủ. Vui lòng khởi động lại Backend rồi bấm Tải lại dữ liệu.");
        }
        setForm(old=>({...old,studentCode:identity.studentCode,username:identity.username,email:identity.email}));
        setError("");
      }).catch(e=>{if(current){setForm(old=>({...old,studentCode:"",username:"",email:""}));setError(e instanceof Error?e.message:"Không tạo được mã, email và tên đăng nhập");}}).finally(()=>{if(current)setCodeBusy(false);});
    },350);
    return ()=>{current=false;clearTimeout(timer);controller.abort();};
  },[token,editing,form.majorId,form.fullName,form.trainingSystem,form.enrollmentDate,identityRefresh,setError]);
  const change=(key:keyof typeof form,value:string)=>{
    const identityChanged=!editing&&["majorId","fullName","trainingSystem","enrollmentDate"].includes(key);
    if(identityChanged)setCodeBusy(true);
    setForm(old=>({...old,[key]:value,...(key==="majorId"?{classId:""}:{}),...(identityChanged?{studentCode:"",username:"",email:""}:{})}));
  };
  const regenerate=()=>{if(!codeBusy&&!saving&&!editing&&form.majorId){setError("");setCodeBusy(true);setIdentityRefresh(value=>value+1);}};
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy.current||loading||codeBusy)return;
    if(!form.studentCode){setError("Chưa có mã sinh viên. Vui lòng bấm Tạo mã khác.");return;}
    if(!form.majorId){setError("Vui lòng chọn chuyên ngành đăng ký.");return;}
    if(!editing&&(!form.email||!form.username)){setError("Vui lòng nhập họ tên và chờ hệ thống tạo email, tên đăng nhập.");return;}
    busy.current=true;setSaving(true);setError("");
    try{
      const body={...form,autoIdentity:!editing,username:form.username.trim(),fullName:form.fullName.trim(),email:form.email.trim(),majorId:Number(form.majorId),classId:Number(form.classId)};
      const result=await apiRequest(token,editing?`/students/${idOf(student!)}`:"/students",{method:editing?"PUT":"POST",body:JSON.stringify(body)});
      onToast(result.message || (editing?"Đã cập nhật sinh viên":"Đã tạo sinh viên"),"success");onSaved();
    }catch(e){setError(e instanceof Error?e.message:"Không lưu được hồ sơ sinh viên");}
    finally{busy.current=false;setSaving(false);}
  };
  return <FeatureDialog title={editing?"Cập nhật hồ sơ sinh viên":"Tạo sinh viên mới"} description="Nhập thông tin cá nhân, chọn chuyên ngành và thiết lập tài khoản đăng nhập." className="student-editor-dialog" onClose={()=>{if(!busy.current)onClose();}}>
    <form className="student-editor" onSubmit={submit} aria-busy={saving}>
      <div className="student-editor-scroll">
        <div className="student-code-card"><span className="student-code-symbol"><Icon name="students" size={24}/></span><label>Mã sinh viên <span className="student-code-label">{editing?"Không thay đổi":"Tự động tạo"}</span><input readOnly value={form.studentCode} placeholder={codeBusy?"Đang tạo mã…":"Chưa có mã sinh viên"} aria-label="Mã sinh viên"/><small>{editing?"Mã định danh được giữ nguyên trong suốt quá trình học.":"Mã này sẽ được lưu cùng hồ sơ khi bạn xác nhận tạo sinh viên."}</small></label>{!editing&&<button type="button" className="refresh-button" disabled={codeBusy||saving||loading||!form.majorId} onClick={regenerate}><Icon name="refresh" size={15}/>{codeBusy?"Đang tạo…":"Tạo mã khác"}</button>}</div>
        {error&&<div className="student-editor-error" role="alert"><span>{error}</span><button type="button" className="refresh-button" disabled={loading||saving} onClick={()=>{setLoading(true);setCodeBusy(false);setIdentityRefresh(value=>value+1);setError("");setRetry(value=>value+1);}}>Tải lại dữ liệu</button></div>}
        <section className="student-editor-section"><header><span>01</span><div><h3>Thông tin cá nhân</h3><p>Các trường có dấu * là bắt buộc.</p></div></header><fieldset disabled={saving}>
          <label className="student-field-wide">Họ và tên <span>*</span><input required maxLength={150} value={form.fullName} onChange={e=>change("fullName",e.target.value)} placeholder="VD: Nguyễn Minh Anh" autoComplete="name"/></label>
          <label>Giới tính<select value={form.gender} onChange={e=>change("gender",e.target.value)}><option value="">Chọn giới tính</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></label>
          <label>Ngày sinh<input type="date" max={inputDate(new Date())} value={form.dateOfBirth} onChange={e=>change("dateOfBirth",e.target.value)}/></label>
          <label>Số điện thoại<input type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={e=>change("phone",e.target.value)} placeholder="Nhập số điện thoại"/></label>
          <label>{editing?"Email":"Email sinh viên · Tự động tạo"}<input type="email" maxLength={254} autoComplete="email" value={form.email} onChange={e=>change("email",e.target.value)} readOnly={!editing} placeholder={editing?"Email của sinh viên":!form.fullName.trim()?"Nhập họ tên để tạo email":!form.majorId?"Chọn chuyên ngành để tạo email":codeBusy?"Đang tạo email…":"Email tự tạo theo họ tên, ngành và STT"}/>{!editing&&<small>Email được tự tạo sau khi nhập họ tên và chọn chuyên ngành, ví dụ: ha.web00481@ppacademy.edu.vn.</small>}</label>
          <label className="student-field-wide">Địa chỉ<input maxLength={255} autoComplete="street-address" value={form.address} onChange={e=>change("address",e.target.value)} placeholder="Địa chỉ liên hệ của sinh viên"/></label>
        </fieldset></section>
        <section className="student-editor-section"><header><span>02</span><div><h3>Thông tin đào tạo</h3><p>Đăng ký chuyên ngành. Sinh viên sẽ được xếp lớp sau tại mục Lớp học.</p></div></header><fieldset disabled={saving||loading}>
          <label>Hệ đào tạo <span>*</span><select required disabled={editing} value={form.trainingSystem} onChange={e=>change("trainingSystem",e.target.value)}><option value="CQ">Chính quy (CQ)</option><option value="PLUS">Hệ Plus (PLUS)</option><option value="THS">Thạc sĩ (THS)</option><option value="TS">Tiến sĩ (TS)</option></select><small>Mã sinh viên: năm nhập học + hệ + mã ngành + STT.</small></label>
          <label>Chuyên ngành đăng ký <span>*</span><select required disabled={editing&&originalMajor>0} value={form.majorId} onChange={e=>change("majorId",e.target.value)}><option value="">Chọn chuyên ngành</option>{metadata.majors.map(row=><option key={idOf(row)} value={idOf(row)}>{display(keyOf(row,"Name"))}</option>)}</select>{editing&&originalMajor>0&&<small>Chuyên ngành đã đăng ký được giữ nguyên.</small>}</label>
          <label>Ngày nhập học<input type="date" value={form.enrollmentDate} onChange={e=>change("enrollmentDate",e.target.value)}/></label>
        </fieldset></section>
        <section className="student-editor-section"><header><span>03</span><div><h3>Tài khoản đăng nhập</h3><p>Sinh viên sử dụng tài khoản này để truy cập ứng dụng.</p></div></header><fieldset disabled={saving}>
          <label>Tên đăng nhập <span>*</span><input required maxLength={100} autoCapitalize="none" autoComplete="off" readOnly={!editing} spellCheck={false} value={form.username} onChange={e=>change("username",e.target.value)} placeholder="Nhập tên đăng nhập"/></label>
          <label>{editing?"Mật khẩu mới":"Mật khẩu tạm thời *"}<TemporaryPassword value={form.password} onChange={value=>change("password",value)} required={!editing} disabled={saving}/></label>
        </fieldset></section>
      </div>
      <footer className="student-editor-footer"><span><Icon name="check" size={15}/>{editing?"Kiểm tra thông tin trước khi cập nhật.":"Hồ sơ chỉ được lưu khi bấm Tạo sinh viên."}</span><button className="refresh-button" type="button" disabled={saving} onClick={onClose}>Hủy bỏ</button><button className="primary-button" type="submit" disabled={loading||saving||codeBusy||!form.studentCode}><Icon name={editing?"check":"userPlus"} size={16}/>{saving?"Đang lưu…":editing?"Lưu thay đổi":"Tạo sinh viên"}</button></footer>
    </form>
  </FeatureDialog>;
}
