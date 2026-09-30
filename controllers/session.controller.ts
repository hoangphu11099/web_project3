import type { AuthUser } from "@/models/dashboard";

const TOKEN_KEY = "token";
const USER_KEY = "authUser";

export function readSession(): { token: string; user: AuthUser } | null {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    const user = JSON.parse(raw) as AuthUser;
    return user.role === "admin" || user.role === "teacher" ? { token, user } : null;
  } catch { return null; }
}

export function saveSession(user: AuthUser, token: string, remember: boolean) {
  clearSession();
  const target = remember ? localStorage : sessionStorage;
  target.setItem(TOKEN_KEY, token);
  target.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY);
}
