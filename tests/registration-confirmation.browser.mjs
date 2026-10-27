// Real browser interaction using fixture data only; never calls the school's API.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "node_modules/.cache/registration-confirmation");
const profile = join(fixture, `chrome-${process.pid}`);
await mkdir(fixture, { recursive: true });
await writeFile(join(fixture, "index.html"), '<html><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
await writeFile(join(fixture, "main.tsx"), `
import React from "react";
import { createRoot } from "react-dom/client";
import { CourseRegistrationsPage } from "@/views/features/CourseRegistrationsPage";
import "@/app/globals.css";
import "@/app/forms.css";
let rows = [{ID:1,CourseID:1,Status:"pending_payment",RegisteredAt:"2026-10-28T08:00:00Z",Student:{StudentCode:"TEST001",User:{FullName:"Sinh viên kiểm thử"}},Course:{Code:"TEST",Name:"Học phần kiểm thử"},Class:{ClassCode:"TEST-CLASS"}}];
window.__mutations = 0; window.__failNext = false; window.__failReload = false;
const originalFetch = window.fetch;
window.fetch = async (input, options) => {
 const url = String(input);
 if (!url.startsWith("http://registration.test/")) return originalFetch(input, options);
 const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{"Content-Type":"application/json"}});
 if (options?.method === "PUT") {
  window.__mutations++;
  if (window.__failNext) { window.__failNext=false; return json({message:"Chưa ghi nhận được học phí"},400); }
  rows=[{...rows[0],Status:"paid",PaymentConfirmedAt:"2026-10-28T09:00:00Z"}];
  return json({message:"Đã xác nhận học phí",data:rows[0]});
 }
 if (url.endsWith("/admin/course-registrations")) return window.__failReload ? json({message:"Không tải lại được danh sách"},500) : json({data:rows});
 if (url.endsWith("/course-offerings")) return json({data:[]});
 return json({message:"Unexpected fixture request"},404);
};
createRoot(document.getElementById("root")).render(<CourseRegistrationsPage token="fixture-only" metadata={{academicYears:[],majors:[],semesters:[],rooms:[],courses:[],teachers:[],classes:[]}} onToast={()=>{}} />);
`);

const server = await createServer({ root: fixture, configFile: false, plugins: [react()],
  cacheDir: join(fixture, "vite-cache"),
  resolve: { alias: { "@": root }, dedupe: ["react", "react-dom"] },
  define: { "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("http://registration.test") },
  server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
});
let chrome;
let socket;
try {
  await server.listen();
  console.log("Browser test server ready");
  const port = server.httpServer.address().port;
  chrome = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  let devtoolsPort;
  for (let attempt=0;attempt<150;attempt++) {
    try { devtoolsPort = Number((await readFile(join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]); break; } catch { await delay(100); }
  }
  assert.ok(devtoolsPort, "Chrome must start");
  console.log("Chrome ready");
  const target = await (await fetch(`http://127.0.0.1:${devtoolsPort}/json/new?about:blank`, {method:"PUT",signal:AbortSignal.timeout(10000)})).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;
  const pending=new Map();
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);if(message.error)reject(new Error(message.error.message));else resolve(message.result);}};
  socket.onclose=()=>{for(const {reject} of pending.values())reject(new Error("Chrome disconnected"));pending.clear();};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`Chrome timed out: ${method}`));},15000);pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const response=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error(JSON.stringify(response.exceptionDetails));return response.result.value;};
  const waitFor=async expression=>{for(let i=0;i<200;i++){if(await evaluate(expression))return;await delay(100);}throw new Error(`Timed out: ${expression}`);};
  await send("Page.enable");
  await send("Page.navigate",{url:`http://127.0.0.1:${port}`});
  console.log("Fixture opened");
  const openPayment = `Array.from(document.querySelectorAll('.row-actions button')).find(button=>button.textContent==='Xác nhận đã đóng học phí').click()`;
  await waitFor("document.querySelector('.row-actions button') !== null");
  console.log("Registration page rendered");
  await evaluate(openPayment);
  await waitFor("document.querySelector('dialog[open] button[type=submit]') !== null");
  const buttonStyle=await evaluate(`(()=>{const button=document.querySelector('dialog button[type=submit]');const style=getComputedStyle(button);return {text:button.textContent,background:style.backgroundColor,height:button.getBoundingClientRect().height};})()`);
  assert.match(buttonStyle.text,/OK/);
  assert.equal(buttonStyle.background,"rgb(49, 89, 216)");
  assert.ok(buttonStyle.height>=44,"Confirm button must be visible and large enough to click");
  await evaluate("Array.from(document.querySelectorAll('dialog button')).find(button=>button.textContent==='Hủy').click()");
  await waitFor("document.querySelector('dialog[open]') === null");
  assert.equal(await evaluate("window.__mutations"),0,"Cancel must not update tuition");
  await evaluate(openPayment);
  await waitFor("document.querySelector('dialog[open] button[type=submit]') !== null");
  await evaluate("window.__failNext=true;document.querySelector('dialog button[type=submit]').click()");
  await waitFor("document.querySelector('dialog [role=alert]')?.textContent.includes('Chưa ghi nhận được học phí')");
  assert.ok(await evaluate("document.querySelector('dialog[open]') !== null"),"Failed saves keep confirmation open");
  await waitFor("!document.querySelector('dialog button[type=submit]').disabled");
  await evaluate("window.__failReload=true;document.querySelector('dialog button[type=submit]').click()");
  await waitFor("document.querySelector('dialog[open]') === null");
  await waitFor("document.querySelector('tbody')?.textContent.includes('Đã xác nhận học phí')");
  assert.equal(await evaluate("window.__mutations"),2);
  assert.ok(await evaluate("Array.from(document.querySelectorAll('.row-actions button')).some(button=>button.textContent==='Xếp lịch')"));
  assert.ok(!await evaluate("Array.from(document.querySelectorAll('.row-actions button')).some(button=>button.textContent==='Xác nhận đã đóng học phí')"));
  console.log("PASS: visible OK button; cancel does not save; save errors visible inside dialog; successful confirmation updates status even when list refresh fails.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome?.kill();
  server.httpServer?.closeAllConnections();
  await Promise.race([server.close(), delay(3000)]);
}
process.exit(process.exitCode || 0);
