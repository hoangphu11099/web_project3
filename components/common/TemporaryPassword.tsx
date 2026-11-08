"use client";
import { useState } from "react";

export function TemporaryPassword({ value, onChange, required = false, disabled = false }: { value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  const generate = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    onChange(Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(""));
    setVisible(true);
  };
  return <div style={{display:"grid",gap:8}}>
    <input aria-label="Mật khẩu tạm thời" type={visible?"text":"password"} autoComplete="new-password" required={required} disabled={disabled} minLength={6} maxLength={72} value={value} onChange={event=>onChange(event.target.value)} placeholder={required?"Tự nhập hoặc bấm Tạo ngẫu nhiên":"Để trống để giữ mật khẩu hiện tại"}/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button type="button" className="refresh-button" disabled={disabled} onClick={generate}>Tạo ngẫu nhiên</button>
      <button type="button" className="refresh-button" disabled={disabled||!value} onClick={()=>setVisible(!visible)}>{visible?"Ẩn mật khẩu":"Hiện mật khẩu"}</button>
    </div>
    <small>Ghi lại mật khẩu để bàn giao. Người dùng bắt buộc đổi mật khẩu khi đăng nhập lần đầu trên web hoặc app.</small>
  </div>;
}
