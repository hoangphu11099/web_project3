"use client";

import { useEffect, useRef, useState } from "react";
import { display, keyOf, pick } from "@/controllers/api.controller";
import type { Row } from "@/models/dashboard";
import { Icon } from "@/components/ui/Icon";
import { AttendanceQr } from "./AttendanceQr";

export function AttendanceProjection({ session, records, code, ttl, active, syncError, loaded, onClose }: {
  session: Row; records: Row[]; code: string; ttl: number; active: boolean;
  syncError: string; loaded: boolean; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  useEffect(() => {
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    const update = () => setFullscreen(document.fullscreenElement === dialog);
    document.addEventListener("fullscreenchange", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      if (document.fullscreenElement === dialog) void document.exitFullscreen().catch(() => {});
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === dialogRef.current) await document.exitFullscreen();
      else await dialogRef.current?.requestFullscreen();
      setFullscreenError("");
    } catch { setFullscreenError("Không thể bật toàn màn hình. Bạn vẫn có thể trình chiếu trong cửa sổ này."); }
  };
  const scanned = records.filter(record => keyOf((keyOf(record, "attendance") || {}) as Row, "CheckedInAt")).length;
  return <dialog ref={dialogRef} className="attendance-projection" aria-labelledby="attendance-projection-title"
    onCancel={event => { event.preventDefault(); /* Escape must not reveal the management screen on TV. */ }}>
    <header className="projection-header">
      <div><p>PP ACADEMY · ĐIỂM DANH LỚP HỌC</p><h1 id="attendance-projection-title">{display(pick(session, "Class.ClassCode"))}</h1><span>{display(pick(session, "Course.Name"))}</span></div>
      <div className="projection-actions"><button type="button" className="refresh-button" onClick={toggleFullscreen}><Icon name={fullscreen ? "minimize" : "maximize"} size={16} /> {fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}</button><button type="button" className="refresh-button" onClick={onClose}><Icon name="close" size={16} /> Đóng trình chiếu</button></div>
    </header>
    {fullscreenError && <p className="projection-notice" role="status">{fullscreenError}</p>}
    <div className="projection-content">
      <section className="projection-scan" aria-label="Quét mã điểm danh">
        <span className="projection-label">{active ? "QUÉT MÃ ĐỂ ĐIỂM DANH" : "PHIÊN ĐÃ DỪNG NHẬN QR"}</span>
        <div className="projection-qr">{active && ttl > 0 && code ? <AttendanceQr value={code} /> : <p>{active ? "Đang cập nhật mã QR…" : "Đã kết thúc quét mã"}</p>}</div>
        <h2>{active ? "Mở ứng dụng sinh viên và quét mã" : "Giảng viên kiểm tra và xác nhận kết quả"}</h2>
        <p>{active && ttl > 0 ? `Mã tự làm mới sau ${ttl} giây` : "Vui lòng chờ hướng dẫn của giảng viên"}</p>
        <small>Quét thành công sẽ hiển thị trong danh sách bên cạnh.</small>
      </section>
      <section className="projection-roster" aria-label="Danh sách sinh viên">
        <header><div><h2>Danh sách sinh viên</h2><p>Trạng thái quét mã cập nhật tự động</p></div><strong>{scanned}<span> / {records.length}</span><small>đã quét QR</small></strong></header>
        <p className={`projection-sync${syncError ? " is-error" : ""}`} role="status">{syncError ? "Kết nối đang gián đoạn · Đang thử cập nhật lại" : active ? "● Đang cập nhật trực tiếp · Chờ giảng viên xác nhận" : "Đã dừng nhận mã QR"}</p>
        <div className="projection-students">
          {!records.length && <p className="projection-empty">{loaded ? "Không có sinh viên trong phiên này." : "Đang tải danh sách sinh viên…"}</p>}
          {records.map((record, index) => {
            const attendance = (keyOf(record, "attendance") || {}) as Row;
            const checked = Boolean(keyOf(attendance, "CheckedInAt"));
            return <div className={`projection-student${checked ? " is-scanned" : ""}`} key={String(pick(record, "enrollment.ID") || index)}>
              <span className="projection-number">{index + 1}</span><div><strong>{display(pick(record, "enrollment.Student.User.FullName"))}</strong><small>{display(pick(record, "enrollment.Student.StudentCode"))}</small></div><span className="projection-status">{checked && <Icon name="check" size={14} />} {checked ? "Đã quét" : "Chờ quét"}</span>
            </div>;
          })}
        </div>
      </section>
    </div>
  </dialog>;
}
