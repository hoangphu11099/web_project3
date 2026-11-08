export type ReportOption = { id: number; name: string; parentId?: number; cohort?: number };
export type TeachingReport = {
  id: number; class: string; course: string; semester: string; teacher: string; room: string;
  students: number; lessons: number; elapsed: number; confirmed: number; hours: number;
  first: string; last: string; present: number; absent: number; late: number; excused: number;
  approved: number; passed: number; draft: number; average: number | null;
};
export type MonthlyAttendance = { month: string; present: number; absent: number; late: number; excused: number; total: number; attendanceRate: number };
export type ReportRisk = { student: string; code: string; class: string; course: string; absenceRate: number; reason: string };
export type ReportOffer = { class: string; course: string; teacher: string; first: string; urgent: boolean; reason: string; status: string };
export type DashboardReport = {
  scope: "admin" | "teacher"; generatedAt: string;
  options: Record<"academicYears" | "semesters" | "classes" | "courses" | "majors" | "cohorts", ReportOption[]>;
  totalStudents: number; totalTeachers: number; totalClasses: number; totalCourses: number; totalEnrollments: number; totalWarnings: number;
  attendance: Record<"present" | "absent" | "late" | "excused", number>;
  attendanceMonthly: MonthlyAttendance[];
  grades: { totalGrades: number; approved: number; draft: number; averageScore: number | null; passed: number; failed: number; distribution: number[] };
  teaching: TeachingReport[]; risks: ReportRisk[]; rooms: { room: string; lessons: number; hours: number }[];
  scheduleSummary: { lessons: number; elapsed: number; confirmed: number; hours: number };
  comparison: { available: boolean; message?: string; semester?: string; enrollments?: number; enrollmentChange?: number };
  academicWarnings?: { student: string; code: string; class: string; semester: string; gpa: number; failedCourses: number; failedCredits: number; reason: string; status: string }[];
  assignments?: { assignedClasses: number; unassignedClasses: string[]; pending: ReportOffer[]; shortNotice: ReportOffer[]; conflicts: { date: string; first: string; second: string; reason: string }[] };
};
