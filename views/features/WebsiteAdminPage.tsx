"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import { defaultSiteSettings, type SchoolPost, type SiteSettings } from "@/models/publicWebsite";
import type { ToastHandler } from "@/models/dashboard";
import { Icon } from "@/components/ui/Icon";

const emptyPost: Omit<SchoolPost, "id" | "slug"> = {
  title: "", excerpt: "", content: "", coverImageUrl: "", authorName: "Ban Truyền thông PP Academy",
  isPublished: true, isFeatured: false,
};

export function WebsiteAdminPage({ token, onToast }: { token: string; onToast: ToastHandler }) {
  const [tab, setTab] = useState<"settings" | "posts">("settings");
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [posts, setPosts] = useState<SchoolPost[]>([]);
  const [draft, setDraft] = useState({ ...emptyPost });
  const [editingId, setEditingId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [settingPayload, postPayload] = await Promise.all([
        apiRequest(token, "/admin/site-settings"),
        apiRequest(token, "/admin/posts"),
      ]);
      setSettings({ ...defaultSiteSettings, ...(settingPayload.data || {}) });
      setPosts(Array.isArray(postPayload.data) ? postPayload.data : []);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được nội dung trang chủ");
    }
  };

  useEffect(() => { load(); }, [token]);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const payload = await apiRequest(token, "/admin/site-settings", { method: "PUT", body: JSON.stringify(settings) });
      setSettings({ ...settings, ...(payload.data || {}) });
      onToast("Đã cập nhật trang chủ PP Academy");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không lưu được cấu hình"); }
    finally { setBusy(false); }
  };

  const savePost = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await apiRequest(token, editingId ? `/admin/posts/${editingId}` : "/admin/posts", {
        method: editingId ? "PUT" : "POST", body: JSON.stringify(draft),
      });
      onToast(editingId ? "Đã cập nhật bài viết" : "Đã tạo bài viết");
      setDraft({ ...emptyPost }); setEditingId(0); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không lưu được bài viết"); }
    finally { setBusy(false); }
  };

  const editPost = (post: SchoolPost) => {
    setEditingId(post.id);
    setDraft({ title: post.title, excerpt: post.excerpt, content: post.content, coverImageUrl: post.coverImageUrl, authorName: post.authorName, isPublished: post.isPublished, isFeatured: post.isFeatured });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removePost = async (post: SchoolPost) => {
    if (!confirm(`Xóa bài viết “${post.title}”?`)) return;
    try { await apiRequest(token, `/admin/posts/${post.id}`, { method: "DELETE" }); onToast("Đã xóa bài viết"); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không xóa được bài viết"); }
  };

  const setSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setSettings({ ...settings, [key]: value });
  const setPost = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft({ ...draft, [key]: value });

  return <section className="feature-page website-admin-page">
    <div className="feature-heading"><div><p className="eyebrow">Website công khai PP Academy</p><h1>Trang chủ trường</h1><p>Quản lý nội dung giới thiệu, link tải ứng dụng và các bài viết.</p></div><button className="refresh-button" onClick={() => window.open("/?public=1", "_blank")}><Icon name="arrow" size={15} />Xem trang công khai</button></div>
    <div className="website-admin-tabs"><button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Nội dung & ứng dụng</button><button className={tab === "posts" ? "active" : ""} onClick={() => setTab("posts")}>Bài viết <span>{posts.length}</span></button></div>
    {error && <div className="feature-error">! {error}</div>}

    {tab === "settings" ? <form className="feature-form website-settings-form" onSubmit={saveSettings}>
      <div className="admin-form-section"><div><strong>Thông tin học viện</strong><p>Nội dung chính hiển thị trên banner và phần giới thiệu.</p></div><div className="form-grid">
        <label>Tên trường<input required value={settings.schoolName} onChange={(e) => setSetting("schoolName", e.target.value)} /></label>
        <label>Slogan<input value={settings.slogan} onChange={(e) => setSetting("slogan", e.target.value)} /></label>
        <label className="span-3">Giới thiệu ngắn<textarea required value={settings.introduction} onChange={(e) => setSetting("introduction", e.target.value)} /></label>
        <label>Link ảnh banner<input value={settings.heroImageUrl} onChange={(e) => setSetting("heroImageUrl", e.target.value)} placeholder="https://... hoặc /ten-anh.webp" /></label>
        <label>Link logo<input value={settings.logoUrl} onChange={(e) => setSetting("logoUrl", e.target.value)} placeholder="https://... hoặc /logo.svg" /></label>
      </div></div>
      <div className="admin-form-section"><div><strong>Nút tải ứng dụng</strong><p>Hỗ trợ link APK, Google Drive, GitHub Release hoặc trang tải ứng dụng.</p></div><div className="form-grid">
        <label>Tên nút<input value={settings.downloadButtonLabel} onChange={(e) => setSetting("downloadButtonLabel", e.target.value)} placeholder="Tải ứng dụng" /></label>
        <label className="span-2">Đường dẫn tải<input type="url" value={settings.downloadUrl} onChange={(e) => setSetting("downloadUrl", e.target.value)} placeholder="https://drive.google.com/..." /></label>
        <label className="check-line span-3"><input type="checkbox" checked={settings.downloadEnabled} onChange={(e) => setSetting("downloadEnabled", e.target.checked)} /> Hiển thị và kích hoạt nút tải ứng dụng</label>
      </div></div>
      <div className="admin-form-section"><div><strong>Thông tin liên hệ</strong><p>Hiển thị tại chân trang website.</p></div><div className="form-grid">
        <label>Email<input type="email" value={settings.contactEmail} onChange={(e) => setSetting("contactEmail", e.target.value)} /></label>
        <label>Số điện thoại<input value={settings.phone} onChange={(e) => setSetting("phone", e.target.value)} /></label>
        <label>Địa chỉ<input value={settings.address} onChange={(e) => setSetting("address", e.target.value)} /></label>
      </div></div>
      <div className="form-actions"><button className="primary-button" disabled={busy}><Icon name="check" size={15} />{busy ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
    </form> : <>
      <form className="feature-form post-editor" onSubmit={savePost}>
        <div className="feature-heading"><div><p className="eyebrow">{editingId ? "Chỉnh sửa nội dung" : "Bài viết mới"}</p><h2>{editingId ? "Cập nhật bài viết" : "Đăng bài về trường"}</h2></div>{editingId > 0 && <button type="button" className="refresh-button" onClick={() => { setEditingId(0); setDraft({ ...emptyPost }); }}>Hủy chỉnh sửa</button>}</div>
        <div className="form-grid">
          <label className="span-2">Tiêu đề<input required value={draft.title} onChange={(e) => setPost("title", e.target.value)} placeholder="Nhập tiêu đề bài viết" /></label>
          <label>Tác giả<input value={draft.authorName} onChange={(e) => setPost("authorName", e.target.value)} /></label>
          <label className="span-3">Mô tả ngắn<textarea required value={draft.excerpt} onChange={(e) => setPost("excerpt", e.target.value)} placeholder="Nội dung tóm tắt hiển thị trên thẻ bài viết" /></label>
          <label className="span-3">Nội dung bài viết<textarea className="post-content-input" required value={draft.content} onChange={(e) => setPost("content", e.target.value)} placeholder="Mỗi đoạn cách nhau bằng một dòng trống..." /></label>
          <label className="span-3">Link ảnh đại diện<input value={draft.coverImageUrl} onChange={(e) => setPost("coverImageUrl", e.target.value)} placeholder="https://... hoặc /pp-academy-campus.webp" /></label>
          <label className="check-line"><input type="checkbox" checked={draft.isPublished} onChange={(e) => setPost("isPublished", e.target.checked)} /> Xuất bản ngay</label>
          <label className="check-line"><input type="checkbox" checked={draft.isFeatured} onChange={(e) => setPost("isFeatured", e.target.checked)} /> Bài viết nổi bật</label>
        </div>
        <div className="form-actions"><button className="primary-button" disabled={busy}><Icon name={editingId ? "check" : "plus"} size={15} />{busy ? "Đang lưu..." : editingId ? "Cập nhật bài viết" : "Tạo bài viết"}</button></div>
      </form>
      <div className="admin-post-grid">{posts.length === 0 ? <div className="feature-table-wrap public-loading">Chưa có bài viết.</div> : posts.map((post) => <article className="admin-post-card" key={post.id}>
        <img src={post.coverImageUrl || "/pp-academy-campus.webp"} alt="" /><div><div className="admin-post-status"><span className={post.isPublished ? "published" : "draft"}>{post.isPublished ? "Đã xuất bản" : "Bản nháp"}</span>{post.isFeatured && <span className="featured">Nổi bật</span>}</div><h3>{post.title}</h3><p>{post.excerpt}</p><small>{post.authorName}</small><div className="row-actions"><button onClick={() => editPost(post)}>Sửa</button><button className="danger" onClick={() => removePost(post)}>Xóa</button></div></div>
      </article>)}</div>
    </>}
  </section>;
}
