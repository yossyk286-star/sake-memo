"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "@/lib/i18n";

/**
 * 写真を押したときの全画面。左右にすべらせて次の写真、2本指で広げて拡大、2回たたくと2倍。✕ か下へ払うと閉じる
 */
export default function Lightbox({ urls, start, onClose }: { urls: string[]; start: number; onClose: () => void }) {
  const [at, setAt] = useState(start);
  const track = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    // 後ろの画面がスクロールしないように
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [start]);

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={tr("写真")}>
      <div
        ref={track}
        className="lightbox-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {urls.map((u, i) => (
          <ZoomImage key={u} src={u} alt={tr("記録の写真 {0}", i + 1)} onClose={onClose} />
        ))}
      </div>
      <button type="button" className="lightbox-close" aria-label={tr("閉じる")} onClick={onClose}>
        ✕
      </button>
      {urls.length > 1 && (
        <span className="lightbox-count" aria-live="polite">
          {at + 1} / {urls.length}
        </span>
      )}
    </div>,
    document.body,
  );
}

type Pt = { x: number; y: number };

/** 1枚の写真。2本指で拡大・拡大中は1本指で動かす。拡大していないときに下へ払うと閉じる */
function ZoomImage({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState(0);
  const pts = useRef(new Map<number, Pt>());
  const base = useRef({ dist: 0, s: 1, x: 0, y: 0, start: { x: 0, y: 0 } });
  const lastTap = useRef(0);

  const dist = () => {
    const [a, b] = [...pts.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  function down(e: React.PointerEvent) {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) base.current = { ...base.current, dist: dist(), s: view.s, x: view.x, y: view.y };
    else base.current = { ...base.current, s: view.s, x: view.x, y: view.y, start: { x: e.clientX, y: e.clientY } };
    if (pts.current.size === 2 || view.s > 1) e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const b = base.current;
    if (pts.current.size === 2) {
      setView((v) => ({ ...v, s: Math.max(1, Math.min(4, (b.s * dist()) / Math.max(1, b.dist))) }));
    } else if (view.s > 1) {
      setView((v) => ({ ...v, x: b.x + e.clientX - b.start.x, y: b.y + e.clientY - b.start.y }));
    } else {
      const dy = e.clientY - b.start.y;
      const dx = Math.abs(e.clientX - b.start.x);
      if (dy > 0 && dy > dx) setDrag(dy);
    }
  }

  function up(e: React.PointerEvent) {
    pts.current.delete(e.pointerId);
    if (drag > 120) return onClose();
    setDrag(0);
    if (view.s <= 1.05) setView({ s: 1, x: 0, y: 0 });
    if (e.type === "pointerup" && pts.current.size === 0) {
      const now = Date.now();
      if (now - lastTap.current < 300) setView((v) => (v.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2, x: 0, y: 0 }));
      lastTap.current = now;
    }
  }

  return (
    <div className="lightbox-slide" style={{ opacity: drag ? Math.max(0.3, 1 - drag / 400) : undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          transform: `translate(${view.x}px, ${view.y + drag}px) scale(${view.s})`,
          touchAction: view.s > 1 ? "none" : "pan-x",
          transition: pts.current.size ? "none" : "transform 0.2s ease",
        }}
      />
    </div>
  );
}
