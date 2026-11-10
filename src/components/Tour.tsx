"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { t, TOUR_EVENT, TOURS, type TourId } from "@/lib/guide";
import { tr } from "@/lib/i18n";

const SEEN = (id: TourId) => `sake-memo:tour-${id}`;

/** 案内を見たことがあるか */
export function tourSeen(id: TourId) {
  try {
    return !!localStorage.getItem(SEEN(id));
  } catch {
    return true;
  }
}

type Rect = { top: number; left: number; width: number; height: number };

/**
 * 画面の上の案内。光らせたいボタンに data-tour="…" を付けておき、startTour(id) で始める。
 * まわりを暗くして、そのボタンだけ丸く抜き、矢印と吹き出しで「ここを押すとこうなる」を出す
 */
export default function Tour() {
  const router = useRouter();
  const pathname = usePathname();
  const [id, setId] = useState<TourId | null>(null);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const start = (e: Event) => {
      const next = (e as CustomEvent<TourId>).detail;
      if (!TOURS[next]) return;
      setStep(0);
      setRect(null);
      setId(next);
    };
    window.addEventListener(TOUR_EVENT, start);
    return () => window.removeEventListener(TOUR_EVENT, start);
  }, []);

  const tour = id ? TOURS[id] : null;
  // 画面に出ていない（隠れている）ボタンの手順は飛ばす
  const steps = tour?.steps ?? [];
  const current = steps[step];

  // 案内する画面に移る
  useEffect(() => {
    if (tour && pathname !== tour.path) router.push(tour.path);
  }, [tour, pathname, router]);

  // 光らせるボタンの位置を測る。画面に出るまで少し待ち、見えるところまで動かす
  const measure = useCallback(() => {
    if (!current) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [current]);

  useLayoutEffect(() => {
    if (!tour || !current || pathname !== tour.path) return;
    let tries = 0;
    let timer = 0;
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 80 || r.bottom > innerHeight - 100) el.scrollIntoView({ block: "center" });
        timer = window.setTimeout(measure, 250);
        return;
      }
      // 2秒たっても出てこないボタンは飛ばす
      if (++tries > 20) return next();
      timer = window.setTimeout(find, 100);
    };
    find();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, step, pathname]);

  useEffect(() => {
    if (!current) return;
    addEventListener("resize", measure);
    addEventListener("scroll", measure, { passive: true });
    return () => {
      removeEventListener("resize", measure);
      removeEventListener("scroll", measure);
    };
  }, [current, measure]);

  useEffect(() => {
    if (rect) boxRef.current?.focus();
  }, [rect, step]);

  function finish() {
    if (id)
      try {
        localStorage.setItem(SEEN(id), "1");
      } catch {}
    setId(null);
    setRect(null);
  }

  function next() {
    if (step + 1 >= steps.length) return finish();
    setRect(null);
    setStep((s) => s + 1);
  }

  if (!tour || !current) return null;

  // 光らせる枠は少し大きめに。画面の端からははみ出さないようにする
  const pad = 6;
  const edge = 4;
  const hole = rect && (() => {
    const top = Math.max(edge, rect.top - pad);
    const left = Math.max(edge, rect.left - pad);
    const right = Math.min(innerWidth - edge, rect.left + rect.width + pad);
    const bottom = Math.min(innerHeight - edge, rect.top + rect.height + pad);
    return { top, left, width: right - left, height: bottom - top };
  })();
  // ボタンが画面の下半分なら吹き出しは上に、上半分なら下に出す
  const below = hole ? hole.top + hole.height / 2 < innerHeight / 2 : false;
  const centerX = hole ? hole.left + hole.width / 2 : 0;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={tr("画面の案内")}>
      {hole ? (
        <div key="hole" className="tour-hole" style={hole} aria-hidden="true" />
      ) : (
        <div key="dim" className="tour-dim" aria-hidden="true" />
      )}
      {hole && (
        <>
          <svg
            className={`tour-arrow ${below ? "down" : "up"}`}
            style={{
              left: centerX - 14,
              top: below ? hole.top + hole.height + 6 : undefined,
              bottom: below ? undefined : innerHeight - hole.top + 6,
            }}
            width="28"
            height="36"
            viewBox="0 0 28 36"
            aria-hidden="true"
          >
            {/* 矢印はボタンの方を向く */}
            <path d={below ? "M14 34V6M5 14l9-10 9 10" : "M14 2v28M5 22l9 10 9-10"} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div
            ref={boxRef}
            tabIndex={-1}
            className="tour-bubble"
            style={below ? { top: hole.top + hole.height + 48 } : { bottom: innerHeight - hole.top + 48 }}
          >
            <p>{t(current.text)}</p>
            <div className="tour-foot">
              <span className="muted">
                {step + 1} / {steps.length}
              </span>
              <button type="button" className="tour-skip" onClick={finish}>
                {tr("おわる")}
              </button>
              <button type="button" className="tour-next" onClick={next}>
                {step + 1 >= steps.length ? tr("はじめる") : tr("次へ")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
