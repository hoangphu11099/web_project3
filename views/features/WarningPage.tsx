"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { apiRequest, display, idOf, keyOf } from "@/controllers/api.controller";
import type { MetadataData, ToastHandler } from "@/models/dashboard";
import { FeatureDialog } from "@/components/common/FeatureDialog";

type Reason = "all" | "unexcused" | "absence_limit" | "failed_course";
type Candidate = {
  enrollmentId: number; studentId: number; studentCode: string; studentName: string;
  classId: number; classCode: string; courseName: string; semesterName: string;
  unexcused: number; missed: number; totalLessons: number; score: number | null; reasons: Reason[];
};
const reasons: Record<Reason, string> = {
  all: "Tất cả vi phạm đã ghi nhận", unexcused: "Nghỉ không phép",
  absence_limit: "Nghỉ quá số buổi quy định", failed_course: "Rớt môn",
};

function violationDetail(row: Candidate, reason: Reason) {
  return row.reasons.filter(code => reason === "all" || reason === code).map(code => {
    if (code === "unexcused") return `Nghỉ không phép: ${row.unexcused} buổi`;
    if (code === "absence_limit") return `Nghỉ ${row.missed}/${row.totalLessons} buổi, vượt 25% tổng số buổi (gồm nghỉ có phép và không phép)`;
    return `Rớt môn: điểm đã duyệt ${row.score?.toFixed(2)}/100 (dưới 40)`;
  }).join("; ");
}

