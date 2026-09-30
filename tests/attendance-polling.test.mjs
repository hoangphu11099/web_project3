import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
const source = readFileSync(new URL("../controllers/attendance-polling.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
 const timers = new Map(); let id = 0;
 const context = { exports: {}, AbortController, setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: id => timers.delete(id) };
 vm.runInNewContext(code, context);
 return { start: context.exports.startAttendancePolling, timers, tick: async () => { const entry = timers.entries().next().value; assert.ok(entry); timers.delete(entry[0]); await entry[1](); } };
}
test("student check-in becomes present on the next automatic refresh", async () => {
 const env = setup(); let status = "absent"; const seen = [];
 const poll = env.start({ load: async () => status, onData: value => { seen.push(value); return true; }, onError: assert.fail });
 await flush(); status = "present"; await env.tick();
 assert.deepEqual(seen, ["absent", "present"]); poll.stop(); assert.equal(env.timers.size, 0);
});
test("switching sessions discards a delayed response and aborts the request", async () => {
 const env = setup(); let resolve, signal; const seen = [];
 const poll = env.start({ load: s => { signal=s; return new Promise(r => { resolve=r; }); }, onData: value => { seen.push(value); return true; }, onError: assert.fail });
 poll.stop(); resolve("old session"); await flush();
 assert.equal(signal.aborted, true); assert.deepEqual(seen, []); assert.equal(env.timers.size, 0);
});
test("focus refresh does not overlap a pending request", async () => {
 const env = setup(); let resolve; let calls = 0;
 const poll = env.start({ load: () => { calls++; return new Promise(r => { resolve=r; }); }, onData: () => true, onError: assert.fail });
 await poll.refresh(); await poll.refresh(); assert.equal(calls, 1);
 resolve("present"); await flush(); assert.equal(env.timers.size, 1); poll.stop();
});
test("temporary failure retries, and a closed session stops polling", async () => {
 const env = setup(); let calls = 0; const errors = [];
 const poll = env.start({ load: async () => { if (++calls === 1) throw Error("offline"); return { active: false }; }, onData: value => value.active, onError: error => errors.push(error.message) });
 await flush(); assert.deepEqual(errors, ["offline"]); await env.tick(); assert.equal(env.timers.size, 0); poll.stop();
});
