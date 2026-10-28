"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AskAI from "@/components/AskAI";
import RadarChart from "@/components/RadarChart";
import { drinkTitle, kindColor, stars, yen } from "@/components/RecordCard";
import { TASTE_AXES } from "@/lib/axes";
import { deleteRecord, putRecord } from "@/lib/db";
import { abvText } from "@/lib/abv";
import { hasServeNote, serveNoteText } from "@/lib/serveNote";
import { recordImage, shareImage } from "@/lib/shareImage";
import { useRecordFromQuery } from "@/lib/useRecord";
import type { QA } from "@/lib/types";

/** AI に聞くときにタップで入る質問 */
const SUGGESTIONS = ["おいしい飲み方は？", "合う料理は？", "似た味のお酒は？", "どんな造りのお酒？"];

type Row = [string, string];

/** 見出しと、入っている欄だけの表。1つも入っていなければ何も出さない */
function DetailSection({ title, rows }: { title: string; rows: Row[] }) {
  const filled = rows.filter(([, v]) => v.trim());
  if (filled.length === 0) return null;
  return (
    <>
      <h2 className="section-title">{title}</h2>
      <dl className="card detail-list">
        {filled.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function DetailBody() {
  const router = useRouter();
  const loaded = useRecordFromQuery();
  // AI に聞いた答えを足したらその場で表示を変える
  const [r, setR] = useState(loaded);
  useEffect(() => setR(loaded), [loaded]);
  const photo = r?.photo;
  const photoURL = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (photoURL && URL.revokeObjectURL(photoURL)), [photoURL]);

  async function remove() {
    if (!r || !confirm("この記録を削除しますか？")) return;
    await deleteRecord(r.id);
    router.replace("/");
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
      footer: [r.shop, r.date.replaceAll("-", "/")].filter(Boolean).join("・"),
      photo: r.photo,
    });
    await shareImage(blob, drinkTitle(r)).catch(() => alert("共有できませんでした"));
  }

  async function addQA(qa: QA) {
    if (!r) return;
    const next = { ...r, qa: [...(r.qa ?? []), qa] };
    await putRecord(next);
    setR(next);
  }

  // 空の欄は出さない。まとまりごとに分けて表で見せる
  const drinkRows: Row[] = r
    ? [
        ["種類", [r.kind, r.style].filter(Boolean).join("・")],
        ["銘柄", r.name],
        ["蔵元・醸造所", r.maker],
        ["産地", r.origin],
        ["度数", r.abv ? abvText(r.abv) : ""],
        ["お店の説明", r.menuNote],
      ]
    : [];
  const servedRows: Row[] = r
    ? [
        ["飲み方", r.serve ?? ""],
        ["飲み方メモ", hasServeNote(r.serveNote) ? serveNoteText(r.serveNote) : ""],
        ["合わせた料理", r.pairing],
        ["値段", r.price ? yen(r.price) : ""],
      ]
    : [];
  const scores = r ? TASTE_AXES.map(([label, get]) => [label, get(r) ?? null] as const) : [];
  const filledScores = scores.filter(([, v]) => v);
  /** AI に聞くときに渡す中身（入っている欄だけ） */
  const rows: Row[] = r
    ? ([
        ["日付", r.date],
        ["飲んだ場所", r.shop],
        ...drinkRows,
        ...servedRows,
        ["感じた味", r.flavors.join("・")],
        ...filledScores.map(([k, v]) => [k, `${v} / 5`] as Row),
        ["メモ", r.memo],
      ] as Row[]).filter(([, v]) => v.trim())
    : [];

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 一覧
        </Link>
        <h1>記録</h1>
      </header>
      {r === null && <p className="empty">記録が見つかりませんでした。</p>}
      {r && (
        <main className="content" style={{ paddingTop: 16 }}>
          {photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt="記録の写真" className="photo-preview" />
          )}
          <div className="card detail-hero">
            <div className="detail-hero-top">
              <div className="detail-hero-name">
                {r.kind && (
                  <span className="tag kind-tag" style={{ "--kind": kindColor(r.kind) } as React.CSSProperties}>
                    {[r.kind, r.style].filter(Boolean).join("・")}
                  </span>
                )}
                <h2>{drinkTitle(r)}</h2>
                {r.name && r.maker && <p className="muted">{r.maker}</p>}
              </div>
              <div className="detail-score" aria-label={`総合 5段階中${r.overall}`}>
                <span className="detail-score-label">総合</span>
                <span className="detail-score-num">{r.overall}</span>
                <span className="stars" aria-hidden="true">
                  {stars(r.overall)}
                </span>
              </div>
            </div>
            <p className="detail-when">{[r.date.replaceAll("-", "/"), r.shop].filter(Boolean).join("・")}</p>
          </div>

          {(filledScores.length > 0 || r.flavors.length > 0) && (
            <>
              <h2 className="section-title">味</h2>
              <div className="card detail-taste">
                {filledScores.length >= 3 && (
                  <div className="detail-radar">
                    <RadarChart axes={scores.map(([a]) => a)} series={[{ label: "この記録", values: scores.map(([, v]) => v) }]} />
                  </div>
                )}
                {filledScores.length > 0 && (
                  <div className="meters">
                    {filledScores.map(([label, v]) => (
                      <div key={label} className="meter" aria-label={`${label} 5段階中${v}`}>
                        <span className="meter-label">{label}</span>
                        <span className="meter-dots" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <i key={n} className={n <= (v ?? 0) ? "on" : ""} />
                          ))}
                        </span>
                        <span className="meter-num" aria-hidden="true">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {r.flavors.length > 0 && (
                  <div className="tags" aria-label="感じた味">
                    {r.flavors.map((f) => (
                      <span key={f} className="tag tag-plain">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <DetailSection title="飲んだとき" rows={servedRows} />
          <DetailSection title="お酒のこと" rows={drinkRows} />

          {r.memo.trim() && (
            <>
              <h2 className="section-title">メモ</h2>
              <div className="card detail-memo">{r.memo}</div>
            </>
          )}

          <AskAI
            context={[`お酒：${drinkTitle(r)}`, `総合：${r.overall} / 5`, ...rows.map(([k, v]) => `${k}：${v}`)].join("\n")}
            suggestions={SUGGESTIONS}
            history={r.qa ?? []}
            onAnswered={addQA}
          />
          <button type="button" className="btn-secondary" onClick={share}>
            画像にして送る
          </button>
          <Link href={`/compare?a=${r.id}`} className="btn-secondary">
            ほかの記録とくらべる
          </Link>
          <div className="row">
            <Link href={`/edit?id=${r.id}`} className="btn-secondary" style={{ flex: 1 }}>
              編集する
            </Link>
            <button type="button" className="btn-secondary btn-danger" onClick={remove}>
              削除
            </button>
          </div>
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
