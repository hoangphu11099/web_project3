import { keyOf, pick } from "./api.controller";
import type { Row } from "@/models/dashboard";

export function classFilterInfo(row: Row) {
 const code = String(keyOf(row, "ClassCode") || "").trim().toUpperCase();
 const year = Number(keyOf(row, "CohortYear"));
 const cohort = year > 0 ? `K${String(year).slice(-2)}` : (/^K\d+/.exec(code)?.[0] || "");
 const major = Number(keyOf(row, "MajorID") || pick(row, "Major.ID") || 0);
 const room = Number(keyOf(row, "RoomID") || pick(row, "Room.ID") || 0);
 return { cohort: cohort || "none", major: major ? String(major) : "none", room: room ? String(room) : "none" };
}

export function matchesClassFilters(row: Row, cohort: string, major: string, room: string) {
 const info = classFilterInfo(row);
 return (!cohort || info.cohort === cohort) && (!major || info.major === major) && (!room || info.room === room);
}
