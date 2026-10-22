import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
const source = readFileSync(new URL("../controllers/teaching-schedule.controller.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = { exports: {}, require: () => ({ keyOf: (row, key) => row[key] }), Date, Intl };
vm.runInNewContext(output, context);
const { todaySchedules, schedulesForWeek, teachingState } = context.exports;
const {nextTeachingLessons}=context.exports;
test("next lesson skips ended dates and rolls a recurring schedule to next week",()=>{
 const now=new Date("2026-10-13T08:00:00+07:00");
 const dated={...item,teachingDate:"2026-10-14",classCode:"C1"};
 const ended={...item,teachingDate:"2026-10-12",classCode:"C2"};
 const recurring={...item,teachingDate:"",dayOfWeek:"Mon",classCode:"C3"};
 const next=nextTeachingLessons([ended,recurring,dated],now);
 assert.deepEqual(Array.from(next,l=>l.date),["2026-10-14","2026-10-19"]);
 assert.equal(nextTeachingLessons([{...dated,offeringStatus:"closed"}],now).length,0);
 assert.equal(nextTeachingLessons([{...recurring,semesterEndDate:"2026-10-13"}],now).length,0);
 assert.equal(nextTeachingLessons([{...recurring,semesterStartDate:"2027-01-01",semesterEndDate:"2027-02-01"}],now)[0].date,"2027-01-04");
});
const today = new Date(2026, 8, 30, 8, 30);
const item = { dayOfWeek: "Wed", teachingDate: "2026-09-30", startTime: "08:00", endTime: "09:00", semesterStartDate: "2026-09-01", semesterEndDate: "2026-12-31", offeringStatus: "open" };
test("dated lesson is visible today and does not recur next week", () => {
 assert.equal(todaySchedules([item], today).length, 1);
 assert.equal(teachingState(item, today), "current");
 assert.equal(schedulesForWeek([item], today, today).length, 1);
 const next = new Date(2026, 9, 7, 8, 30);
 assert.equal(todaySchedules([item], next).length, 0);
 assert.equal(schedulesForWeek([item], next, next).length, 0);
});
test("multiple dates and legacy recurring lessons remain visible", () => {
 const next = new Date(2026, 9, 7, 8, 30);
 assert.equal(schedulesForWeek([item, { ...item, teachingDate: "2026-10-07" }], next, next).length, 1);
 assert.equal(todaySchedules([{ ...item, teachingDate: "" }], next).length, 1);
});
