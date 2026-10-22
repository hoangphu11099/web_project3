import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
const cache = new Map();
function load(name) {
 if (cache.has(name)) return cache.get(name);
 const context = {exports:{},process:{env:{}},require:path=>load(path.split("/").pop())};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../controllers/${name}.ts`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
 cache.set(name,context.exports); return context.exports;
}
const {attendanceSummary,gradeSummary,outstandingCourses}=load("learning-summary");
const now=Date.parse("2026-10-13T08:00:00+07:00");
const row={CourseOffering:{Schedules:Array.from({length:6},(_,i)=>({FullDate:`2026-10-0${i+1}`,StartTime:"07:30",EndTime:"11:30"}))},Attendances:[{Status:"present"},{Status:"late"},{Status:"excused"},{Status:"absent"}]};
test("attendance includes late and both absence types; warning is strictly over 25%",()=>{
 const stats=attendanceSummary(row,now);
 assert.equal(stats.attended,2); assert.equal(stats.missed,2); assert.equal(stats.total,6); assert.equal(stats.warning,true); assert.equal(stats.participation,2/6*100);
 const four={...row,CourseOffering:{Schedules:row.CourseOffering.Schedules.slice(0,4)},Attendances:[{Status:"absent"}]};
 assert.equal(attendanceSummary(four,now).warning,false);
 assert.equal(attendanceSummary({Attendances:[]},now).participation,null);
});
test("ongoing attendance sessions do not count as absent before their end",()=>{
 const ongoing={Status:"absent",AttendanceSession:{IsActive:true,ClassDate:"2026-10-13",Schedule:{EndTime:"11:30"}}};
 assert.equal(attendanceSummary({...row,Attendances:[ongoing]},now).missed,0);
 assert.equal(attendanceSummary({...row,Attendances:[ongoing]},Date.parse("2026-10-13T11:30:00+07:00")).missed,1);
});
const result=(student,course,score,status="Approved")=>({StudentID:student,CourseID:course,Grade:{ID:1,TotalScore:score,Status:status}});
test("grade boundaries use the backend 100 point scale and require approval",()=>{
 assert.equal(gradeSummary({}).kind,"missing");
 assert.equal(gradeSummary(result(1,1,0)).kind,"failed");
 assert.equal(gradeSummary(result(1,1,39.9)).kind,"failed");
 assert.equal(gradeSummary(result(1,1,40)).kind,"low");
 assert.equal(gradeSummary(result(1,1,55)).kind,"passed");
 assert.equal(gradeSummary(result(1,1,0,"Pending")).kind,"pending");
});
test("a passing retake clears debt only for that student and course",()=>{
 const debt=outstandingCourses([result(1,1,30),result(1,1,60),result(2,1,30),result(1,2,20),result(1,2,70,"Pending")]);
 assert.equal(debt.size,2); assert.ok(debt.has("2:1")); assert.ok(debt.has("1:2")); assert.ok(!debt.has("1:1"));
});
