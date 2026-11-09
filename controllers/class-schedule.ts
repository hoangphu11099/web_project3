import { idOf, keyOf, pick } from "./api.controller";
import { dayIndex } from "./teaching-schedule.controller";
import type { Row } from "@/models/dashboard";

export type ClassLesson = { date: string; startTime: string; endTime: string; session: string; offering: Row; scheduleId?: number };

export type ClassScheduleFilter = { semesterId: string; courseId: string; from: string; to: string };
export function matchesClassScheduleOffering(offering: Row, filter: ClassScheduleFilter): boolean {
  return (!filter.semesterId || String(keyOf(offering,"SemesterID")) === filter.semesterId) && (!filter.courseId || String(keyOf(offering,"CourseID")) === filter.courseId);
}
export function filterClassLessons(lessons: ClassLesson[], filter: ClassScheduleFilter): ClassLesson[] {
  if (filter.from && filter.to && filter.from > filter.to) return [];
  return lessons.filter(l => matchesClassScheduleOffering(l.offering,filter) && (!filter.from || l.date >= filter.from) && (!filter.to || l.date <= filter.to))
    .sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}
export function classScheduleDateRange(preset: "all" | "today" | "week" | "month", now: number): { from: string; to: string } {
  if (preset === "all") return {from:"",to:""};
  const today = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now));
  const start = new Date(`${today}T12:00:00Z`), end = new Date(start);
  if (preset === "week") {
    const offset = (start.getUTCDay()+6)%7;
    start.setUTCDate(start.getUTCDate()-offset); end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate()+6);
  } else if (preset === "month") {
    start.setUTCDate(1); end.setUTCMonth(end.getUTCMonth()+1,0);
  }
  return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
}

export function weekdaysForStartDate(selected: number[], previous: string, next: string): number[] {
  const weekday = (value: string) => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value ? date.getUTCDay() : -1;
  };
  const nextDay = weekday(next);
  if (next && nextDay < 0) return selected;
  const extraDays = selected.filter(day => day !== weekday(previous));
  return [...new Set(nextDay < 0 ? extraDays : [...extraDays, nextDay])];
}

export function assignmentConflicts(offerings: Row[], plan: Pick<ClassLesson, "date" | "startTime" | "endTime">[], resource: "TeacherID" | "RoomID" | "ClassID", resourceId: string, excludedOfferingId = 0): ClassLesson[] {
  if (!resourceId) return [];
  return offerings.filter(o => keyOf(o, "Status") === "open" && idOf(o) !== excludedOfferingId && Number(keyOf(o, resource)) === Number(resourceId))
    .flatMap(classLessons).filter(lesson => plan.some(p => p.date === lesson.date && p.startTime.slice(0,5) < lesson.endTime.slice(0,5) && lesson.startTime.slice(0,5) < p.endTime.slice(0,5)));
}

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

export function exerciseOfferingEnded(offering: Row, now: number): boolean {
  if (keyOf(offering,"Status") !== "open" || keyOf(offering,"HomeroomStatus") === "closed" || pick(offering,"Class.Status") === "closed") return true;
  const lessons = classLessons(offering);
  if (lessons.length) return lessons.every(lesson => Date.parse(`${lesson.date}T${lesson.endTime || "23:59"}+07:00`) <= now);
  const end = String(pick(offering,"Semester.EndDate") || "").slice(0,10);
  const today = new Date(now+7*3600000).toISOString().slice(0,10);
  return pick(offering,"Semester.Status") === "closed" || (!!end && end < today);
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
      const lesson = { date, startTime: String(keyOf(schedule,"StartTime") || ""), endTime: String(keyOf(schedule,"EndTime") || ""), session: String(keyOf(schedule,"Session") || ""), offering, scheduleId: idOf(schedule) };
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
