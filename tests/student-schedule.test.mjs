import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../../app_management_student/src/utils/studentSchedule.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
const {normalizeStudentSchedules,schoolToday,todayStudentLessons}=context.exports;
test("student schedule keeps concrete dates and semester ranges in all API casing formats",()=>{
 const lessons=normalizeStudentSchedules({data:[
  {id:1,courseName:"Web",teachingDate:"2026-11-09",startTime:"07:30",endTime:"11:30"},
  {ID:2,CourseName:"Design",FullDate:"2026-11-10T00:00:00+07:00",StartTime:"13:30:00",EndTime:"16:30:00"},
  {id:3,course_name:"Game",day_of_week:"Mon",start_date:"2026-10-01",end_date:"2026-12-31",start_time:"18:00",end_time:"21:00"},
 ]});
 assert.equal(lessons.length,3);
 assert.equal(lessons[0].dayKey,"Monday");
 assert.equal(lessons[1].teachingDate,"2026-11-10");
 assert.equal(lessons[1].startTime,"13:30");
 assert.equal(lessons[2].startDate,"2026-10-01");
 assert.equal(lessons[2].dayKey,"Monday");
 assert.equal(normalizeStudentSchedules([{courseName:"Web",dayOfWeek:"Thứ hai"}])[0].dayKey,"Monday");
});
test("QR shows today's lessons in Vietnam and prioritizes the lesson in progress",()=>{
 const lessons=normalizeStudentSchedules([
  {id:1,courseName:"Past",teachingDate:"2026-11-09",startTime:"07:30",endTime:"11:30"},
  {id:2,courseName:"Current",teachingDate:"2026-11-09",startTime:"13:30",endTime:"16:30"},
  {id:3,courseName:"Next",teachingDate:"2026-11-09",startTime:"18:00",endTime:"21:00"},
  {id:4,courseName:"Tomorrow",teachingDate:"2026-11-10",startTime:"07:30",endTime:"11:30"},
  {id:5,courseName:"Lịch thi · Web",teachingDate:"2026-11-09",startTime:"13:30",endTime:"16:30"},
  {id:6,courseName:"Expired",dayOfWeek:"Monday",startDate:"2025-01-01",endDate:"2025-12-31"},
 ]);
 assert.deepEqual(Array.from(todayStudentLessons(lessons,new Date("2026-11-09T07:00:00Z")),row=>row.courseName),["Current","Next","Past"]);
 assert.equal(schoolToday(new Date("2026-11-08T18:00:00Z")),"2026-11-09");
 assert.equal(todayStudentLessons(lessons,new Date("2026-11-11T07:00:00Z")).length,0);
});
