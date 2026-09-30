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
