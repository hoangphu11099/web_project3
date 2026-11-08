import { TemporaryPassword } from "./TemporaryPassword";
import { idOf, keyOf, optionLabel, pick } from "@/controllers/api.controller";
import type { Field, MetadataData } from "@/models/dashboard";

export function FormField({ field, value, metadata, onChange, disabled = false }: { disabled?: boolean; field: Field; value: string; metadata: MetadataData; onChange: (value: string) => void }) {
  const options = field.options || (field.optionKey ? metadata[field.optionKey].map(row => {
    const current = String(idOf(row)) === value;
    const inactive = keyOf(row,"IsActive") === false || (field.optionKey === "teachers" && pick(row,"User.IsActive") === false);
    const closed = ["classes","semesters"].includes(field.optionKey!) && keyOf(row,"Status") === "closed";
    const reason = String(keyOf(row,"disabledReason") || (!current && (inactive || closed) ? inactive ? "Ngừng hoạt động" : "Đã đóng" : ""));
    return {value:String(idOf(row)),label:optionLabel(field.optionKey!,row),disabled:!!reason,reason};
  }) : undefined);
  return <label className={`form-field${field.textarea ? " span-3" : ""}`}>
    <span>{field.label}{field.required && <span className="field-required" aria-hidden="true"> *</span>}</span>
    {field.key === "password" ? <TemporaryPassword value={value} onChange={onChange} required={!field.placeholder?.includes("giữ mật khẩu")} disabled={disabled}/> : options ? <select disabled={disabled} value={value} required={field.required} onChange={e => onChange(e.target.value)}>
      <option value="">Chọn {field.label.toLowerCase()}</option>
      {options.map(option => <option key={option.value} value={option.value} disabled={"disabled" in option && Boolean(option.disabled)}>{option.label}{"reason" in option && option.reason ? ` · ${option.reason}` : ""}</option>)}
    </select> : field.textarea ? <textarea rows={4} value={value} required={field.required} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />
    : <input type={field.type || "text"} value={value} required={field.required} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />}
  </label>;
}
