import { idOf, optionLabel } from "@/controllers/api.controller";
import type { Field, MetadataData } from "@/models/dashboard";

export function FormField({ field, value, metadata, onChange, disabled = false }: { disabled?: boolean; field: Field; value: string; metadata: MetadataData; onChange: (value: string) => void }) {
  const options = field.options || (field.optionKey ? metadata[field.optionKey].map(row => ({ value: String(idOf(row)), label: optionLabel(field.optionKey!, row) })) : undefined);
  return <label className={`form-field${field.textarea ? " span-3" : ""}`}>
    <span>{field.label}{field.required && <span className="field-required" aria-hidden="true"> *</span>}</span>
    {options ? <select disabled={disabled} value={value} required={field.required} onChange={e => onChange(e.target.value)}>
      <option value="">Chọn {field.label.toLowerCase()}</option>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select> : field.textarea ? <textarea rows={4} value={value} required={field.required} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />
    : <input type={field.type || "text"} value={value} required={field.required} placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />}
  </label>;
}
