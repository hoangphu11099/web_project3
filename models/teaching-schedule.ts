export type TeachingState = "current" | "upcoming" | "finished" | "scheduled" | "outside";

export type TeachingSchedule = {
  id: number;
  courseOfferingId: number;
  classId: number;
  classCode: string;
  majorName: string;
  courseCode: string;
  courseName: string;
  roomName: string;
  building: string;
  dayOfWeek: string;
  teachingDate?: string;
  session: string;
  startTime: string;
  endTime: string;
  semesterName: string;
  semesterStartDate: string;
  semesterEndDate: string;
  offeringStatus: string;
};
