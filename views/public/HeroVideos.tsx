"use client";

import { useEffect, useRef, useState } from "react";

// Add or reorder clips here. Files live in public/videos.
const clips = [
  { src: "/videos/sinhvien.mp4", label: "Đời sống sinh viên" },
  { src: "/videos/khuonvien.mp4", label: "Khuôn viên" },
  { src: "/videos/phonghoc.mp4", label: "Phòng học" },
  { src: "/videos/thuvien.mp4", label: "Thư viện" },
  { src: "/videos/phongmay.mp4", label: "Phòng máy" },
];

export function HeroVideos({ poster }: { poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<number[]>([]);
  const unavailable = failed.includes(index);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || unavailable) return;
    const sync = () => {
      if (document.hidden) video.pause();
      else void video.play().catch(() => { /* Keep the poster if autoplay is blocked. */ });
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { video.pause(); document.removeEventListener("visibilitychange", sync); };
  }, [index, unavailable]);

  const select = (next: number) => {
    if (next === index) return;
    setReady(false);
    setIndex(next);
  };
  const advance = (direction: number) => {
    for (let step = 1; step <= clips.length; step++) {
      const next = (index + direction * step + clips.length) % clips.length;
      if (!failed.includes(next)) { select(next); return; }
    }
  };
  const handleError = () => {
    const errors = [...new Set([...failed, index])];
    setFailed(errors);
    setReady(false);
    const next = clips.findIndex((_, i) => !errors.includes(i));
    if (next >= 0) select(next);
  };

  return <>
    <img className="hero-backdrop" src={poster} alt="" fetchPriority="high" />
    {!unavailable && <video
      key={clips[index].src}
      ref={videoRef}
      className={`hero-backdrop hero-video${ready ? " is-ready" : ""}`}
      src={clips[index].src}
      poster={poster}
      autoPlay muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1}
      onPlaying={() => setReady(true)}
      onEnded={() => { if (failed.length === clips.length - 1) { const video = videoRef.current; if (video) { video.currentTime = 0; void video.play().catch(() => {}); } } else advance(1); }}
      onError={handleError}
    />}
    <div className="hero-video-controls public-container" role="group" aria-label="Video giới thiệu trường">
      <button type="button" onClick={() => advance(-1)} disabled={failed.length >= clips.length - 1} aria-label="Video trước">←</button>
      <div className="hero-video-tabs">{clips.map((clip, i) => <button type="button" key={clip.src} disabled={failed.includes(i)} aria-pressed={i === index} onClick={() => select(i)}>{clip.label}</button>)}</div>
      <button type="button" onClick={() => advance(1)} disabled={failed.length >= clips.length - 1} aria-label="Video tiếp theo">→</button>
      {unavailable && <span role="status">Video chưa phát được. Đang hiển thị ảnh.</span>}
    </div>
  </>;
}
