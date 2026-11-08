import { idOf, keyOf, pick } from "@/controllers/api.controller";
import type { Row } from "@/models/dashboard";

export function studentsForClassMajor(students: Row[], classRow: Row): Row[] {
  const majorId = Number(keyOf(classRow, "MajorID") || pick(classRow, "Major.ID") || 0);
  if (!majorId) return [];
  return students.filter(student => {
    const registered = Number(keyOf(student, "MajorID") || pick(student, "Major.ID") || 0);
    const legacyClassMajor = Number(pick(student, "Class.MajorID") || pick(student, "Class.Major.ID") || 0);
    return idOf(student) > 0 && (registered || legacyClassMajor) === majorId;
  });
}
