import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
const compile = path => ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020} }).outputText;
const api = {exports:{},process:{env:{}}}; vm.runInNewContext(compile("../controllers/api.controller.ts"),api);
const teaching = {exports:{},require:()=>api.exports}; vm.runInNewContext(compile("../controllers/teaching-schedule.controller.ts"),teaching);
const context = {exports:{}, require:path=>path.includes("api.controller") ? api.exports : teaching.exports};
vm.runInNewContext(compile("../controllers/class-schedule.ts"),context);
const {classLessons,overlappingLessons} = context.exports;
const {offeringStudyStatus,classStudyStatus} = context.exports;
const {weeklyTeachingDates} = context.exports;
test("class timetable filters combine semester, course and inclusive date bounds", () => {
 const {filterClassLessons} = context.exports;
 const a={ID:1,SemesterID:10,CourseID:20}, b={ID:2,SemesterID:11,CourseID:20}, c={ID:3,SemesterID:10,CourseID:21};
 const lesson=(date,offering,startTime="08:00")=>({date,offering,startTime,endTime:"10:00",session:""});
 const rows=[lesson("2026-11-05",a),lesson("2026-11-03",a),lesson("2026-11-04",b),lesson("2026-11-04",c),lesson("2026-11-02",a)];
 const filter={semesterId:"10",courseId:"20",from:"2026-11-03",to:"2026-11-05"};
 assert.deepEqual(Array.from(filterClassLessons(rows,filter),l=>l.date),["2026-11-03","2026-11-05"]);
 assert.equal(filterClassLessons(rows,{...filter,from:"2026-11-06"}).length,0);
 assert.equal(filterClassLessons(rows,{semesterId:"",courseId:"",from:"",to:""}).length,5);
 assert.equal(filterClassLessons(rows,{...filter,from:"",to:"2026-11-03"}).length,2);
 assert.equal(filterClassLessons(rows,{...filter,from:"2026-11-05",to:""}).length,1);
 assert.equal(rows[0].date,"2026-11-05"); // filtering must not reorder the source
});
test("quick date filters use Vietnam calendar, Monday weeks and leap months", () => {
 const {classScheduleDateRange} = context.exports;
 const now=Date.parse("2026-11-01T18:00:00Z"); // already Monday in Vietnam
 const range=(preset,time=now)=>JSON.parse(JSON.stringify(classScheduleDateRange(preset,time)));
 assert.deepEqual(range("today"),{from:"2026-11-02",to:"2026-11-02"});
 assert.deepEqual(range("week"),{from:"2026-11-02",to:"2026-11-08"});
 assert.deepEqual(range("week",Date.parse("2026-11-08T12:00:00+07:00")),{from:"2026-11-02",to:"2026-11-08"});
 assert.deepEqual(range("month",Date.parse("2028-02-10T12:00:00Z")),{from:"2028-02-01",to:"2028-02-29"});
 assert.deepEqual(range("all"),{from:"",to:""});
});
test("start date selects its weekday, replaces the previous day and preserves extra weekdays", () => {
 const {weekdaysForStartDate} = context.exports;
 assert.deepEqual(Array.from(weekdaysForStartDate([],"","2026-11-04")),[3]);
 const days = weekdaysForStartDate([1,3,5],"2026-11-04","2026-11-05");
 assert.deepEqual(Array.from(days),[1,5,4]);
 assert.deepEqual(Array.from(weeklyTeachingDates("2026-11-05",6,days)),["2026-11-05","2026-11-06","2026-11-09","2026-11-12","2026-11-13","2026-11-16"]);
 assert.deepEqual(Array.from(weekdaysForStartDate([3,5],"2026-11-04","2026-11-06")),[5]);
 assert.deepEqual(Array.from(weekdaysForStartDate([],"","2026-11-08")),[0]);
 assert.deepEqual(Array.from(weekdaysForStartDate([3,5],"2026-11-04","")),[5]);
 assert.deepEqual(Array.from(weekdaysForStartDate([3],"2026-11-04","2026-02-30")),[3]);
});
test("assignment availability checks every date, resource and overlapping semester", () => {
 const {assignmentConflicts} = context.exports;
 const offerings = [{ID:1,Status:"open",TeacherID:2,RoomID:3,ClassID:4,Semester:{StartDate:"2026-10-01",EndDate:"2026-11-30"},Schedules:[{DayOfWeek:"Mon",StartTime:"08:00:00",EndTime:"09:00:00"}]}];
 const plan = [{date:"2026-11-02",startTime:"08:30",endTime:"10:00"}];
 assert.equal(assignmentConflicts(offerings,plan,"TeacherID","2").length,1);
 assert.equal(assignmentConflicts(offerings,plan,"RoomID","3").length,1);
 assert.equal(assignmentConflicts(offerings,plan,"ClassID","4").length,1);
 assert.equal(assignmentConflicts(offerings,plan,"TeacherID","5").length,0);
 assert.equal(assignmentConflicts(offerings,plan,"TeacherID","2",1).length,0);
 assert.equal(assignmentConflicts(offerings,[{...plan[0],startTime:"09:00"}],"TeacherID","2").length,0);
 assert.equal(assignmentConflicts(offerings,[{...plan[0],date:"2026-12-07"}],"TeacherID","2").length,0);
 assert.equal(assignmentConflicts([{...offerings[0],Status:"closed"}],plan,"TeacherID","2").length,0);
 assert.equal(assignmentConflicts(offerings,[{...plan[0],date:"2026-11-03"},...plan],"TeacherID","2").length,1);
});
test("weekly plans follow selected weekdays, including starts between lessons", () => {
 assert.deepEqual(Array.from(weeklyTeachingDates("2026-10-13",6,[1,3,5])),["2026-10-14","2026-10-16","2026-10-19","2026-10-21","2026-10-23","2026-10-26"]);
 assert.deepEqual(Array.from(weeklyTeachingDates("2026-10-12",3,[1])),["2026-10-12","2026-10-19","2026-10-26"]);
 assert.deepEqual(Array.from(weeklyTeachingDates("2026-12-28",2,[1],"2026-12-31")),["2026-12-28"]);
 assert.equal(weeklyTeachingDates("2026-10-13",6,[]).length,0);
 assert.equal(weeklyTeachingDates("2026-02-30",6,[1]).length,0);
 assert.equal(weeklyTeachingDates("2026-10-13",1.5,[1]).length,0);
 assert.deepEqual(Array.from(weeklyTeachingDates("2026-12-31",2,[0])),["2027-01-03","2027-01-10"]);
});

