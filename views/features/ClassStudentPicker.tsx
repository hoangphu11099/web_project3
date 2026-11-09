"use client";
import { PaginatedTable } from "@/components/common/Pagination";

import { useEffect, useRef, useState } from "react";
import { FeatureDialog } from "@/components/common/FeatureDialog";
import { useErrorFeedback } from "@/components/common/ErrorFeedback";
import { Icon } from "@/components/ui/Icon";
import { apiRequest, display, idOf, keyOf, pick } from "@/controllers/api.controller";
import type { Row, ToastHandler } from "@/models/dashboard";
import { studentsForClassMajor } from "@/controllers/student-options";

const searchable = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
export function ClassStudentPicker({ token, classRow, onClose, onAdded, onToast }: { token: string; classRow: Row; onClose: () => void; onAdded: () => void; onToast: ToastHandler }) {
  const [students, setStudents] = useState<Row[]>([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number[]>([]), [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "unassigned" | "assigned">("all"), [retry, setRetry] = useState(0);
  const [error, setError] = useErrorFeedback();
  const busy = useRef(false), allCheckbox = useRef<HTMLInputElement>(null);
  const classId = idOf(classRow), classCode = display(keyOf(classRow, "ClassCode"));
  const majorId = Number(keyOf(classRow, "MajorID") || pick(classRow, "Major.ID") || 0);
  useEffect(() => {
    let current = true; const controller = new AbortController();
    // Reset fetch state when the target class changes or the user retries.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setStudents([]); setSelected([]); setError("");
    const request = majorId ? apiRequest(token, `/students?majorId=${majorId}`, { signal: controller.signal }) : Promise.reject(new Error("Lớp chưa có chuyên ngành. Vui lòng cập nhật chuyên ngành của lớp trước."));
    request.then(result => { if (current) setStudents(studentsForClassMajor(Array.isArray(result.data) ? result.data : [], classRow)); }).catch(e => { if (current) setError(e instanceof Error ? e.message : "Không tải được danh sách sinh viên"); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [token, classId, majorId, retry, setError, classRow]);
  const studentClass = (row: Row) => Number(keyOf(row, "ClassID") || 0);
  const currentCount = students.filter(row => studentClass(row) === classId).length;
  const maximum = Number(keyOf(classRow, "MaxStudents") || 0), remaining = maximum > 0 ? Math.max(0, maximum - currentCount) : null;
  const selectedSet = new Set(selected);
  const filtered = students.filter(row => (tab === "all" || (tab === "unassigned" ? !studentClass(row) : !!studentClass(row))) && searchable([keyOf(row, "StudentCode"), pick(row, "User.FullName"), pick(row, "User.Email"), pick(row, "Class.ClassCode")].join(" ")).includes(searchable(query.trim())));
  const selectable = filtered.filter(row => studentClass(row) !== classId), allSelected = selectable.length > 0 && selectable.every(row => selectedSet.has(idOf(row)));
  const visibleSelected = selectable.filter(row => selectedSet.has(idOf(row))).length;
  const moving = students.filter(row => selectedSet.has(idOf(row)) && studentClass(row) > 0 && studentClass(row) !== classId).length;
  const overCapacity = remaining !== null && selected.length > remaining;
  useEffect(() => { if (allCheckbox.current) allCheckbox.current.indeterminate = visibleSelected > 0 && !allSelected; }, [visibleSelected, allSelected]);
  const toggleAll = () => setSelected(old => allSelected ? old.filter(id => !selectable.some(row => idOf(row) === id)) : Array.from(new Set([...old, ...selectable.map(idOf)])));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy.current || loading || !selected.length || overCapacity) return;
    busy.current = true; setSaving(true); setError("");
    try {
      const result = await apiRequest(token, `/classes/${classId}/students`, { method: "POST", body: JSON.stringify({ studentIds: selected }) });
      onToast(result.message || `Đã thêm ${selected.length} sinh viên vào lớp`, "success"); onAdded();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể thêm sinh viên vào lớp"); }
    finally { busy.current = false; setSaving(false); }
  };
  return <FeatureDialog title="Thêm sinh viên vào lớp" description={`Lớp ${classCode} · Chỉ hiển thị sinh viên đăng ký cùng chuyên ngành với lớp.`} className="class-student-dialog" onClose={() => { if (!busy.current) onClose(); }}>
    <form className="class-student-picker" onSubmit={submit} aria-busy={saving || loading}>
      <div className="class-student-summary"><span><Icon name="class" size={18} /><span>Lớp tiếp nhận<strong>{classCode}</strong></span></span><span>Sĩ số hiện tại<strong>{loading ? "…" : `${currentCount}${maximum ? ` / ${maximum}` : ""}`}</strong></span><span>Chỗ còn trống<strong>{loading ? "…" : remaining ?? "Không giới hạn"}</strong></span></div>
      <div className="class-student-toolbar"><label className="class-student-search"><Icon name="search" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} disabled={saving} placeholder="Tìm mã sinh viên, họ tên, email hoặc lớp…" aria-label="Tìm sinh viên" />{query && <button type="button" onClick={() => setQuery("")} disabled={saving} aria-label="Xóa tìm kiếm"><Icon name="close" size={15} /></button>}</label><div className="class-student-tabs" role="tablist" aria-label="Danh sách sinh viên">{([ ["all", "Tất cả"], ["unassigned", "Chưa có lớp"], ["assigned", "Đã có lớp"] ] as const).map(([value, label]) => <button type="button" key={value} role="tab" aria-selected={tab === value} aria-controls="class-student-list" disabled={saving} onClick={() => setTab(value)}>{label}</button>)}</div></div>
      <div className="class-student-selection"><label><input ref={allCheckbox} type="checkbox" checked={allSelected} disabled={loading || saving || !selectable.length} onChange={toggleAll} />Chọn tất cả{query.trim() || tab !== "all" ? " kết quả đang lọc" : " sinh viên có thể thêm"}</label><span aria-live="polite">Đã chọn <b>{selected.length}</b> / {students.filter(row => studentClass(row) !== classId).length}</span><button type="button" disabled={!selected.length || saving} onClick={() => setSelected([])}>Bỏ chọn tất cả</button></div>
      {error && <div className="class-student-error" role="alert"><span>{error}</span>{!saving && <button type="button" className="refresh-button" onClick={() => setRetry(r => r + 1)}>Tải lại danh sách</button>}</div>}
      <div className="class-student-list" id="class-student-list" role="tabpanel"><PaginatedTable><thead><tr><th aria-label="Chọn sinh viên" /><th>Sinh viên</th><th>Lớp hiện tại</th><th>Trạng thái</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={4} className="class-student-empty">Đang tải danh sách sinh viên…</td></tr> : !filtered.length ? <tr><td colSpan={4} className="class-student-empty">Không có sinh viên phù hợp với tìm kiếm.</td></tr> : filtered.map(row => {
          const id = idOf(row), existing = studentClass(row) === classId, checked = selectedSet.has(id), name = display(pick(row, "User.FullName"));
          return <tr key={id} className={`${checked ? "is-selected" : ""} ${existing ? "is-current" : ""}`}><td><input type="checkbox" checked={existing || checked} disabled={saving || existing} aria-label={`Chọn ${display(keyOf(row, "StudentCode"))} · ${name}${existing ? " – Đã trong lớp" : ""}`} onChange={e => setSelected(old => e.target.checked ? Array.from(new Set([...old, id])) : old.filter(value => value !== id))} /></td><td><button type="button" disabled={saving || existing} className="class-student-person" onClick={() => { if (!saving && !existing) setSelected(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id]); }}><span className="class-student-avatar" aria-hidden="true">{name.split(" ").filter(Boolean).slice(-2).map(part => part[0]).join("")}</span><span><strong>{name}</strong><small>{display(keyOf(row, "StudentCode"))} · {display(pick(row, "User.Email"))}</small></span></button></td><td>{display(pick(row, "Class.ClassCode"))}</td><td><span className={`class-student-status ${existing ? "current" : studentClass(row) ? "assigned" : "available"}`}>{existing ? "Đã trong lớp" : studentClass(row) ? "Chuyển từ lớp khác" : "Chưa xếp lớp"}</span></td></tr>;
        })}
      </tbody></PaginatedTable></div>
      <div className="class-student-hints" aria-live="polite">{overCapacity ? <p className="class-student-capacity-error">Bạn chọn {selected.length} sinh viên nhưng lớp chỉ còn {remaining} chỗ. Vui lòng bỏ bớt lựa chọn hoặc cập nhật sĩ số tối đa của lớp.</p> : remaining === 0 && !loading ? <p>Lớp đã đủ sĩ số tối đa. Cập nhật sĩ số của lớp trước khi thêm sinh viên mới.</p> : <p>{filtered.length} sinh viên đang hiển thị. Chọn tất cả chỉ áp dụng cho kết quả đang lọc; sinh viên đã trong lớp không được thêm lại.</p>}{moving > 0 && <p className="class-student-move-note">{moving} sinh viên đã chọn đang ở lớp khác và sẽ được chuyển sang {classCode} khi xác nhận.</p>}</div>
      <footer className="class-student-footer"><span><b>{selected.length}</b> sinh viên được chọn</span><button type="button" className="refresh-button" disabled={saving} onClick={onClose}>Hủy bỏ</button><button type="submit" className="primary-button" disabled={loading || saving || !selected.length || overCapacity}><Icon name="userPlus" size={16} />{saving ? "Đang thêm…" : `Xác nhận thêm${selected.length ? ` (${selected.length})` : ""}`}</button></footer>
    </form>
  </FeatureDialog>;
}
