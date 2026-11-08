import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";

const context = { exports: {}, TextEncoder, Uint8Array, DataView };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../controllers/report-export.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const { reportWorkbook } = context.exports;
function unpack(bytes) {
  const buffer = Buffer.from(bytes), files = new Map(); let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const size = buffer.readUInt32LE(offset + 18), length = buffer.readUInt16LE(offset + 26), extra = buffer.readUInt16LE(offset + 28);
    assert.equal(buffer.readUInt16LE(offset + 8), 0, "ZIP uses portable stored entries");
    const name = buffer.toString("utf8", offset + 30, offset + 30 + length), start = offset + 30 + length + extra;
    files.set(name, buffer.toString("utf8", start, start + size)); offset = start + size;
  }
  assert.equal(buffer.readUInt32LE(offset), 0x02014b50, "central directory follows the entries");
  assert.equal(buffer.readUInt32LE(buffer.length - 22), 0x06054b50, "ZIP has a valid end record");
  assert.equal(buffer.readUInt16LE(buffer.length - 12), files.size);
  return files;
}
test("Excel report keeps Vietnamese text and numbers, and safely escapes cells", () => {
  const files = unpack(reportWorkbook([["Báo cáo chuyên cần", "<script>&\"", "=HYPERLINK(\"bad\")"], [0, 82.5, null]]));
  assert.equal(files.size, 5);
  assert.match(files.get("[Content_Types].xml"), /spreadsheetml\.sheet\.main\+xml/);
  const sheet = files.get("xl/worksheets/sheet1.xml");
  assert.match(sheet, /Báo cáo chuyên cần/);
  assert.match(sheet, /&lt;script&gt;&amp;&quot;/);
  assert.match(sheet, /t="inlineStr"><is><t xml:space="preserve">=HYPERLINK/);
  assert.doesNotMatch(sheet, /<f>/);
  assert.match(sheet, /<c r="A2"><v>0<\/v>/);
  assert.match(sheet, /<c r="B2"><v>82.5<\/v>/);
});
test("Excel export includes rows beyond the visible page and columns beyond Z", () => {
  const rows = Array.from({ length: 87 }, (_, row) => Array.from({ length: 29 }, (_, col) => `${row}:${col}`));
  const sheet = unpack(reportWorkbook(rows)).get("xl/worksheets/sheet1.xml");
  assert.match(sheet, /r="AC87"/);
  assert.match(sheet, /86:28/);
  assert.equal((sheet.match(/<row /g) || []).length, 87);
});
