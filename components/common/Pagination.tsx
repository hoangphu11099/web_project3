"use client";

import { Children, Fragment, cloneElement, isValidElement, useState, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

export const PAGE_SIZE = 20;

export function pageWindow(count: number, requested: number) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = Math.max(1, Math.min(requested, pages));
  return { page, pages, start: (page - 1) * PAGE_SIZE, end: Math.min(page * PAGE_SIZE, count) };
}

export function Pagination({ count, page, onChange }: { count: number; page: number; onChange: (page: number) => void }) {
  const window = pageWindow(count, page);
  if (count <= PAGE_SIZE) return null;
  return <nav className="entity-pagination" aria-label="Phân trang danh sách">
    <span>{window.start + 1}–{window.end} / {count} mục</span>
    <button type="button" className="refresh-button" disabled={window.page === 1} onClick={() => onChange(1)}>Đầu</button>
    <button type="button" className="refresh-button" disabled={window.page === 1} onClick={() => onChange(window.page - 1)}>Trang trước</button>
    <span aria-live="polite">Trang {window.page} / {window.pages}</span>
    <button type="button" className="refresh-button" disabled={window.page === window.pages} onClick={() => onChange(window.page + 1)}>Trang sau</button>
    <button type="button" className="refresh-button" disabled={window.page === window.pages} onClick={() => onChange(window.pages)}>Cuối</button>
  </nav>;
}

function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap(child => isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? flatten(child.props.children) : [child]);
}

function textKey(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (isValidElement<{ children?: ReactNode }>(node)) return textKey(node.props.children);
  return Children.toArray(node).map(textKey).join("|");
}

// Slice rendered items only; the source dataset remains complete for filters,
// selection across pages, calculations, printing and exports.
export function PaginatedItems({ children, paginationTag }: { children: ReactNode; paginationTag?: "li" }) {
  const items = flatten(children);
  const signature = items.map((item, index) => isValidElement(item) ? String(item.key ?? index) : String(index)).join("|");
  const [cursor, setCursor] = useState({ signature, page: 1 });
  const window = pageWindow(items.length, cursor.signature === signature ? cursor.page : 1);
  const controls = <Pagination count={items.length} page={window.page} onChange={page => setCursor({ signature, page })} />;
  return <>{items.slice(window.start, window.end)}{paginationTag === "li" ? items.length > PAGE_SIZE && <li className="pagination-list-item">{controls}</li> : controls}</>;
}

export function PaginatedTable({ children, ...props }: HTMLAttributes<HTMLTableElement>) {
  const sections = Children.toArray(children);
  const bodies = sections.filter((child): child is ReactElement<{ children?: ReactNode }> => isValidElement(child) && child.type === "tbody");
  const rows = bodies.flatMap(body => flatten(body.props.children));
  const signature = rows.map((row, index) => isValidElement<{ children?: ReactNode }>(row) ? `${row.key ?? index}:${textKey(Children.toArray(row.props.children)[0])}` : String(index)).join("|");
  const [cursor, setCursor] = useState({ signature, page: 1 });
  const window = pageWindow(rows.length, cursor.signature === signature ? cursor.page : 1);
  return <><table {...props}>{sections.map((section, sectionIndex) => {
    if (!isValidElement<{ children?: ReactNode }>(section) || section.type !== "tbody") return section;
    const bodyRows = flatten(section.props.children);
    const offset = sections.slice(0, sectionIndex).reduce<number>((count, previous) => count + (isValidElement<{ children?: ReactNode }>(previous) && previous.type === "tbody" ? flatten(previous.props.children).length : 0), 0);
    const start = Math.max(0, window.start - offset), end = Math.max(0, window.end - offset);
    return cloneElement(section, {}, bodyRows.slice(start, end));
  })}</table><Pagination count={rows.length} page={window.page} onChange={page => setCursor({ signature, page })} /></>;
}
