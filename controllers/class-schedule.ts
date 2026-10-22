import { idOf, keyOf, pick } from "./api.controller";
import { dayIndex } from "./teaching-schedule.controller";
import type { Row } from "@/models/dashboard";

export type ClassLesson = { date: string; startTime: string; endTime: string; session: string; offering: Row };

export function weeklyTeachingDates(start: string, count: number, weekdays: number[], end?: string): string[] {
  const cursor = new Date(`${start}T12:00:00Z`);
  if (!Number.isFinite(cursor.getTime()) || cursor.toISOString().slice(0,10) !== start || !Number.isInteger(count) || count < 1 || count > 120 || !weekdays.length || weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return [];
  const dates: string[] = [];
  for (let i = 0; i < 840 && dates.length < count; i++, cursor.setUTCDate(cursor.getUTCDate()+1)) {
    const date = cursor.toISOString().slice(0,10);
    if (end && date > end) break;
    if (weekdays.includes(cursor.getUTCDay())) dates.push(date);
  }
  return dates;
}

// Dates and lesson times belong to the school's timezone, regardless of browser timezone.
export function offeringStudyStatus(offering: Row, now: number): string {
  const status = String(keyOf(offering, "Status") || "open");
  if (status !== "open") return status;
  const lessons = classLessons(offering);
  if (lessons.length && lessons.every(lesson => {
    const end = Date.parse(`${lesson.date}T${lesson.endTime || "23:59:59"}+07:00`);
    return Number.isFinite(end) && end <= now;
  })) return "completed";
  if (pick(offering, "Semester.Status") === "closed") return "completed";
  return status;
}

export function classStudyStatus(classRow: Row, offerings: Row[], now: number): string {
  const status = String(keyOf(classRow, "Status") || "open");
  if (status !== "open") return status;
  return offerings.length > 0 && offerings.every(o => ["completed", "closed"].includes(offeringStudyStatus(o, now))) ? "completed" : status;
}
export function classLessons(offering: Row): ClassLesson[] {
  const start = String(pick(offering, "Semester.StartDate") || "").slice(0,10);
  const end = String(pick(offering, "Semester.EndDate") || "").slice(0,10);
  const lessons = new Map<string, ClassLesson>();
  for (const schedule of (keyOf(offering, "Schedules") || []) as Row[]) {
    const add = (date: string) => {
      const lesson = { date, startTime: String(keyOf(schedule,"StartTime") || ""), endTime: String(keyOf(schedule,"EndTime") || ""), session: String(keyOf(schedule,"Session") || ""), offering };
      lessons.set(`${idOf(offering)}:${date}:${lesson.startTime}:${lesson.endTime}:${lesson.session}`, lesson);
    };
    const date = String(keyOf(schedule,"FullDate") || "").slice(0,10);
    if (date && !date.startsWith("0001")) { add(date); continue; }
    if (!start || !end) continue;
    const cursor = new Date(`${start}T12:00:00Z`);
    if (Number.isNaN(cursor.getTime())) continue;
    for (let i=0; i<3660 && cursor.toISOString().slice(0,10)<=end; i++, cursor.setUTCDate(cursor.getUTCDate()+1)) {
      if (cursor.getUTCDay() === dayIndex(String(keyOf(schedule,"DayOfWeek") || ""))) add(cursor.toISOString().slice(0,10));
    }
  }
  return Array.from(lessons.values()).sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function overlappingLessons(lessons: ClassLesson[]): Set<ClassLesson> {
  const conflicts = new Set<ClassLesson>();
  const byDate = new Map<string, ClassLesson[]>();
  for (const lesson of lessons) { const bucket = byDate.get(lesson.date) || []; bucket.push(lesson); byDate.set(lesson.date,bucket); }
  for (const bucket of byDate.values()) for (let i=0;i<bucket.length;i++) for (let j=i+1;j<bucket.length;j++) {
    const a=bucket[i],b=bucket[j];
    const overlaps = a.startTime && a.endTime && b.startTime && b.endTime ? a.startTime < b.endTime && b.startTime < a.endTime : !!a.session && a.session === b.session;
    if (overlaps) { conflicts.add(a); conflicts.add(b); }
  }
  return conflicts;
}
