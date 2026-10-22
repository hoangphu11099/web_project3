"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function FeatureDialog({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={ref} className="learning-modal" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => {
    if (e.target !== e.currentTarget) return;
    const b = e.currentTarget.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) onClose();
  }}><div className="learning-modal-layout"><header className="learning-modal-header"><div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div><button className="refresh-button" onClick={onClose} autoFocus>Đóng</button></header><div className="learning-modal-body">{children}</div></div></dialog>;
}
