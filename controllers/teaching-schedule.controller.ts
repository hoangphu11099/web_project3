import { keyOf } from "@/controllers/api.controller";
import type { Row } from "@/models/dashboard";
import type { TeachingSchedule, TeachingState } from "@/models/teaching-schedule";

export type TeachingOccurrence = {
  item: TeachingSchedule;
  date: Date;
  state: TeachingState;
};

const dayAliases: Record<string, number> = {
  sun: 0, sunday: 0, "chủ nhật": 0, cn: 0,
  mon: 1, monday: 1, "thứ 2": 1, "thứ hai": 1,
  tue: 2, tuesday: 2, "thứ 3": 2, "thứ ba": 2,
  wed: 3, wednesday: 3, "thứ 4": 3, "thứ tư": 3,
  thu: 4, thursday: 4, "thứ 5": 4, "thứ năm": 4,
  fri: 5, friday: 5, "thứ 6": 5, "thứ sáu": 5,
  sat: 6, saturday: 6, "thứ 7": 6, "thứ bảy": 6,
};

const labels = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function text(row: Row, key: string) { return String(keyOf(row, key) ?? ""); }
function number(row: Row, key: string) { return Number(keyOf(row, key) ?? 0); }

export function normalizeTeacherSchedules(payload: { data?: unknown }): TeachingSchedule[] {
  const rows = Array.isArray(payload.data) ? payload.data as Row[] : [];
  return rows.map((row) => ({
    id: number(row, "id"), courseOfferingId: number(row, "courseOfferingId"), classId: number(row, "classId"),
    classCode: text(row, "classCode"), majorName: text(row, "majorName"), courseCode: text(row, "courseCode"),
    courseName: text(row, "courseName"), roomName: text(row, "roomName"), building: text(row, "building"),
    teachingDate: text(row, "teachingDate"), dayOfWeek: text(row, "dayOfWeek"), session: text(row, "session"), startTime: text(row, "startTime").slice(0, 5),
    endTime: text(row, "endTime").slice(0, 5), semesterName: text(row, "semesterName"),
    semesterStartDate: text(row, "semesterStartDate"), semesterEndDate: text(row, "semesterEndDate"),
    offeringStatus: text(row, "offeringStatus"),
  })).sort((a, b) => sortDay(a.dayOfWeek) - sortDay(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
}

export function dayIndex(value: string) { return dayAliases[value.trim().toLowerCase()] ?? -1; }
function sortDay(value: string) { const index = dayIndex(value); return index === 0 ? 7 : index < 0 ? 8 : index; }
export function dayLabel(value: string) { const index = dayIndex(value); return index >= 0 ? labels[index] : value || "Chưa xác định"; }
export function timeRange(item: TeachingSchedule) { return `${item.startTime || "—"} – ${item.endTime || "—"}`; }

export function startOfTeachingWeek(value = new Date()) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const offsetFromMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
  date.setDate(date.getDate() - offsetFromMonday);
  return date;
}

export function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function formatTeachingDate(value: Date, includeWeekday = true) {
  return new Intl.DateTimeFormat("vi-VN", {
    ...(includeWeekday ? { weekday: "long" as const } : {}),
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function formatTeachingWeek(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  return `${formatTeachingDate(weekStart, false)} – ${formatTeachingDate(weekEnd, false)}`;
}

function localDate(value: string, endOfDay = false) {
  if (!value) return null;
  const parts = value.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : -1;
}

function sameLocalDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isDateInsideSemester(item: TeachingSchedule, date: Date) {
  const start = localDate(item.semesterStartDate);
  const end = localDate(item.semesterEndDate, true);
  const checked = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  return (!start || checked >= start) && (!end || checked <= end) && item.offeringStatus.toLowerCase() === "open";
}

export function scheduleDateInWeek(item: TeachingSchedule, weekStart: Date) {
  if (item.teachingDate) {
    const date = localDate(item.teachingDate);
    const start = startOfTeachingWeek(weekStart);
    return date && date >= start && date < addDays(start, 7) ? date : null;
  }
  const index = dayIndex(item.dayOfWeek);
  if (index < 0) return null;
  return addDays(startOfTeachingWeek(weekStart), index === 0 ? 6 : index - 1);
}

export function teachingStateForDate(item: TeachingSchedule, lessonDate: Date, now = new Date()): TeachingState {
  if (!isDateInsideSemester(item, lessonDate)) return "outside";
  if (!sameLocalDate(lessonDate, now)) return lessonDate < now ? "finished" : "scheduled";

  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutes(item.startTime);
  const end = minutes(item.endTime);
  if (start < 0 || end < 0) return "scheduled";
  if (current < start) return "upcoming";
  if (current <= end) return "current";
  return "finished";
}

export function schedulesForWeek(rows: TeachingSchedule[], weekStart: Date, now = new Date()): TeachingOccurrence[] {
  return rows.flatMap((item) => {
    const date = scheduleDateInWeek(item, weekStart);
    if (!date || !isDateInsideSemester(item, date)) return [];
    return [{ item, date, state: teachingStateForDate(item, date, now) }];
  }).sort((a, b) => a.date.getTime() - b.date.getTime() || a.item.startTime.localeCompare(b.item.startTime));
}

export function isActiveSemester(item: TeachingSchedule, now = new Date()) {
  const start = localDate(item.semesterStartDate); const end = localDate(item.semesterEndDate, true);
  return (!start || now >= start) && (!end || now <= end) && item.offeringStatus.toLowerCase() === "open";
}

export function teachingState(item: TeachingSchedule, now = new Date()): TeachingState {
  if (!isActiveSemester(item, now)) return "outside";
  if (item.teachingDate) { const date = localDate(item.teachingDate); return date ? teachingStateForDate(item, date, now) : "outside"; }
  if (dayIndex(item.dayOfWeek) !== now.getDay()) return "scheduled";
  const current = now.getHours() * 60 + now.getMinutes(); const start = minutes(item.startTime); const end = minutes(item.endTime);
  if (start < 0 || end < 0) return "scheduled";
  if (current < start) return "upcoming";
  if (current <= end) return "current";
  return "finished";
}

export function teachingStateLabel(state: TeachingState) {
  return { current: "Đang dạy", upcoming: "Sắp diễn ra", finished: "Đã kết thúc", scheduled: "Đã lên lịch", outside: "Ngoài học kỳ" }[state];
}

export function todaySchedules(rows: TeachingSchedule[], now = new Date()) {
  return rows.filter((item) => (item.teachingDate ? Boolean(localDate(item.teachingDate) && sameLocalDate(localDate(item.teachingDate)!, now)) : dayIndex(item.dayOfWeek) === now.getDay()) && isActiveSemester(item, now));
}
