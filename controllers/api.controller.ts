import type { MetadataData, Row } from "@/models/dashboard";
/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export async function apiRequest(token: string, path: string, options: RequestInit = {}) {
  if (!API_BASE) throw new Error("Chưa cấu hình NEXT_PUBLIC_API_URL trong .env.local");
  const headers = new Headers(options.headers ?? {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) throw new Error(`Yêu cầu thất bại (${response.status})`);
    return response;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Yêu cầu thất bại (${response.status})`);
  return payload;
}

export function keyOf(obj: unknown, key: string): any {
  if (obj == null || typeof obj !== "object") return undefined;
  const record = obj as Row;
  if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  const match = Object.keys(record).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  return match ? record[match] : undefined;
}

export function pick(row: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => keyOf(value, key), row);
}

export function idOf(row: Row) { return Number(keyOf(row, "id") ?? 0); }

export function display(value: unknown) {
  if (value === true) return "Hoạt động";
  if (value === false) return "Đã khóa";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
  }
  return String(value);
}

export function inputDate(value: unknown, withTime = false) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, withTime ? 16 : 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${base}T${pad(date.getHours())}:${pad(date.getMinutes())}` : base;
}

export function statusLabel(value: unknown) {
  const raw = String(value ?? "").toLowerCase();
  const map: Record<string, string> = {
    planned: "Sắp tới", active: "Hoạt động", open: "Đang mở", closed: "Đã đóng", pending: "Chờ phản hồi",
    accepted: "Đã chấp nhận", rejected: "Đã từ chối", approved: "Đã duyệt", draft: "Bản nháp",
    present: "Có mặt", absent: "Vắng", late: "Đi trễ", excused: "Có phép", sent: "Đã gửi",
    created: "Đã tạo", failed: "Gửi lỗi", enrolled: "Đã đăng ký",
  };
  return map[raw] ?? display(value);
}

export function optionLabel(optionKey: keyof MetadataData, row: Row) {
  if (optionKey === "academicYears") return display(keyOf(row, "Name"));
  if (optionKey === "majors") return `${display(keyOf(row, "code"))} · ${display(keyOf(row, "name"))}`;
  if (optionKey === "semesters") return `${display(keyOf(row, "name"))}${String(keyOf(row, "status")).toLowerCase() === "active" ? " · đang hoạt động" : ""}`;
  if (optionKey === "rooms") return `${display(keyOf(row, "name"))} · ${display(keyOf(row, "building"))}`;
  if (optionKey === "courses") return `${display(keyOf(row, "code"))} · ${display(keyOf(row, "name"))}`;
  if (optionKey === "teachers") return `${display(keyOf(row, "teacherCode"))} · ${display(pick(row, "User.FullName"))}`;
  if (optionKey === "classes") return `${display(keyOf(row, "classCode"))} · ${display(pick(row, "Major.Name"))}`;
  return display(idOf(row));
}