test("completion follows the final lesson end in Vietnam timezone", () => {
 const course = {Status:"open", Schedules:[{FullDate:"2026-10-07",StartTime:"07:30",EndTime:"11:30"}]};
 assert.equal(offeringStudyStatus(course,Date.parse("2026-10-07T11:29:59+07:00")),"open");
 assert.equal(offeringStudyStatus(course,Date.parse("2026-10-07T11:30:00+07:00")),"completed");
 const later = {...course,Schedules:[...course.Schedules,{FullDate:"2026-10-14",EndTime:"11:30"}]};
 const now = Date.parse("2026-10-13T08:00:00+07:00");
 assert.equal(offeringStudyStatus(later,now),"open");
 assert.equal(classStudyStatus({Status:"open"},[course],now),"completed");
 assert.equal(classStudyStatus({Status:"open"},[course,later],now),"open");
 assert.equal(classStudyStatus({Status:"open"},[],now),"open");
 assert.equal(offeringStudyStatus({Status:"open",Schedules:[]},now),"open");
 assert.equal(classStudyStatus({Status:"closed"},[later],now),"closed");
});
test("dated lessons stay on their actual dates and recurring lessons stop at term end",()=>{
 const offering={ID:1,Semester:{StartDate:"2026-10-01",EndDate:"2026-10-15"},Schedules:[{FullDate:"2026-10-03",StartTime:"08:00",EndTime:"09:00"},{DayOfWeek:"Mon",StartTime:"08:00",EndTime:"09:00"}]};
 assert.deepEqual(Array.from(classLessons(offering),l=>l.date),["2026-10-03","2026-10-05","2026-10-12"]);
 assert.equal(classLessons({ID:2,Schedules:[{DayOfWeek:"Mon"}]}).length,0);
});
test("same-date duplicates are not counted twice; different sessions are distinct",()=>{
 const schedule={FullDate:"2026-10-03",StartTime:"08:00",EndTime:"09:00",Session:"Morning"};
 assert.equal(classLessons({ID:1,Schedules:[schedule,{...schedule},{...schedule,StartTime:"13:00",EndTime:"14:00",Session:"Afternoon"}]}).length,2);
});
test("conflicts require overlapping times on the same date, adjacent lessons are allowed",()=>{
 const a={date:"2026-10-03",startTime:"08:00",endTime:"09:00"};
 const b={date:"2026-10-03",startTime:"08:30",endTime:"09:30"};
 const adjacent={date:"2026-10-03",startTime:"09:30",endTime:"10:00"};
 const otherDay={...a,date:"2026-10-04"};
 const conflicts=overlappingLessons([a,b,adjacent,otherDay]);
 assert.equal(conflicts.size,2); assert.ok(conflicts.has(a)); assert.ok(conflicts.has(b)); assert.ok(!conflicts.has(adjacent)); assert.ok(!conflicts.has(otherDay));
});
