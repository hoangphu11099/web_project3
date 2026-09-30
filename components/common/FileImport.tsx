"use client";

import { useRef, useState } from "react";
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

  const importFile = async (file?: File) => {
    if (!file) return;

    setBusy(true);

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

      const total = Number(result.total || 0);
      const success = Number(result.success || 0);
      const failed = Math.max(total - success, 0);

      if (total === 0) {
        onToast("File không có dữ liệu hợp lệ để import");
        return;
      }

      if (success === 0) {
        const firstError =
          result.errors?.[0] || "Không có bản ghi nào được thêm";

        onToast(`Import thất bại: ${firstError}`);
        return;
      }

      let message = `Import hoàn tất · Thành công ${success}/${total}`;

      if (failed > 0) {
        message += ` · Lỗi ${failed}`;

        if (result.errors?.length) {
          message += `: ${result.errors[0]}`;
        }
      }

      onToast(message);

      // Chỉ tải lại bảng nếu thực sự có dòng thành công.
      onDone();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Không nhập được danh sách",
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
        onClick={() => inputRef.current?.click()}>
        <Icon name="upload" size={15} />

        {busy ? "Đang nhập..." : "Nhập Excel/CSV"}
      </button>
    </>
  );
}
