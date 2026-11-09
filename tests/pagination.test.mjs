import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function harness(relative) {
  let state;
  let scrolls = 0;
  const mockReact = { ...React, useState: initial => [state ??= initial, next => { state = typeof next === "function" ? next(state) : next; }], useRef: () => ({ current: { scrollToOffset: () => { scrolls++; } } }) };
  const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, require: name => name === "react" ? mockReact : name === "react-native" ? { FlatList: "FlatList", View: "View", Text: "Text", StyleSheet: { create: value => value } } : name === "./GlowTouchableOpacity" ? { GlowTouchableOpacity: "Button" } : name === "./Motion" ? { AnimatedEntry: "AnimatedEntry" } : require(name) };
  vm.runInNewContext(code, context);
  return { api: context.exports, setPage: page => { state = { ...state, page }; }, scrolls: () => scrolls };
}

test("web tables preserve headers and totals while paging all matching rows", () => {
  const { api, setPage } = harness("../components/common/Pagination.tsx");
  const rows = Array.from({ length: 41 }, (_, index) => React.createElement("tr", { key: index }, React.createElement("td", null, `row-${index}`)));
  const props = { children: [React.createElement("thead", { key: "head" }, React.createElement("tr", null, React.createElement("th", null, "Name"))), React.createElement("tbody", { key: "body" }, rows), React.createElement("tfoot", { key: "foot" }, React.createElement("tr", null, React.createElement("td", null, "Total 41")))] };
  const render = () => renderToStaticMarkup(api.PaginatedTable(props));
  let html = render();
  assert.equal((html.match(/row-\d+/g) || []).length, 20);
  assert.match(html, /row-19/); assert.doesNotMatch(html, /row-20/);
  assert.match(html, /<thead>/); assert.match(html, /Total 41/);
  setPage(2); html = render();
  assert.match(html, /row-20/); assert.match(html, /row-39/); assert.doesNotMatch(html, /row-0</);
  setPage(3); html = render();
  assert.equal((html.match(/row-\d+/g) || []).length, 1); assert.match(html, /row-40/);
  assert.equal(rows.length, 41);
  // Filtering resets the cursor, including a new set with the same row count.
  props.children[1] = React.createElement("tbody", { key: "body" }, rows.slice(5, 30));
  html = render(); assert.match(html, /row-5/); assert.doesNotMatch(html, /row-29/);
});

test("page bounds cover empty lists, exact pages and deletion of the final page", () => {
  const { api } = harness("../components/common/Pagination.tsx");
  assert.equal(api.pageWindow(0, 3).page, 1);
  assert.equal(api.pageWindow(20, 1).pages, 1);
  assert.equal(api.pageWindow(21, 9).page, 2);
  assert.equal(api.pageWindow(40, 3).page, 2);
  assert.equal(api.pageWindow(40, 2).end, 40);
});

test("mobile pagination preserves source indices, full selection data and horizontal selectors", () => {
  const { api, setPage } = harness("../../app_management_student/src/components/PaginatedFlatList.tsx");
  const data = Array.from({ length: 41 }, (_, id) => ({ id }));
  const props = { data, keyExtractor: row => String(row.id), renderItem: info => React.createElement("Text", null, String(info.index)) };
  let list = api.PaginatedFlatList(props);
  assert.equal(list.props.data.length, 20);
  setPage(2); list = api.PaginatedFlatList(props);
  assert.equal(list.props.data[0].id, 20);
  const animatedRow = list.props.renderItem({ item: data[20], index: 0 });
  assert.equal(animatedRow.props.children.props.children, "20");
  assert.equal(list.props.keyExtractor(data[20], 0), "20");
  setPage(3); list = api.PaginatedFlatList(props); assert.equal(list.props.data.length, 1);
  assert.equal(data.length, 41);
  list = api.PaginatedFlatList({ ...props, data: data.slice(8, 31) });
  assert.equal(list.props.data[0].id, 8);
  list = api.PaginatedFlatList({ ...props, horizontal: true });
  assert.equal(list.props.data.length, 41);
});
