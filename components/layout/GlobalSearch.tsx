"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { apiRequest, display, keyOf, pick } from "@/controllers/api.controller";
import type { Role, Row } from "@/models/dashboard";
import { Icon } from "@/components/ui/Icon";

export function GlobalSearch({ role, token, onNavigate }: { role: Role; token: string; onNavigate: (value: string) => void }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<{ title: string; sub: string; target: string }[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setResults([]); return; }
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        if (role === "admin") {
          const payload = await apiRequest(token, `/search?q=${encodeURIComponent(value)}`);
          const out: { title: string; sub: string; target: string }[] = [];
          for (const row of payload.students || []) out.push({ title: display(pick(row, "User.FullName")), sub: `Sinh viên · ${display(keyOf(row, "StudentCode"))}`, target: "Sinh viên" });
          for (const row of payload.teachers || []) out.push({ title: display(pick(row, "User.FullName")), sub: `Giảng viên · ${display(keyOf(row, "TeacherCode"))}`, target: "Giảng viên" });
          for (const row of payload.courses || []) out.push({ title: display(keyOf(row, "Name")), sub: `Môn học · ${display(keyOf(row, "Code"))}`, target: "Môn học" });
          for (const row of payload.classes || []) out.push({ title: display(keyOf(row, "ClassCode")), sub: "Lớp học", target: "Lớp học" });
          setResults(out.slice(0, 10));
        } else {
          const [classes, exercises, offers] = await Promise.all([apiRequest(token, "/teacher/classes"), apiRequest(token, "/exercises"), apiRequest(token, "/class-offers")]);
          const lower = value.toLowerCase(); const out: { title: string; sub: string; target: string }[] = [];
          for (const row of (classes.data || []) as Row[]) if (JSON.stringify(row).toLowerCase().includes(lower)) out.push({ title: display(keyOf(row, "ClassCode")), sub: "Lớp của tôi", target: "Lớp của tôi" });
          for (const row of (exercises.data || []) as Row[]) if (JSON.stringify(row).toLowerCase().includes(lower)) out.push({ title: display(keyOf(row, "Title")), sub: "Bài tập", target: "Bài tập" });
          for (const row of (offers.data || []) as Row[]) if (JSON.stringify(row).toLowerCase().includes(lower)) out.push({ title: display(pick(row, "Class.ClassCode")), sub: "Đề xuất lớp", target: "Đề xuất lớp" });
          setResults(out.slice(0, 10));
        }
      } catch { setResults([]); } finally { setBusy(false); }
    }, 320);
    return () => clearTimeout(timer);
  }, [query, role, token]);
  return <div className="global-search"><label className="search"><Icon name="search" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm sinh viên, lớp, môn học..." /></label>{query.trim().length >= 2 && <div className="search-results">{busy ? <p>Đang tìm...</p> : results.length === 0 ? <p>Không có kết quả.</p> : results.map((item, index) => <button key={`${item.title}-${index}`} onClick={() => { onNavigate(item.target); setQuery(""); setResults([]); }}><strong>{item.title}</strong><small>{item.sub}</small></button>)}</div>}</div>;
}
