import { keyOf, pick } from "./api.controller";
import type { Row } from "@/models/dashboard";

export function coursesForClass(courses: Row[], classroom?: Row): Row[] {
  const majorId = Number(keyOf(classroom, "MajorID") || pick(classroom, "Major.ID") || 0);
  if (!majorId) return [];
  return courses.filter(course => Number(keyOf(course, "MajorID") || pick(course, "Major.ID") || 0) === majorId);
}

export function changeDependentField(form: Record<string, string>, key: string, value: string) {
  const next = { ...form, [key]: value };
  if (form[key] !== value && (key === "classId" || key === "majorId")) next.courseId = "";
  return next;
}
