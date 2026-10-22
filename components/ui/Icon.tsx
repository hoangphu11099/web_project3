import type { SVGProps } from "react";
import type { IconType } from "react-icons";
import {
  FiUser, FiHome, FiUsers, FiUserCheck, FiLayout, FiBookOpen,
  FiCalendar, FiAlertTriangle, FiBell, FiExternalLink, FiBarChart2,
  FiCheckSquare, FiStar, FiFileText, FiSearch, FiMenu, FiLogOut,
  FiPlus, FiRefreshCw, FiArrowUpRight, FiMail, FiCheck, FiUpload,
  FiUserPlus, FiX, FiEye, FiEyeOff, FiCopy, FiArrowLeft, FiArrowRight,
  FiChevronRight, FiDownload, FiMaximize, FiMinimize, FiMapPin, FiPhone,
} from "react-icons/fi";

export type IconName = "user" | "home" | "students" | "teacher" | "class" | "course" | "calendar" | "warning" | "bell" | "assign" | "report" | "attendance" | "grade" | "exercise" | "search" | "menu" | "logout" | "plus" | "refresh" | "arrow" | "mail" | "check" | "upload" | "userPlus" | "close" | "eye" | "eyeOff" | "copy" | "arrowLeft" | "arrowRight" | "chevronRight" | "download" | "maximize" | "minimize" | "location" | "phone";

const icons: Record<IconName, IconType> = {
  user: FiUser, home: FiHome, students: FiUsers, teacher: FiUserCheck,
  class: FiLayout, course: FiBookOpen, calendar: FiCalendar, warning: FiAlertTriangle,
  bell: FiBell, assign: FiExternalLink, report: FiBarChart2, attendance: FiCheckSquare,
  grade: FiStar, exercise: FiFileText, search: FiSearch, menu: FiMenu, logout: FiLogOut,
  plus: FiPlus, refresh: FiRefreshCw, arrow: FiArrowUpRight, mail: FiMail,
  check: FiCheck, upload: FiUpload, userPlus: FiUserPlus, close: FiX,
  eye: FiEye, eyeOff: FiEyeOff, copy: FiCopy, arrowLeft: FiArrowLeft,
  arrowRight: FiArrowRight, chevronRight: FiChevronRight, download: FiDownload,
  maximize: FiMaximize, minimize: FiMinimize, location: FiMapPin, phone: FiPhone,
};

export function Icon({ name, size = 18, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const Component = icons[name];
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" focusable="false" {...props} />;
}
