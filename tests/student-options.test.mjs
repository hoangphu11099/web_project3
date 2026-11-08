import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const api = { exports: {}, process: { env: {} } };
vm.runInNewContext(compile("../controllers/api.controller.ts"), api);
const context = { exports: {}, require: () => api.exports };
vm.runInNewContext(compile("../controllers/student-options.ts"), context);
const { studentsForClassMajor } = context.exports;
test("student picker uses registered major before current class and never exposes another major", () => {
  const students = [{ ID: 1, MajorID: 10, Class: { MajorID: 20 } }, { id: 2, majorId: 20, Class: { MajorID: 10 } }, { ID: 3, MajorID: 10, ClassID: null }, { ID: 4, Class: { MajorID: 10 } }, { ID: 5 }];
  assert.deepEqual(Array.from(studentsForClassMajor(students, { MajorID: 10 }), row => row.ID), [1, 3, 4]);
  assert.deepEqual(Array.from(studentsForClassMajor(students, { majorId: 20 }), row => row.id), [2]);
  assert.equal(studentsForClassMajor(students, {}).length, 0);
  assert.equal(studentsForClassMajor(students, { MajorID: 99 }).length, 0);
});
