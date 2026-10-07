"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  display,
  idOf,
  keyOf,
  statusLabel,
} from "@/controllers/api.controller";
import {
  clearSession,
  readSession,
  saveSession,
} from "@/controllers/session.controller";
import {
  emptyMetadata,
  type AuthUser,
  type MetadataData,
  type Role,
  type Row,
} from "@/models/dashboard";
import { LoginScreen } from "@/views/auth/LoginScreen";
import { PublicWebsite } from "@/views/public/PublicWebsite";
import { DashboardHome } from "@/views/dashboard/DashboardHome";
import { FeatureRouter } from "@/views/features/FeatureRouter";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { Icon, type IconName } from "@/components/ui/Icon";

const adminNav: [string, IconName][] = [
  ["Tổng quan", "home"],
  ["Trang chủ trường", "home"],
  ["Sinh viên", "students"],
  ["Giảng viên", "teacher"],
  ["Năm học", "calendar"],
  ["Học kỳ", "calendar"],
  ["Học phần", "course"],
  ["Lớp học", "class"],
  ["Môn học", "course"],
  ["Lịch thi", "calendar"],
  ["Cảnh báo học vụ", "warning"],
  ["Thông báo", "bell"],
  ["Phân công lớp", "assign"],
  ["Báo cáo", "report"],
];
const teacherNav: [string, IconName][] = [
  ["Tổng quan", "home"],
  ["Lớp của tôi", "class"],
  ["Lịch dạy", "calendar"],
  ["Điểm danh", "attendance"],
  ["Bảng điểm", "grade"],
  ["Bài tập", "exercise"],
  ["Đề xuất lớp", "assign"],
  ["Báo cáo", "report"],
];

