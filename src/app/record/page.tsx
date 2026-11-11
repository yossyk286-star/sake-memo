"use client";

import EmptyState from "@/components/EmptyState";

import BackChevron from "@/components/BackChevron";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { reducedMotion, useFeatures } from "@/lib/features";
import { photoColor } from "@/lib/photoColor";
import AskAI from "@/components/AskAI";
import { PhotoAddButton, PhotoRow } from "@/components/PhotoAdd";
import RadarChart from "@/components/RadarChart";
import { drinkTitle, kindColor, Stars, stars, yen } from "@/components/RecordCard";
import { TASTE_AXES } from "@/lib/axes";
import { putRecord } from "@/lib/db";
import { abvText } from "@/lib/abv";
import { hasServeNote, serveNoteText } from "@/lib/serveNote";
import { photosOf, shrinkPhotos } from "@/lib/photo";
import { mapsUrl } from "@/lib/shops";
import { recordImage, shareImage } from "@/lib/shareImage";
import { useRecordFromQuery } from "@/lib/useRecord";
import type { QA } from "@/lib/types";
import { tr, trJoin, trv } from "@/lib/i18n";
import NumText from "@/components/NumText";
import { useRouter } from "next/navigation";
import { backTarget, popTo } from "@/lib/nav";
import { isPlainClick, nameForTransition, transitionTo } from "@/lib/viewTransition";

/** AI に聞くときにタップで入る質問 */
const SUGGESTIONS = ["おいしい飲み方は？", "合う料理は？", "似た味のお酒は？", "どんな造りのお酒？"];

type Row = [string, string];

/** 数字を丸い書体で出す欄（名前などに入った数字はそのまま） */
const NUMERIC = new Set(["度数", "値段"]);

