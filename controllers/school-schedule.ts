import { classLessons, type ClassLesson } from "./class-schedule";
import { keyOf } from "./api.controller";
import type { Row } from "@/models/dashboard";

export const schoolShifts = ["Sáng", "Trưa / Chiều", "Tối"] as const;
export function lessonShift(start: string) {
  const hour = Number(start.split(":")[0]);
  return hour < 12 ? schoolShifts[0] : hour < 18 ? schoolShifts[1] : schoolShifts[2];
}
export function schoolLessonsOnDate(offerings: Row[], date: string) {
  return offerings.flatMap(classLessons).filter(lesson => lesson.date === date)
    .sort((a,b)=>a.startTime.localeCompare(b.startTime)||String(keyOf(a.offering,"ClassID")).localeCompare(String(keyOf(b.offering,"ClassID"))));
}
export function schoolClassCount(lessons: ClassLesson[]) {
  return new Set(lessons.map(lesson=>keyOf(lesson.offering,"ClassID"))).size;
}
