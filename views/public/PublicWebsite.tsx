"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import {
  defaultSiteSettings,
  normalizeSiteSettings,
  type SchoolPost,
  type SiteSettings,
} from "@/models/publicWebsite";
import { samplePosts, shufflePosts } from "@/models/publicContent";
import { Icon } from "@/components/ui/Icon";

export function PublicWebsite({ onLogin }: { onLogin: () => void }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [posts, setPosts] = useState<SchoolPost[]>([]);
  const [articleLoading, setArticleLoading] = useState(false);
  const [postSlug, setPostSlug] = useState("");
  const [samples, setSamples] = useState<SchoolPost[]>(samplePosts);
  const selectedPost = [...posts, ...samples].find((post) => post.slug === postSlug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    apiRequest("", "/public/home")
      .then((payload) => {
        setSettings(normalizeSiteSettings(payload.data?.settings || {}));
        setPosts(Array.isArray(payload.data?.posts) ? payload.data.posts : []);
        setError("");
      })
      .catch((reason) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Không tải được nội dung trang chủ.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSamples(shufflePosts(samplePosts));
    const navigate = () => {
      const hash = window.location.hash.slice(1);
      setPostSlug(hash.startsWith("bai-viet/") ? hash.slice(9) : "");
      setMenuOpen(false);
      window.setTimeout(() => {
        if (hash.startsWith("bai-viet/")) window.scrollTo({ top: 0 });
        else document.getElementById(hash || "trang-chu")?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    };
    navigate();
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  useEffect(() => {
    if (!postSlug || selectedPost || loading) return;
    let cancelled = false;
    setArticleLoading(true);
    apiRequest("", `/public/posts/${encodeURIComponent(postSlug)}`).then((payload) => {
      if (!cancelled && payload.data?.slug) setPosts((current) => [...current, payload.data]);
    }).catch(() => { /* The missing article view offers navigation back to news. */ }).finally(() => { if (!cancelled) setArticleLoading(false); });
    return () => { cancelled = true; };
  }, [postSlug, selectedPost, loading]);

  if (selectedPost) {
    return (
      <main className="public-site">
        <PublicHeader
          settings={settings}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onLogin={onLogin}
          
        />
        <article className="public-article-page">
          <a className="article-back" href="#tin-tuc">
            ← Tất cả bài viết
          </a>
          <div className="article-heading">
            <span>{selectedPost.id < 0 ? "Góc sinh viên · Bài viết mẫu" : "Tin tức nhà trường"}</span>
            <h1>{selectedPost.title}</h1>
            <p>
              {selectedPost.authorName}{selectedPost.id > 0 ? ` · ${formatDate(selectedPost.publishedAt)}` : " · Nội dung tham khảo"}
            </p>
          </div>
          {selectedPost.coverImageUrl && (
            <img
              className="article-cover"
              src={selectedPost.coverImageUrl}
              alt={selectedPost.title}
            />
          )}
          <div className="article-body">
            {selectedPost.content
              .split(/\n+/)
              .filter(Boolean)
              .map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        </article>
        <PublicFooter settings={settings} />
      </main>
    );
  }

  if (postSlug) return <main className="public-site"><PublicHeader settings={settings} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onLogin={onLogin} /><section className="public-container public-section"><h1>{loading || articleLoading ? "Đang tải bài viết…" : "Bài viết chưa có sẵn"}</h1><p>Bài viết có thể đã được gỡ hoặc đường dẫn không còn đúng.</p><a className="text-link" href="#tin-tuc">Quay lại tin tức →</a></section><PublicFooter settings={settings} /></main>;

  const featured = posts.find((post) => post.isFeatured) || posts[0];
  const remainingPosts = posts.filter((post) => post.id !== featured?.id);

  return (
    <main className="public-site">
      <PublicHeader
        settings={settings}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onLogin={onLogin}
      />

      <section
        className="public-hero full-width-hero"
        id="trang-chu">
        <img className="hero-backdrop" src={settings.heroImageUrl || "/pp-academy-campus.webp"} alt="" fetchPriority="high" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="public-container public-hero-content">
          <p className="public-eyebrow">{settings.schoolName} / Thông tin & đào tạo</p>
          <h1>Học tập hôm nay.<br /><span>Sẵn sàng ngày mai.</span></h1>
          <p className="hero-description">Thông tin nhà trường, chương trình học và các thông báo dành cho sinh viên, giảng viên.</p>
          <div className="hero-actions">
            <button className="public-primary" onClick={onLogin}>
              Đăng nhập hệ thống <Icon name="arrow" size={17} />
            </button>
            <a href="#dao-tao" className="public-secondary hero-download">Tìm hiểu ngành học <span aria-hidden="true">→</span></a>
          </div>
          <div className="home-shortcuts"><a href="#tin-tuc">Thông báo mới</a><a href="#dao-tao">Chương trình học</a><a href="#lien-he">Liên hệ nhà trường</a></div>
        </div>
      </section>

      <section className="public-section about-section" id="gioi-thieu">
        <div className="public-container about-grid">
          <div className="section-copy">
            <p className="public-section-label">Về PP Academy</p>
            <h2>Giới thiệu nhà trường</h2>
            <p>{settings.introduction}</p>
            <p>
              Sinh viên và giảng viên sử dụng tài khoản được cấp để xem lịch học,
              theo dõi thông báo và thực hiện các công việc học tập trên hệ thống.
            </p>
            <a href="#dao-tao" className="text-link">Xem các ngành đào tạo →</a>
          </div>
          <div className="about-visual">
            <img src="/pp-academy-library.webp" alt="Không gian học tập PP Academy" />

          </div>
        </div>
      </section>

      <section className="public-section programs-section" id="dao-tao">
        <div className="public-container">
          <div className="public-section-heading">
            <div><p className="public-section-label">Khối ngành đào tạo</p><h2>Các ngành đào tạo</h2></div>
            <p>Thông tin các nhóm ngành. Liên hệ nhà trường để được hướng dẫn về môn học và kế hoạch đào tạo.</p>
          </div>
          <div className="program-grid">
            {[
              ["01", "Công nghệ & Kỹ thuật", "Phát triển phần mềm, dữ liệu, thiết kế số và các giải pháp công nghệ ứng dụng."],
              ["02", "Kinh doanh & Quản trị", "Tư duy quản trị, marketing, tài chính và năng lực vận hành trong môi trường hiện đại."],
              ["03", "Thiết kế & Sáng tạo", "Phát triển khả năng thẩm mỹ, tư duy thiết kế và kỹ năng xây dựng sản phẩm sáng tạo."],
            ].map(([number, title, description]) => (
              <article className="program-card" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{description}</p><a className="program-contact" href="#lien-he">Liên hệ tư vấn →</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section news-section" id="tin-tuc">
        <div className="public-container">
          <div className="public-section-heading">
            <div><p className="public-section-label">Tin tức & Sự kiện</p><h2>Thông báo và tin tức</h2></div>
            <p>Theo dõi lịch hoạt động và các thông báo mới từ nhà trường.</p>
          </div>
          {loading ? (
            <div className="public-loading">Đang tải bài viết...</div>
          ) : posts.length === 0 ? (
            <div className="public-loading">Chưa có bài viết được xuất bản.</div>
          ) : (
            <div className="news-layout">
              {featured && (
                <a className="featured-post" href={`#bai-viet/${featured.slug}`}>
                  <img src={featured.coverImageUrl || "/pp-academy-campus.webp"} alt="" />
                  <span className="featured-post-copy">
                    <small>Nổi bật · {formatDate(featured.publishedAt)}</small>
                    <strong>{featured.title}</strong>
                    <p>{featured.excerpt}</p><b>Đọc bài viết →</b>
                  </span>
                </a>
              )}
              <div className="news-list">
                {remainingPosts.slice(0, 3).map((post) => (
                  <a className="news-card" key={post.id} href={`#bai-viet/${post.slug}`}>
                    <img src={post.coverImageUrl || "/pp-academy-library.webp"} alt="" />
                    <span><small>{formatDate(post.publishedAt)}</small><strong>{post.title}</strong><p>{post.excerpt}</p></span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {error && <p className="public-api-note">Chưa kết nối được thông báo nhà trường. Bạn vẫn có thể đọc các bài tham khảo bên dưới.</p>}
        </div>
      </section>

      <section className="public-section student-stories" id="goc-sinh-vien">
        <div className="public-container">
          <div className="public-section-heading"><div><p className="public-section-label">Đọc thêm mỗi ngày</p><h2>Góc sinh viên</h2></div><div><p>Bài viết mẫu về học tập và kỹ năng sinh viên.</p><button className="stories-refresh" onClick={() => setSamples(shufflePosts(samplePosts))}>Đổi bài gợi ý ↻</button></div></div>
          <div className="story-grid">{samples.slice(0, 3).map((post) => <a className="story-card" key={post.slug} href={`#bai-viet/${post.slug}`}><img src={post.coverImageUrl} alt="" loading="lazy" /><div><small>Bài viết mẫu · Góc học tập</small><h3>{post.title}</h3><p>{post.excerpt}</p><span>Đọc tiếp <b aria-hidden="true">↗</b></span></div></a>)}</div>
        </div>
      </section>

      <section className="public-cta" id="tai-ung-dung">
        <div className="public-container cta-inner">
          <div><p className="public-section-label">PP Academy Mobile</p><h2>Ứng dụng dành cho sinh viên</h2><p>Theo dõi lịch học, thông báo, điểm số và hoạt động học tập ngay trên điện thoại.</p></div>
          <div><DownloadButton settings={settings} />{(!settings.downloadEnabled || !settings.downloadUrl) && <p className="download-note">Liên hệ nhà trường để được hướng dẫn cài đặt.</p>}</div>
        </div>
      </section>

      <PublicFooter settings={settings} />
    </main>
  );
}

function PublicHeader({ settings, menuOpen, setMenuOpen, onLogin }: {
  settings: SiteSettings;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  onLogin: () => void;
}) {
  return <header className="public-header"><div className="public-container public-nav">
    <a className="public-brand" href="#trang-chu"><img src={settings.logoUrl || "/pp-academy-logo.svg"} alt="" /><span><strong>{settings.schoolName}</strong><small>Thông tin nhà trường</small></span></a>
    <button className="public-menu-button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} size={22} /></button>
    <nav aria-label="Điều hướng chính" className={menuOpen ? "open" : ""} onClick={() => setMenuOpen(false)}><a href="#trang-chu">Trang chủ</a><a href="#gioi-thieu">Giới thiệu</a><a href="#dao-tao">Đào tạo</a><a href="#tin-tuc">Tin tức</a></nav>
    <div className="public-nav-actions"><DownloadButton settings={settings} compact /><button className="nav-login" onClick={onLogin}>Đăng nhập</button></div>
  </div></header>;
}

function DownloadButton({ settings, compact = false, hero = false }: { settings: SiteSettings; compact?: boolean; hero?: boolean }) {
  const label = settings.downloadButtonLabel || "Tải ứng dụng";
  const className = compact ? "nav-download" : hero ? "public-secondary hero-download" : "cta-download";
  if (!settings.downloadEnabled || !settings.downloadUrl) {
    return <a className={className} href={compact || hero ? "#tai-ung-dung" : "#lien-he"}><Icon name="upload" size={16} />{compact || hero ? "Ứng dụng sinh viên" : "Hỗ trợ cài đặt"}</a>;
  }
  return <a className={className} href={settings.downloadUrl} target="_blank" rel="noreferrer"><Icon name="upload" size={16} />{label}</a>;
}

function PublicFooter({ settings }: { settings: SiteSettings }) {
  return <footer className="public-footer" id="lien-he"><div className="public-container footer-grid">
    <div className="footer-brand"><img src={settings.logoUrl || "/pp-academy-logo.svg"} alt="" /><div><strong>{settings.schoolName}</strong><p>{settings.slogan}</p></div></div>
    <div><strong>Liên hệ</strong><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`} target="_blank" rel="noreferrer">{settings.address} ↗</a><a href={`tel:${settings.phone.replace(/[^+0-9]/g, "")}`}>{settings.phone}</a><a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></div>
    <div><strong>Truy cập nhanh</strong><a href="#gioi-thieu">Giới thiệu</a><a href="#dao-tao">Chương trình đào tạo</a><a href="#tin-tuc">Tin tức & sự kiện</a></div>
  </div><div className="public-container footer-bottom">© {new Date().getFullYear()} {settings.schoolName}.</div></footer>;
}

function formatDate(value?: string | null) {
  if (!value) return "Mới cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Mới cập nhật" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

