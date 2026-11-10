"use client";

import { toast } from "@/lib/toast";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP, WORDS } from "@/lib/appeal";
import { tr } from "@/lib/i18n";
import { lastMonthRecap, markRecapSeen, recapSeen } from "@/lib/recap";
import { cardImage, shareImage } from "@/lib/shareImage";
import type { TastingRecord } from "@/lib/types";

/** 月が変わったら記録の一覧の上に出す「先月のふりかえり」。閉じるまで出しておく */
export default function MonthRecap({ records, titleOf }: { records: TastingRecord[]; titleOf: (r: TastingRecord) => string }) {
  const recap = useMemo(() => lastMonthRecap(records), [records]);
  const [show, setShow] = useState(false);
  // 一覧を押し下げないよう、はじめは1行の帯にしておき、押したら開く
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setShow(!!recap && !recapSeen(recap.month));
  }, [recap]);
  if (!recap || !show) return null;

  const title = tr("{0}月の{1}", recap.monthNumber, APP.name);
  const stats = [
    { label: tr("記録した"), value: tr("{0}{1}", recap.count, WORDS.cup) },
    { label: tr("新しい{0}", WORDS.place), value: tr("+{0}{1}", recap.newPlaces.length, WORDS.placeUnit) },
  ];
  const bestLine = tr("いちばん★が高かった：{0}（★{1}）", titleOf(recap.best), recap.best.overall);
  const lines = [
    bestLine,
    recap.shop ? tr("いちばん行ったお店：{0}（{1}回）", recap.shop.name, recap.shop.times) : "",
    recap.axis ? tr("「{0}」の強いものが多めでした", recap.axis) : "",
  ].filter(Boolean);

  function close() {
    markRecapSeen(recap!.month);
    setShow(false);
  }

  if (!open)
    return (
      <button type="button" className="recap-band" aria-expanded={false} onClick={() => setOpen(true)}>
        <span className="recap-eyebrow">{tr("先月のふりかえり")}</span>
        <strong>{tr("{0}月 {1}", recap.monthNumber, `${stats[0].value}・${stats[1].label} ${stats[1].value}`)}</strong>
      </button>
    );

  return (
    <section className="recap" aria-label={tr("先月のふりかえり")}>
      <span className="recap-eyebrow">{tr("先月のふりかえり")}</span>
      <h2>{title}</h2>
      <div className="recap-stats">
        {stats.map((s) => (
          <div key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <Link href={`/record?id=${recap.best.id}`} className="recap-best">
        <span>{tr("いちばん★が高かった")}</span>
        <strong>{titleOf(recap.best)}</strong>
        <span>★ {recap.best.overall.toFixed(1)}</span>
      </Link>
      {lines.slice(1).map((l) => (
        <p key={l}>{l}</p>
      ))}
      <div className="row">
        <button
          type="button"
          className="recap-btn"
          onClick={async () => {
            const blob = await cardImage({ eyebrow: tr("先月のふりかえり"), title, stats, lines });
            await shareImage(blob, title).catch(() => toast("共有できませんでした", { tone: "warn" }));
          }}
        >
          {tr("画像で送る")}
        </button>
        <button type="button" className="recap-btn recap-close" onClick={close}>
          {tr("閉じる")}
        </button>
      </div>
    </section>
  );
}
