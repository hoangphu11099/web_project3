export type RegistrationOffering = {
  ID: number; CourseID: number; ClassID: number; SemesterID: number; TeacherID: number; RoomID: number;
  Course?: { Name: string; Code: string }; Class?: { ClassCode: string; MajorID: number };
  Semester?: { Name: string }; Teacher?: { User?: { FullName: string } }; Room?: { Name: string };
  Schedules?: { ID: number; FullDate?: string; DayOfWeek: string; StartTime: string; EndTime: string }[];
};
export type RegistrationRow = {
  ID: number; CourseID: number; EnrollmentID?: number; Status: string; RegisteredAt: string;
  PaymentConfirmedAt?: string; ScheduledAt?: string;
  Student?: { StudentCode: string; Phone?: string; User?: { FullName: string; Email: string } };
  Course?: { Code: string; Name: string }; Class?: { ClassCode: string }; CourseOffering?: RegistrationOffering;
};
export const registrationLabels: Record<string, string> = {
  pending_payment: "Chờ học phí", paid: "Đã xác nhận học phí · Chờ xếp lịch", scheduled: "Đã xếp lịch", cancelled: "Đã hủy", registered: "Đăng ký cũ",
};