export function WarningPage({ token, metadata, onToast }: { token: string; metadata: MetadataData; onToast: ToastHandler }) {
  const [semesterId, setSemesterId] = useState("");
  const [classId, setClassId] = useState("");
  const [reason, setReason] = useState<Reason>("all");
  const [rows, setRows] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<{ all: boolean; rows: Candidate[]; reason: Reason } | null>(null);

  useEffect(() => {
    if (semesterId) return;
    const active = metadata.semesters.find(s => String(keyOf(s, "Status")).toLowerCase() === "active") || metadata.semesters[0];
    if (active) setSemesterId(String(idOf(active)));
  }, [metadata.semesters, semesterId]);

  useEffect(() => {
    if (!semesterId) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setRows([]); setSelected([]);
    const params = new URLSearchParams({ semesterId });
    if (classId) params.set("classId", classId);
    apiRequest(token, `/academic-warnings/candidates?${params}`, { signal: controller.signal })
      .then(payload => { if (!controller.signal.aborted) setRows(payload.data || []); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Không tải được danh sách vi phạm"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, semesterId, classId, revision]);

  const visible = rows.filter(row => reason === "all" || row.reasons.includes(reason));
  const selectedRows = visible.filter(row => selected.includes(row.enrollmentId));
  const studentCount = (items: Candidate[]) => new Set(items.map(row => row.studentId)).size;
  const toggle = (id: number) => setSelected(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  const send = async () => {
    if (!draft || sending) return;
    setSending(true); setError("");
    try {
      const payload = await apiRequest(token, "/academic-warnings/send", {
        method: "POST",
        body: JSON.stringify({ semesterId: Number(semesterId), classId: Number(classId) || undefined,
          reason: draft.reason, all: false, enrollmentIds: draft.rows.map(row => row.enrollmentId) }),
      });
      onToast(payload.message); setDraft(null); setSelected([]); setRevision(value => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không gửi được cảnh báo";
      setError(message); onToast(message, "error");
    } finally { setSending(false); }
  };
  const example = draft?.rows[0];
  const preview = example && draft ? `Chào ${example.studentName} (${example.studentCode}),\n\nPP Academy thông báo cảnh báo học vụ trong học kỳ ${example.semesterName}:\n${draft.rows.filter(row => row.studentId === example.studentId).map(row => `- Lớp ${row.classCode} · Môn ${row.courseName}: ${violationDetail(row, draft.reason)}.`).join("\n")}\n\nĐề nghị sinh viên kiểm tra kết quả học tập, chuyên cần và liên hệ giáo viên hoặc phòng đào tạo để được hướng dẫn khắc phục.\n\nTrân trọng,\nPhòng Đào tạo · PP Academy` : "";

  return <section className="feature-page warning-page">
    <div className="feature-heading"><div><p className="eyebrow">Theo dõi chuyên cần & kết quả học tập</p><h1>Cảnh báo học vụ</h1><p>Sinh viên nghỉ không phép, nghỉ quá số buổi hoặc rớt môn trong các lớp.</p></div></div>
    <div className="feature-form warning-filters">
      <div className="form-grid">
        <label>Học kỳ<select value={semesterId} disabled={sending} onChange={e => { setSemesterId(e.target.value); setSelected([]); setRows([]); }}><option value="">Chọn học kỳ</option>{metadata.semesters.map(s => <option key={idOf(s)} value={idOf(s)}>{display(keyOf(s, "Name"))}</option>)}</select></label>
        <label>Lớp học<select value={classId} disabled={sending} onChange={e => { setClassId(e.target.value); setSelected([]); setRows([]); }}><option value="">Tất cả lớp</option>{metadata.classes.map(c => <option key={idOf(c)} value={idOf(c)}>{display(keyOf(c, "ClassCode"))}</option>)}</select></label>
        <label>Lý do cảnh báo<select value={reason} disabled={sending} onChange={e => { setReason(e.target.value as Reason); setSelected([]); }}>{Object.entries(reasons).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      </div>
      <p className="warning-policy">Nghỉ quá số buổi: trên 25% tổng lịch học của môn. Rớt môn: điểm tổng kết đã duyệt dưới 40/100. Chỉ tính điểm danh đã xác nhận, không tính phiên bị hủy hoặc đang diễn ra.</p>
    </div>
    <div className="warning-summary" aria-live="polite">
      <div><strong>{studentCount(visible)}</strong><span>Sinh viên vi phạm</span></div>
      <div><strong>{rows.filter(row => row.reasons.includes("unexcused")).length}</strong><span>Lượt nghỉ không phép theo môn</span></div>
      <div><strong>{rows.filter(row => row.reasons.includes("absence_limit")).length}</strong><span>Lượt vượt số buổi theo môn</span></div>
      <div><strong>{rows.filter(row => row.reasons.includes("failed_course")).length}</strong><span>Lượt rớt môn</span></div>
    </div>
    <div className="warning-toolbar">
      <p>Đã chọn <strong>{studentCount(selectedRows)}</strong> sinh viên · {selectedRows.length}/{visible.length} dòng</p>
      <div><button className="refresh-button" disabled={loading || sending || !semesterId} onClick={() => setRevision(value => value + 1)}>Tải lại</button>
        <button className="refresh-button" disabled={loading || sending || !selectedRows.length} onClick={() => { setError(""); setDraft({ all: false, rows: selectedRows, reason }); }}>Gửi cho sinh viên đã chọn</button>
        <button className="primary-button" disabled={loading || sending || !visible.length} onClick={() => { setError(""); setDraft({ all: true, rows: visible, reason }); }}>Gửi cảnh báo tất cả ({studentCount(visible)})</button></div>
    </div>
    {error && !draft && <div className="feature-error" role="alert">{error}</div>}
    <div className="feature-table-wrap"><table><thead><tr>
      <th><input type="checkbox" aria-label="Chọn tất cả dòng đang hiển thị" disabled={!visible.length || loading || sending} checked={visible.length > 0 && selectedRows.length === visible.length} onChange={e => setSelected(e.target.checked ? visible.map(row => row.enrollmentId) : [])} /></th>
      <th>Sinh viên</th><th>Lớp / Môn học</th><th>Nghỉ không phép</th><th>Tổng buổi nghỉ</th><th>Điểm đã duyệt</th><th>Vi phạm</th><th>Thao tác</th>
    </tr></thead><tbody>{loading ? <tr><td colSpan={8}>Đang kiểm tra dữ liệu vi phạm...</td></tr> : !visible.length ? <tr><td colSpan={8}>{!semesterId ? "Chọn học kỳ để xem sinh viên vi phạm." : error ? "Không tải được dữ liệu. Vui lòng thử lại." : "Không có sinh viên vi phạm phù hợp với bộ lọc."}</td></tr> : visible.map(row => <tr key={row.enrollmentId}>
      <td><input type="checkbox" aria-label={`Chọn ${row.studentName}, môn ${row.courseName}`} checked={selected.includes(row.enrollmentId)} disabled={sending} onChange={() => toggle(row.enrollmentId)} /></td>
      <td><strong>{row.studentName}</strong><small className="warning-cell-note">{row.studentCode}</small></td>
      <td><strong>{row.classCode}</strong><small className="warning-cell-note">{row.courseName}</small></td>
      <td>{row.unexcused} buổi</td><td>{row.missed}/{row.totalLessons || "chưa có lịch"}{row.totalLessons > 0 && <small className="warning-cell-note">{(row.missed / row.totalLessons * 100).toFixed(1)}%</small>}</td>
      <td>{row.score === null ? "Chưa duyệt" : `${row.score}/100`}</td>
      <td><div className="warning-reasons">{row.reasons.map(code => <span key={code}>{reasons[code]}</span>)}</div></td>
      <td><div className="row-actions"><button disabled={sending} onClick={() => { setError(""); setDraft({ all: false, rows: [row], reason }); }}>Gửi cảnh báo</button></div></td>
    </tr>)}</tbody></table></div>
    <p className="warning-policy">Mỗi dòng là một môn của sinh viên. Khi gửi nhiều môn cùng lúc, hệ thống gộp thành một thông báo cho mỗi sinh viên. “Gửi tất cả” áp dụng cho học kỳ, lớp và lý do đang lọc.</p>
    {draft && <FeatureDialog title="Gửi cảnh báo học vụ" description={`Mẫu có sẵn · ${studentCount(draft.rows)} sinh viên · Thông báo trong ứng dụng`} onClose={() => { if (!sending) setDraft(null); }}>
      <div className="warning-compose">
        <label>Lý do gửi<select value={draft.reason} disabled={sending} onChange={e => {
          const nextReason = e.target.value as Reason;
          setDraft({ ...draft, reason: nextReason }); setError("");
        }}>{Object.entries(reasons).filter(([code]) => code === "all" || draft.rows.every(row => row.reasons.includes(code as Reason))).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <p>Thông tin sinh viên, lớp, môn và số liệu vi phạm được tự điền cho từng người nhận.</p>
        <details><summary>Danh sách người nhận ({studentCount(draft.rows)})</summary><ul>{Array.from(new Map(draft.rows.map(row => [row.studentId, row])).values()).map(row => <li key={row.studentId}>{row.studentName} · {row.studentCode}</li>)}</ul></details>
        <h3>Cảnh báo học vụ · {example?.semesterName}</h3><pre className="warning-preview">{preview}</pre>
        {error && <div className="feature-error" role="alert">{error}</div>}
        <div className="warning-toolbar"><span>Gửi lại sẽ tạo thêm một thông báo mới.</span><button className="primary-button" disabled={sending} onClick={send}>{sending ? "Đang gửi..." : `Gửi cảnh báo cho ${studentCount(draft.rows)} sinh viên`}</button></div>
      </div>
    </FeatureDialog>}
  </section>;
}
