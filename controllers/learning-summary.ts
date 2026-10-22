import { idOf, keyOf, pick } from "./api.controller";
import { classLessons } from "./class-schedule";
import type { Row } from "@/models/dashboard";

export function attendanceSummary(row: Row, now: number) {
  const records = ((keyOf(row,"Attendances") || []) as Row[]).filter(a => {
    const session = keyOf(a,"AttendanceSession") as Row | undefined;
    if (!session || !keyOf(session,"IsActive")) return true;
    const date = String(keyOf(session,"ClassDate") || "").slice(0,10);
    const end = String(pick(session,"Schedule.EndTime") || "");
    return !!date && !!end && Date.parse(`${date}T${end}+07:00`) <= now;
  });
  const count = (status: string) => records.filter(a => keyOf(a,"Status") === status).length;
  const present = count("present"), late = count("late"), excused = count("excused"), absent = count("absent");
  const total = classLessons((keyOf(row,"CourseOffering") || {}) as Row).length;
  const attended = present + late, missed = excused + absent;
  return { total, attended, missed, late, excused, absent, finalized: records.length, records, participation: total > 0 ? attended / total * 100 : null, absence: total > 0 ? missed / total * 100 : null, warning: total > 0 && missed * 4 > total };
}

// Match the existing backend grading scale: F < 40; D/D+ are low passing scores.
export function gradeSummary(row: Row) {
  const grade = keyOf(row,"Grade") as Row | undefined;
  if (!grade || !idOf(grade)) return { kind:"missing", label:"Chưa có điểm", score:null, grade:null };
  const score = Number(keyOf(grade,"TotalScore"));
  if (!Number.isFinite(score)) return { kind:"missing", label:"Chưa có điểm tổng kết", score:null, grade };
  const approved = String(keyOf(grade,"Status") || "").toLowerCase() === "approved";
  if (!approved) return { kind:"pending", label:"Điểm tạm tính · Chưa duyệt", score, grade };
  if (score < 40) return { kind:"failed", label:"Không đạt · Cần học lại", score, grade };
  if (score < 55) return { kind:"low", label:"Đạt · Điểm thấp", score, grade };
  return { kind:"passed", label:"Đạt", score, grade };
}

export function outstandingCourses(rows: Row[]): Set<string> {
  const passed = new Set(rows.filter(r => ["passed","low"].includes(gradeSummary(r).kind)).map(r => `${keyOf(r,"StudentID")}:${keyOf(r,"CourseID")}`));
  return new Set(rows.filter(r => gradeSummary(r).kind === "failed" && !passed.has(`${keyOf(r,"StudentID")}:${keyOf(r,"CourseID")}`)).map(r => `${keyOf(r,"StudentID")}:${keyOf(r,"CourseID")}`));
}