/** 見出しと、入っている欄だけの表。1つも入っていなければ何も出さない */
function DetailSection({ title, rows }: { title: string; rows: Row[] }) {
  const filled = rows.filter(([, v]) => v.trim());
  if (filled.length === 0) return null;
  return (
    <>
      <h2 className="section-title">{trv(title)}</h2>
      <dl className="card detail-list">
        {filled.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{trv(k)}</dt>
            <dd>{NUMERIC.has(k) ? <NumText text={trv(v)} /> : trv(v)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function DetailBody() {
  const loaded = useRecordFromQuery();
  const router = useRouter();
  // いちばん上にいるときだけ、上のバーにもお酒の色を差す（スクロールしたらふつうの色に戻す）
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // AI に聞いた答えや写真を足したらその場で表示を変える
  const [r, setR] = useState(loaded);
  useEffect(() => setR(loaded), [loaded]);
  const photos = useMemo(() => (r ? photosOf(r) : []), [r]);
  const features = useFeatures();
  // ラベル写真の色を、にじみ・五角形・点数の色にする（20）
  const [tint, setTint] = useState<string | null>(null);
  useEffect(() => {
    if (!features.photoTint || !photos[0]) return setTint(null);
    let alive = true;
    photoColor(photos[0]).then((c) => alive && setTint(c));
    return () => {
      alive = false;
    };
  }, [photos, features.photoTint]);
  // 写真は少しゆっくりスクロールして奥行きを出す（21）。上に引っぱると少し大きくなる
  const photoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 枠（photo-wrap）は動かさず、中の写真の列だけずらす。はみ出た分は枠で切る
    const el = photoRef.current?.querySelector<HTMLElement>(".photo-row");
    if (!el || !features.parallax || reducedMotion()) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > 400) return;
        el.style.transform = y < 0 ? `scale(${1 + -y / 300})` : `translateY(${y * 0.4}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [features.parallax, photos.length]);
  const [photoError, setPhotoError] = useState("");

  /** 編集画面を開かずに、写真だけその場で足す */
  async function addPhotos(files: FileList | null) {
    if (!r) return;
    try {
      const added = await shrinkPhotos(files);
      if (added.length === 0) return;
      const next = { ...r, photos: [...photosOf(r), ...added], photo: null, updatedAt: Date.now() };
      await putRecord(next);
      setR(next);
      setPhotoError("");
    } catch {
      setPhotoError("写真を読み込めませんでした");
    }
  }

  async function share() {
    if (!r) return;
    const blob = await recordImage({
      title: drinkTitle(r),
      overall: r.overall,
      tags: [r.kind, r.style, r.serve, r.origin].filter((t): t is string => !!t),
      axes: TASTE_AXES.map(([label]) => label),
      values: TASTE_AXES.map(([, get]) => get(r)),
      flavors: r.flavors,
      memo: r.memo,
      footer: trJoin([r.shop, r.date.replaceAll("-", "/")]),
      photo: photos[0] ?? null,
    });
    await shareImage(blob, drinkTitle(r)).catch(() => toast("共有できませんでした", { tone: "warn" }));
  }

  async function toggleAgain() {
    if (!r) return;
    const next = { ...r, again: !r.again };
    await putRecord(next);
    setR(next);
    if (next.again) toast("また飲みたいに入れました", { tone: "star" });
  }

  async function addQA(qa: QA) {
    if (!r) return;
    const next = { ...r, qa: [...(r.qa ?? []), qa] };
    await putRecord(next);
    setR(next);
  }

  /** 一覧へ戻るとき、詳細が縮んで元の行へ帰る。行が見つからなければふつうに重ねて切り替える */
  function back(e: React.MouseEvent) {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    const id = r?.id;
    // 来た画面（スタンプ帳・お店など）へ戻る。一覧へ戻るときだけ行へ縮んで帰る
    const to = backTarget("/");
    popTo(to);
    const path = to.split("?")[0];
    transitionTo(
      () => router.push(to),
      () => {
        if (location.pathname !== path) return false;
        if (path !== "/") return true;
        const row = id ? document.querySelector(`[data-rid="${CSS.escape(id)}"]`) : null;
        if (!row) return !!document.querySelector(".record-row, .empty-state, .empty");
        nameForTransition(row, "rec-card");
        nameForTransition(row.querySelector("h2"), "rec-name");
        return true;
      },
      "back",
    );
  }

  // 空の欄は出さない。まとまりごとに分けて表で見せる
  const drinkRows: Row[] = r
    ? [
        ["種類", trJoin([r.kind, r.style])],
        ["銘柄", r.name],
        ["蔵元・醸造所", r.maker],
        ["産地", tr(r.origin)],
        ["度数", r.abv ? abvText(r.abv) : ""],
        ["お店の説明", r.menuNote],
      ]
    : [];
  const servedRows: Row[] = r
    ? [
        ["飲み方", tr(r.serve ?? "")],
        ["飲み方メモ", hasServeNote(r.serveNote) ? serveNoteText(r.serveNote) : ""],
        ["合わせた料理", r.pairing],
        ["値段", r.price ? yen(r.price) : ""],
      ]
    : [];
  const shopMap = r ? mapsUrl(r.shop) : null;
  const scores = r ? TASTE_AXES.map(([label, get]) => [label, get(r) ?? null] as const) : [];
  const filledScores = scores.filter(([, v]) => v);
  /** AI に聞くときに渡す中身（入っている欄だけ） */
  const rows: Row[] = r
    ? ([
        ["日付", r.date],
        ["飲んだ場所", r.shop],
        ...drinkRows,
        ...servedRows,
        ["感じた味", trJoin(r.flavors)],
        ...filledScores.map(([k, v]) => [k, `${v} / 5`] as Row),
        ["メモ", r.memo],
      ] as Row[]).filter(([, v]) => v.trim())
    : [];

  return (
    <>
      <header className="sub-header" data-top={atTop ? "" : undefined} style={r ? ({ "--kind": tint ?? kindColor(r.kind) } as React.CSSProperties) : undefined}>
        <Link href="/" className="back" onClick={back}>
          <BackChevron />
        </Link>
        <h1>{tr("記録")}</h1>
        {r && (
          <Link href={`/edit?id=${r.id}`} className="back" style={{ gridColumn: 3, justifySelf: "end" }}>
            {tr("編集")}
          </Link>
        )}
      </header>
      {r === null && (
        <main className="content" style={{ paddingTop: 16 }}>
          <EmptyState title={tr("記録が見つかりませんでした")} mood="sad" actions={[{ href: "/", label: tr("記録の一覧へ") }]}>
            {tr("消した記録か、別の端末で作った記録かもしれません。")}
          </EmptyState>
        </main>
      )}
      {r && (
        <main className="content detail-page" data-tint={tint ? "" : undefined} style={{ paddingTop: 16, "--kind": tint ?? kindColor(r.kind) } as React.CSSProperties}>
          {/* 上からそのお酒の種類の色がうっすら差して、下で地に溶ける */}
          <div className="detail-tint" aria-hidden="true" />
          {/* 写真があるときは上に出して右下に小さく足すボタンを重ねる。ないときは下のボタンの列から足す */}
          {photos.length > 0 && (
            <div className="photo-wrap" ref={photoRef}>
              <PhotoRow photos={photos} />
              <PhotoAddButton chip label={tr("＋ 写真")} onFiles={addPhotos} />
            </div>
          )}
          {photoError && (
            <p className="error" role="alert">
              {trv(photoError)}
            </p>
          )}
          <div className="card detail-hero">
            <div className="detail-hero-top">
              <div className="detail-hero-name">
                {r.kind && (
                  <span className="tag kind-tag">
                    {trJoin([r.kind, r.style])}
                  </span>
                )}
                <h2 className={drinkTitle(r).length > 18 ? "is-long" : undefined}>{drinkTitle(r)}</h2>
                {r.name && r.maker && <p className="muted">{trv(r.maker)}</p>}
              </div>
              <div className="detail-score" aria-label={features.scale === "star5" ? tr("総合 5段階中{0}", r.overall) : tr("総合 {0}", stars(r.overall))}>
                <span className="detail-score-label">{tr("総合")}</span>
                {/* 開いたときに数字がくるっと回って出る（22） */}
                <span className="detail-score-num roll" data-roll={features.numRoll ? "" : undefined}>
                  {features.scale === "star5" ? trv(r.overall) : features.scale === "ten" ? Math.round(r.overall * 2) : Math.round(r.overall * 20)}
                </span>
                {features.scale === "star5" ? <Stars n={r.overall} label="" /> : <span className="muted detail-score-of">{features.scale === "ten" ? "/10" : "/100"}</span>}
              </div>
            </div>
            <div className="detail-when">
              <span>{trJoin([r.date.replaceAll("-", "/"), r.shop])}</span>
              {shopMap && (
                <a href={shopMap} target="_blank" rel="noopener noreferrer" className="map-link">
                  {tr("地図")}
                </a>
              )}
            </div>
            {/* ♥ また飲みたい（42） */}
            {features.favorites && (
              <button type="button" className="again-btn" aria-pressed={!!r.again} onClick={toggleAgain}>
                <span aria-hidden="true">{r.again ? "♥" : "♡"}</span>
                {tr("また飲みたい")}
              </button>
            )}
          </div>

          {(filledScores.length > 0 || r.flavors.length > 0) && (
            <>
              <h2 className="section-title">{tr("味")}</h2>
              <div className="card detail-taste">
                {filledScores.length >= 3 && (
                  <div className="detail-radar">
                    <RadarChart axes={scores.map(([a]) => a)} series={[{ label: tr("この記録"), values: scores.map(([, v]) => v) }]} showValues color="var(--kind)" />
                  </div>
                )}
                {/* 五角形が出るときは角に数字があるので、目盛りは五角形が出ないとき（2つ以下）だけ */}
                {filledScores.length > 0 && filledScores.length < 3 && (
                  <div className="meters">
                    {filledScores.map(([label, v]) => (
                      <div key={label} className="meter" aria-label={tr("{0} 5段階中{1}", label, v)}>
                        <span className="meter-label">{trv(label)}</span>
                        <span className="meter-dots" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <i key={n} className={n <= (v ?? 0) ? "on" : ""} />
                          ))}
                        </span>
                        <span className="meter-num" aria-hidden="true">
                          {trv(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {r.flavors.length > 0 && (
                  <div className="tags" aria-label={tr("感じた味")}>
                    {r.flavors.map((f) => (
                      <span key={f} className="tag tag-plain">
                        {trv(f)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <DetailSection title={tr("飲んだとき")} rows={servedRows} />
          <DetailSection title={tr("お酒のこと")} rows={drinkRows} />

          {r.memo.trim() && (
            <>
              <h2 className="section-title">{tr("メモ")}</h2>
              <div className="card detail-memo">{trv(r.memo)}</div>
            </>
          )}

          <AskAI
            context={[tr("お酒：{0}", drinkTitle(r)), tr("総合：{0} / 5", r.overall), ...rows.map(([k, v]) => `${k}：${v}`)].join("\n")}
            suggestions={SUGGESTIONS.map((s) => tr(s))}
            history={r.qa ?? []}
            onAnswered={addQA}
          />
          <button type="button" className="btn-secondary btn-main" onClick={share}>
            {tr("画像にして送る")}
          </button>
          <Link href={`/compare?a=${r.id}`} className="btn-secondary btn-plain">
            {tr("ほかの記録とくらべる")}
          </Link>
          {photos.length === 0 && (
            <div className="row">
              <PhotoAddButton label={tr("＋ 写真を追加")} onFiles={addPhotos} />
            </div>
          )}
        </main>
      )}
    </>
  );
}

export default function RecordDetailPage() {
  return (
    <Suspense>
      <DetailBody />
    </Suspense>
  );
}
