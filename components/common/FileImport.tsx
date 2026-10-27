"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import type { ToastHandler } from "@/models/dashboard";
import { Icon } from "@/components/ui/Icon";

export function FileImport({
  token,
  kind,
  onToast,
  onDone,
}: {
  token: string;
  kind: "students" | "teachers";
  onToast: ToastHandler;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const columns = kind === "students"
    ? ["username", "password", "email", "fullName", "studentCode", "classId", "classCode", "gender", "phone", "address", "dateOfBirth"]
    : ["username", "password", "email", "fullName", "teacherCode", "phone", "address", "qualification", "majorCode"];
  const example = kind === "students"
    ? ["sv_mau_01", "", "sv01@example.com", "Nguyễn Văn An", "", "", "THAY_MA_LOP", "Nam", "0901234567", "Hà Nội", "2005-08-18"]
    : ["gv_mau_01", "", "gv01@example.com", "Trần Thị Bình", "", "0901234567", "Hà Nội", "Thạc sĩ", ""];

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  const downloadTemplate = () => {
    const csv = [columns, example].map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mau-import-${kind}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file?: File) => {
    if (!file) return;

    setBusy(true);
    setErrors([]);

    try {
      const body = new FormData();
      body.append("file", file);

      const payload = await apiRequest(token, `/import/${kind}`, {
        method: "POST",
        body,
      });

      const result = (payload.result || {}) as {
        total?: number;
        success?: number;
        errors?: string[];
      };

      setErrors(result.errors || []);
      const total = Number(result.total || 0);
      const success = Number(result.success || 0);
      const failed = Math.max(total - success, 0);

      if (total === 0) {
        onToast("File không có dữ liệu hợp lệ để import", "error");
        return;
      }

      if (success === 0) {
        const firstError =
          result.errors?.[0] || "Không có bản ghi nào được thêm";

        onToast(`Import thất bại: ${firstError}`, "error");
        return;
      }

      let message = `Import hoàn tất · Thành công ${success}/${total}`;

      if (failed > 0) {
        message += ` · Lỗi ${failed}`;

        if (result.errors?.length) {
          message += `: ${result.errors[0]}`;
        }
      }

      onToast(message, failed > 0 ? "error" : "success");

      // Chỉ tải lại bảng nếu thực sự có dòng thành công.
      onDone();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Import thất bại"]);
      onToast(
        error instanceof Error ? error.message : "Không nhập được danh sách",
        "error",
      );
    } finally {
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".xlsx,.xlsm,.csv,.tsv"
        onChange={(event) => importFile(event.target.files?.[0])}
      />

      <button
        type="button"
        className="refresh-button"
        disabled={busy}
        onClick={() => setOpen(true)}>
        <Icon name="upload" size={15} />

        {busy ? "Đang nhập..." : "Nhập Excel/CSV"}
      </button>
      <dialog ref={dialogRef} className="file-import-dialog" onCancel={(event) => { if (busy) event.preventDefault(); else setOpen(false); }} onClose={() => setOpen(false)} aria-labelledby={`import-title-${kind}`}>
        <h2 id={`import-title-${kind}`}>Nhập danh sách {kind === "students" ? "sinh viên" : "giảng viên"}</h2>
        <p>Tải file mẫu, thay dòng ví dụ bằng dữ liệu thực tế rồi chọn file để nhập.</p>
        <ul>
          <li>Hỗ trợ .xlsx, .xlsm, .csv, .tsv. Excel chỉ đọc sheet đầu tiên; không hỗ trợ .xls.</li>
          <li>Giữ nguyên tên và thứ tự các cột, kể cả cột để trống. Không gộp ô hoặc thêm tiêu đề phía trên.</li>
          <li>username bắt buộc. Cột password không bắt buộc: có thể để trống để hệ thống tự cấp mật khẩu mặc định 123456. Username đã tồn tại cùng vai trò sẽ được cập nhật và đặt lại mật khẩu.</li>
          {kind === "students" && <li>Cột studentCode (mã sinh viên) không bắt buộc: để trống để hệ thống tự sinh mã khi thêm sinh viên mới. File mẫu đã để trống studentCode và password; giữ nguyên hai cột này, không cần nhập giá trị.</li>}
          <li>Mã sinh viên/giảng viên để trống sẽ tự sinh. Mã tự nhập phải duy nhất. Đặt cột điện thoại và mã ở định dạng Text để giữ số 0 đầu.</li>
          {kind === "students" ? <li>Điền classCode là mã lớp đã có trong hệ thống (thay THAY_MA_LOP trong mẫu), hoặc classId là ID lớp. Nếu điền cả hai, ưu tiên classCode. Ngày sinh dùng YYYY-MM-DD, ví dụ 2005-08-18.</li> : <li>majorCode có thể để trống; nếu điền phải là mã ngành đang hoạt động trong hệ thống.</li>}
        </ul>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table"><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody><tr>{example.map((value, index) => <td key={columns[index]}>{value || "(để trống)"}</td>)}</tr></tbody></table>
        </div>
        {errors.length > 0 && <div role="alert"><p>Các dòng chưa nhập được:</p><ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
        <div className="form-actions" style={{ marginTop: 20 }}>
          <button type="button" className="refresh-button" onClick={downloadTemplate}>Tải file mẫu CSV</button>
          <button type="button" className="primary-button" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "Đang nhập..." : "Chọn file để nhập"}</button>
          <button type="button" className="refresh-button" disabled={busy} onClick={() => setOpen(false)}>Đóng</button>
        </div>
      </dialog>
    </>
  );
}