export function DashboardApp() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [active, setActive] = useState("Tổng quan");
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notifications, setNotifications] = useState<Row[]>([]);
  const [metadata, setMetadata] = useState<MetadataData>(emptyMetadata);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [apiOnline, setApiOnline] = useState(false);
  const [toast, setToast] = useState("");
  const role: Role = authUser?.role === "teacher" ? "teacher" : "admin";
  const nav = role === "admin" ? adminNav : teacherNav;
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("public") === "1") {
      setAuthReady(true);
      return;
    }
    const session = readSession();
    if (session) {
      setToken(session.token);
      setAuthUser(session.user);
    }
    setAuthReady(true);
  }, []);
  useEffect(() => {
    if (!token || !authUser) return;
    Promise.all([
      apiRequest(token, `/dashboard/${role}`),
      apiRequest(token, "/metadata"),
      apiRequest(token, "/notifications"),
    ])
      .then(([dashboard, meta, notices]) => {
        setStats(dashboard.data || {});
        setMetadata({ ...emptyMetadata, ...(meta.data || {}) });
        setNotifications(
          Array.isArray(notices.data) ? notices.data.slice(0, 6) : [],
        );
        setApiOnline(true);
      })
      .catch(() => setApiOnline(false));
  }, [token, authUser, role]);

  const act = (message: string) => {
    setToast(message);
    if (token) apiRequest(token, "/metadata").then(meta => setMetadata({ ...emptyMetadata, ...(meta.data || {}) })).catch(() => setApiOnline(false));
    window.setTimeout(() => setToast(""), 3000);
  };
  const handleAuthenticated = (
    user: AuthUser,
    newToken: string,
    remember: boolean,
  ) => {
    saveSession(user, newToken, remember);
    setToken(newToken);
    setAuthUser(user);
    setShowLogin(false);
    setActive("Tổng quan");
  };
  const logout = async () => {
    try {
      await apiRequest(token, "/logout", { method: "POST" });
    } catch {
      /* đăng xuất cục bộ vẫn tiếp tục */
    }
    clearSession();
    setToken("");
    setAuthUser(null);
    setMetadata(emptyMetadata);
    setStats({});
    setNotifications([]);
    setActive("Tổng quan");
  };
  const openNotifications = async () => {
    const next = !noticeOpen;
    setNoticeOpen(next);
    if (!next) return;
    try {
      const payload = await apiRequest(token, "/notifications");
      setNotifications(
        Array.isArray(payload.data) ? payload.data.slice(0, 6) : [],
      );
    } catch (error) {
      act(error instanceof Error ? error.message : "Không tải được thông báo");
    }
  };

  if (!authReady)
    return (
      <div className="auth-loading">
        <img className="sidebar-school-logo" src="/pp-academy-logo.png" alt="" />
        <p>Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  if (!authUser || !token)
    return showLogin
      ? <LoginScreen onAuthenticated={handleAuthenticated} onBack={() => setShowLogin(false)} />
      : <PublicWebsite onLogin={() => setShowLogin(true)} />;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <img className="sidebar-school-logo" src="/pp-academy-logo.png" alt="" />
          <div>
            <strong>
              PP <span>Academy</span>
            </strong>
            <small>Education Manager</small>
          </div>
        </div>
        <div className="sidebar-scroll">
        <div className="signed-role">
          <span>{role === "admin" ? "AD" : "GV"}</span>
          <div>
            <small>Đăng nhập với vai trò</small>
            <strong>{role === "admin" ? "Quản trị viên" : "Giảng viên"}</strong>
          </div>
        </div>
        <p className="nav-label">Không gian làm việc</p>
        <nav aria-label="Không gian làm việc">
          {nav.map(([label, icon]) => (
            <button
              key={label}
              className={active === label ? "active" : ""}
              onClick={() => {
                setActive(label);
                setMenuOpen(false);
              }}>
              <span className="nav-icon">
                <Icon name={icon} size={17} />
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <div className="help-icon">?</div>
          <strong>Trạng thái kết nối</strong>
          <p>
            {apiOnline
              ? "Frontend đang kết nối được backend."
              : "Chưa kết nối được backend. Kiểm tra API URL và server."}
          </p>
          <span
            className={`connection-badge ${apiOnline ? "online" : "offline"}`}>
            {apiOnline ? "Đã kết nối" : "Mất kết nối"}
          </span>
        </div>
        </div>
        <div className="profile-card">
          <span className="avatar">{role === "admin" ? "AD" : "GV"}</span>
          <span>
            <strong>{authUser.fullName || authUser.username}</strong>
            <small>{authUser.username}</small>
          </span>
          <button className="logout-button" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất">
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="scrim"
          aria-label="Đóng menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <section className="workspace">
        <header className="topbar">
          <button
            className="menu-button"
            aria-label="Mở menu"
            onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={20} />
          </button>
          <GlobalSearch role={role} token={token} onNavigate={setActive} />
          <div className="top-actions">
            <span className="term">{active}</span>
            <div className="notification-wrap">
              <button
                className="icon-button"
                aria-label="Thông báo"
                onClick={openNotifications}>
                <Icon name="bell" size={18} />
                {notifications.length > 0 && <i />}
              </button>
              {noticeOpen && (
                <div className="notice-panel wide">
                  <strong>Thông báo gần đây</strong>
                  {notifications.length === 0 ? (
                    <p>Chưa có thông báo.</p>
                  ) : (
                    notifications.map((item) => (
                      <div className="notice-item" key={idOf(item)}>
                        <b>{display(keyOf(item, "subject"))}</b>
                        <span>{display(keyOf(item, "recipientEmail"))}</span>
                        <small>{statusLabel(keyOf(item, "status"))}</small>
                      </div>
                    ))
                  )}
                  {role === "admin" && (
                    <button
                      onClick={() => {
                        setNoticeOpen(false);
                        setActive("Thông báo");
                      }}>
                      Mở trang thông báo →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="content">
          {active === "Tổng quan" ? (
            <DashboardHome
              role={role}
              user={authUser}
              stats={stats}
              today={today}
              token={token}
              onNavigate={setActive}
            />
          ) : (
            <FeatureRouter
              role={role}
              active={active}
              token={token}
              metadata={metadata}
              onToast={act}
              onNavigate={setActive}
            />
          )}
        </div>
      </section>
      {toast && (
        <div className="toast">
          <Icon name="check" size={16} />
          {toast}
        </div>
      )}
    </main>
  );
}
