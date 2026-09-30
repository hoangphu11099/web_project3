import type { ReactNode, SVGProps } from "react";

export type IconName = "home" | "students" | "teacher" | "class" | "course" | "calendar" | "warning" | "bell" | "assign" | "report" | "attendance" | "grade" | "exercise" | "search" | "menu" | "logout" | "plus" | "refresh" | "arrow" | "mail" | "check" | "upload" | "userPlus" | "close" | "eye" | "eyeOff" | "copy";

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  students: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  teacher: <><circle cx="10" cy="8" r="4"/><path d="M4 21v-2a6 6 0 0 1 12 0v2M18 8l4 2-4 2z"/></>,
  class: <><path d="M3 4h18v16H3zM3 9h18M8 9v11"/></>, course: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>, warning: <><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>, assign: <><path d="M15 3h6v6M10 14 21 3M18 13v8H3V6h8"/></>,
  report: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>, attendance: <><path d="m3 12 4 4L17 6"/><path d="M21 12v8H5"/></>,
  grade: <><path d="m12 3 2.8 5.7L21 9.6l-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/></>, exercise: <><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, menu: <path d="M4 6h16M4 12h16M4 18h16"/>, logout: <><path d="M10 17l5-5-5-5M15 12H3M15 4h6v16h-6"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>, arrow: <path d="M5 19 19 5M10 5h9v9"/>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>, check: <path d="m5 12 4 4L19 6"/>, upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>,
  userPlus: <><path d="M15 21v-2a6 6 0 0 0-12 0v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></>, close: <path d="m6 6 12 12M18 6 6 18"/>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/></>, eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c6 0 10 8 10 8a18 18 0 0 1-2.1 3.2M6.6 6.6C3.7 8.4 2 12 2 12s4 8 10 8a9.7 9.7 0 0 0 4-.9"/></>, copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
};

export function Icon({ name, size = 18, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
