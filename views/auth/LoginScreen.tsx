"use client";

import { useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import type { AuthUser } from "@/models/dashboard";
import { Icon } from "@/components/ui/Icon";

export function LoginScreen({
  onAuthenticated,
  onBack,
}: {
  onAuthenticated: (user: AuthUser, token: string, remember: boolean) => void;
  onBack?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "forgot" | "change">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState<{
    user: AuthUser;
    token: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    if (!username.trim() || !password)
      return setError("Vui lòng nhập tên đăng nhập/email và mật khẩu.");
    setLoading(true);
    try {
      const data = await apiRequest("", "/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const rawRole = String(data.user?.role || "").toLowerCase();
      if (rawRole !== "admin" && rawRole !== "teacher")
        throw new Error("Tài khoản này không có quyền truy cập dashboard web.");
      const user = { ...data.user, role: rawRole } as AuthUser;
      if (data.first_login) {
        setPending({ user, token: data.token });
        setMode("change");
        return;
      }
      onAuthenticated(user, data.token, remember);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể kết nối backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  const forgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    if (!username.trim())
      return setError("Nhập tên đăng nhập hoặc email cần đặt lại mật khẩu.");
    setLoading(true);
    try {
      const data = await apiRequest("", "/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          email: username.trim(),
        }),
      });
      setInfo(
        data.temp_password
          ? `Mật khẩu tạm thời: ${data.temp_password}. Đăng nhập bằng mật khẩu này và hệ thống sẽ yêu cầu đổi mật khẩu.`
          : data.message || "Yêu cầu đặt lại mật khẩu đã được xử lý.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể kết nối backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!pending) return;
    if (newPassword.length < 6)
      return setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
    if (newPassword !== confirmPassword)
      return setError("Mật khẩu xác nhận không khớp.");
    setLoading(true);
    try {
      await apiRequest(pending.token, "/change-password", {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      });
      onAuthenticated(pending.user, pending.token, remember);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          <img className="login-school-logo" src="/pp-academy-logo.svg" alt="" />
          <div>
            <strong>PP <span>Academy</span></strong>
            <small>Education Manager</small>
          </div>
        </div>
        <div className="visual-copy">
          <p>HỆ THỐNG QUẢN LÝ ĐÀO TẠO</p>
          <h1>
            Một không gian.
            <br />
            Mọi hoạt động học tập.
          </h1>
          <span>
            Quản lý lớp học, sinh viên, điểm danh, điểm số và hoạt động giảng
            dạy trên một nền tảng duy nhất.
          </span>
        </div>
        <div className="visual-orbit">
          <i />
          <i />
          <i />
          <b>PA</b>
        </div>
        <small className="copyright">© 2026 PP Academy · Education Manager</small>
      </section>
      <section className="login-form-wrap">
        {mode === "login" && (
          <form className="login-form" onSubmit={login}>
            {onBack && <button className="login-home-link" type="button" onClick={onBack}>← Về trang chủ PP Academy</button>}
            <div className="mobile-login-brand">
              <img className="login-school-logo" src="/pp-academy-logo.svg" alt="" />
              <strong>PP Academy</strong>
            </div>
            <p className="login-kicker">Chào mừng trở lại</p>
            <h2>Đăng nhập hệ thống</h2>
            <p className="login-subtitle">
              Sử dụng tài khoản được nhà trường cấp để tiếp tục.
            </p>
            <label>
              Tên đăng nhập hoặc email
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email"
                autoFocus
              />
            </label>
            <label>
              Mật khẩu
              <div className="password-field">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
            </label>
            <div className="login-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />{" "}
                Ghi nhớ đăng nhập
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setInfo("");
                }}>
                Quên mật khẩu?
              </button>
            </div>
            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}
            <button className="login-submit" disabled={loading}>
              {loading ? (
                "Đang đăng nhập..."
              ) : (
                <>
                  Đăng nhập <Icon name="arrow" size={16} />
                </>
              )}
            </button>
          </form>
        )}
        {mode === "forgot" && (
          <form className="login-form" onSubmit={forgot}>
            <p className="login-kicker">Khôi phục tài khoản</p>
            <h2>Quên mật khẩu</h2>
            <p className="login-subtitle">
              Nhập username hoặc email. Backend sẽ tạo mật khẩu tạm thời.
            </p>
            <label>
              Username / Email
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </label>
            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}
            {info && (
              <div className="password-note">
                <Icon name="check" size={16} />
                {info}
              </div>
            )}
            <button className="login-submit" disabled={loading}>
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>
            <button
              className="back-login"
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}>
              ← Quay lại đăng nhập
            </button>
          </form>
        )}
        {mode === "change" && pending && (
          <form className="login-form" onSubmit={changePassword}>
            <p className="login-kicker">Bảo mật tài khoản</p>
            <h2>Tạo mật khẩu mới</h2>
            <p className="login-subtitle">
              Đây là lần đăng nhập đầu tiên của{" "}
              <strong>{pending.user.username}</strong>.
            </p>
            <label>
              Mật khẩu mới
              <div className="password-field">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
            </label>
            <label>
              Xác nhận mật khẩu
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}
            <button className="login-submit" disabled={loading}>
              {loading ? "Đang cập nhật..." : "Đổi mật khẩu và tiếp tục"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
