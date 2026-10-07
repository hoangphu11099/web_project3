import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const api = { exports: {}, process: { env: {} } };
vm.runInNewContext(compile("../controllers/api.controller.ts"), api);
const context = { exports: {}, require: () => api.exports };
vm.runInNewContext(compile("../controllers/course-options.ts"), context);
const { coursesForClass, changeDependentField } = context.exports;
const courses = [{ ID: 1, MajorID: 10 }, { id: 2, majorId: 20 }, { ID: 3, Major: { ID: 10 } }];
test("class major excludes courses from other majors, with both API casing formats", () => {
 assert.deepEqual(Array.from(coursesForClass(courses, { MajorID: 10 }), row => row.ID), [1, 3]);
 assert.equal(coursesForClass(courses, { majorId: 20 })[0].id, 2);
 assert.equal(coursesForClass(courses, { Major: { ID: 20 } })[0].id, 2);
});
test("no class or missing major never exposes the whole course catalog", () => {
 assert.equal(coursesForClass(courses).length, 0);
 assert.equal(coursesForClass(courses, { MajorID: 0 }).length, 0);
 assert.equal(coursesForClass(courses, { MajorID: 99 }).length, 0);
});
test("changing class or major clears the previous course, unrelated edits preserve it", () => {
 const form = { classId: "1", majorId: "10", courseId: "3", note: "" };
 assert.equal(changeDependentField(form, "classId", "2").courseId, "");
 assert.equal(changeDependentField(form, "classId", "").courseId, "");
 assert.equal(changeDependentField(form, "majorId", "20").courseId, "");
 assert.equal(changeDependentField(form, "note", "updated").courseId, "3");
 assert.equal(changeDependentField(form, "classId", "1").courseId, "3");
 assert.equal(form.courseId, "3");
});

const classContext = { exports: {}, require: () => api.exports };
vm.runInNewContext(compile("../controllers/class-filters.ts"), classContext);
const { classFilterInfo, matchesClassFilters } = classContext.exports;
test("class filters combine cohort, major and displayed room; all includes unassigned classes", () => {
 const rows = [
  { ClassCode: "K26_WEB_01", CohortYear: 2026, MajorID: 1, RoomID: 2 },
  { classCode: "K25_WEB_02", majorId: 1, roomId: 3 },
  { ClassCode: "K26_GAME_01", Major: { ID: 2 }, Room: { ID: 2 } },
  { ClassCode: "NEW" },
 ];
 assert.equal(rows.filter(row => matchesClassFilters(row, "", "", "")).length, 4);
 assert.equal(rows.filter(row => matchesClassFilters(row, "K26", "1", "2")).length, 1);
 assert.equal(rows.filter(row => matchesClassFilters(row, "K25", "", "2")).length, 0);
 assert.equal(rows.filter(row => matchesClassFilters(row, "", "", "none")).length, 1);
 assert.equal(classFilterInfo(rows[1]).cohort, "K25");
 assert.equal(classFilterInfo(rows[2]).major, "2");
});
