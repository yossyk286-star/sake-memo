"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SingleChips } from "@/components/ChipGroup";
import { kindColor, stars, yen } from "@/components/RecordCard";
import { announceBuddy } from "@/lib/buddy";
import { deleteBottle, listBottles, listRecords, putBottle } from "@/lib/db";
import { KINDS, STYLES_BY_KIND } from "@/lib/glossary";
import AbvInput from "@/components/AbvInput";
import { abvText } from "@/lib/abv";
import { today } from "@/lib/lastScan";
import { bestServeNote, serveNoteText } from "@/lib/serveNote";
import type { Bottle, Kind, TastingRecord } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { tr, trJoin, trv } from "@/lib/i18n";

function emptyBottle(): Omit<Bottle, "id" | "createdAt"> {
  return { name: "", kind: null, style: null, maker: "", origin: "", note: "", price: null, abv: null, boughtAt: today(), finished: false };
}

/** 買ったお酒を登録するフォーム */
function AddBottle({ onAdded }: { onAdded: (b: Bottle) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyBottle);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    if (!draft.name.trim()) return;
    const bottle: Bottle = { ...draft, name: draft.name.trim(), id: crypto.randomUUID(), createdAt: Date.now() };
    await putBottle(bottle);
    onAdded(bottle);
    setDraft(emptyBottle());
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        {tr("＋ 買ったお酒を登録")}
      </button>
    );
  }
  return (
    <form
      className="card"
      style={{ gap: 14 }}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="field">
        <label className="label" htmlFor="b-name">
          {tr("名前")}{" "}<span className="req">{tr("必須")}</span>
        </label>
        <input id="b-name" className="input" placeholder={tr("例：獺祭 純米大吟醸45")} value={draft.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <fieldset className="field">
        <legend className="label">{tr("種類")}</legend>
        <SingleChips
          options={KINDS}
          value={draft.kind}
          onChange={(k: Kind | null) => setDraft((d) => ({ ...d, kind: k, style: null }))}
        />
      </fieldset>
      {draft.kind && (
        <fieldset className="field">
          <legend className="label">{tr("タイプ")}</legend>
          <SingleChips options={STYLES_BY_KIND[draft.kind]} value={draft.style} onChange={(v) => set("style", v)} />
        </fieldset>
      )}
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="label" htmlFor="b-maker">
            {tr("蔵元・醸造所")}
          </label>
          <input id="b-maker" className="input" value={draft.maker} onChange={(e) => set("maker", e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="label" htmlFor="b-origin">
            {tr("産地")}
          </label>
          <input id="b-origin" className="input" value={draft.origin} onChange={(e) => set("origin", e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="b-abv">
          {tr("度数（%）")}
        </label>
        <AbvInput id="b-abv" value={draft.abv} onChange={(v) => set("abv", v)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="b-price">
          {tr("買った値段（円）")}
        </label>
        <input
          id="b-price"
          className="input"
          inputMode="numeric"
          placeholder={tr("例：2200")}
          value={draft.price ?? ""}
          onChange={(e) => {
            const digits = e.target.value.normalize("NFKC").replace(/\D/g, "");
            set("price", digits ? Number(digits) : null);
          }}
        />
      </div>
      <div className="row">
        <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={!draft.name.trim()}>
          {tr("登録する")}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          {tr("やめる")}
        </button>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        {tr("ラベルを撮って調べた結果からも「家のお酒に登録」で入れられます。")}
      </p>
    </form>
  );
}

function BottleCard({
  bottle: b,
  records,
  onChange,
  onDelete,
}: {
  bottle: Bottle;
  records: TastingRecord[];
  onChange: (b: Bottle) => void;
  onDelete: (id: string) => void;
}) {
  const mine = records.filter((r) => r.bottleId === b.id);
  const avg = mine.length ? mine.reduce((a, r) => a + r.overall, 0) / mine.length : 0;
  const best = bestServeNote(mine);
  return (
    <article className="card" style={{ gap: 6, opacity: b.finished ? 0.7 : 1 }}>
      <div className="card-top">
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="kind-dot" style={{ background: kindColor(b.kind) }} aria-hidden="true" />
          {trv(b.name)}
        </h2>
        <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {b.finished && <span className="muted">{tr("飲みきった")}</span>}
          {!b.finished && b.low && <span className="muted">{tr("残りわずか")}</span>}
          {/* 削除はあまり使わないので、ボタンの列から外して右上に小さく置く */}
          <button type="button" className="text-btn text-danger" onClick={() => onDelete(b.id)}>
            {tr("削除")}
          </button>
        </span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {/* 「1,500/円」のように1つの項目の途中で折り返さないよう、項目ごとにまとめる */}
        {[trJoin([b.kind, b.style]), b.maker, trv(b.origin), b.abv && abvText(b.abv), b.price && yen(b.price), tr("{0}に購入", b.boughtAt.slice(5).replace("-", "/"))]
          .filter(Boolean)
          .map((t, i, all) => (
            // 「・」は行の頭に来られないので、前の項目の後ろに付けて、そこで折り返せるようにする
            <span key={i} style={{ whiteSpace: "nowrap" }}>
              {trv(t)}
              {i < all.length - 1 && tr("・")}
            </span>
          ))}
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>
        {mine.length > 0 ? (
          <>
            {tr("{0}回記録・平均", mine.length)}{" "}<span className="stars">{stars(Math.round(avg))}</span>
          </>
        ) : (
          <span className="muted">{tr("まだ記録していません")}</span>
        )}
      </p>
      {best?.serveNote && (
        <p className="best-recipe">
          <strong>{tr("いちばん良かった飲み方")}</strong>{tr("（{0}・{1}）", stars(best.overall), best.serve ?? tr("飲み方未入力"))}
          <br />
          {serveNoteText(best.serveNote)}
        </p>
      )}
      {mine.length > 0 && (
        <details className="bottle-history">
          <summary>{tr("記録を見る")}</summary>
          {mine.map((r) => (
            <Link key={r.id} href={`/record?id=${r.id}`}>
              {r.date.slice(5).replace("-", "/")} {stars(r.overall)} {r.serve ?? ""} {r.serveNote ? serveNoteText(r.serveNote) : r.memo.slice(0, 20)}
            </Link>
          ))}
        </details>
      )}
      <div className="row">
        {!b.finished && (
          <Link href={`/new?bottle=${b.id}`} className="btn-secondary" style={{ flex: "1 0 100%", whiteSpace: "nowrap" }}>
            {tr("飲んだ・記録する")}
          </Link>
        )}
        {!b.finished && (
          <button
            type="button"
            className="btn-secondary"
            aria-pressed={!!b.low}
            onClick={() => onChange({ ...b, low: !b.low })}
            style={{ flex: 1, whiteSpace: "nowrap" }}
          >
            {b.low && "✓ "}{tr("残りわずか")}
          </button>
        )}
        <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => onChange({ ...b, finished: !b.finished })}>
          {b.finished ? tr("まだある") : tr("飲みきった")}
        </button>
      </div>
    </article>
  );
}

/** 家で飲むために買ったお酒。1本を何回かに分けて記録し、味の変化も追える */
export default function BottlesPage() {
  const [bottles, setBottles] = useState<Bottle[] | null>(null);
  const [records, setRecords] = useState<TastingRecord[]>([]);

  useEffect(() => {
    listBottles().then(setBottles);
    listRecords().then(setRecords);
  }, []);

  const [open, done] = useMemo(
    () => [(bottles ?? []).filter((b) => !b.finished), (bottles ?? []).filter((b) => b.finished)],
    [bottles],
  );

  async function change(b: Bottle) {
    // 残りわずかにしたら、相棒が次の1本を探すよう声をかける
    if (b.low && !bottles?.find((x) => x.id === b.id)?.low)
      announceBuddy({
        mood: "normal",
        text: tr("{0}、そろそろなくなりそう？次の1本探す？", b.name),
        action: { label: tr("調べる"), href: "/scan" },
      });
    await putBottle(b);
    setBottles((bs) => bs?.map((x) => (x.id === b.id ? b : x)) ?? null);
  }

  async function remove(id: string) {
    if (!confirm(tr("このお酒を削除しますか？（記録は残ります）"))) return;
    await deleteBottle(id);
    setBottles((bs) => bs?.filter((x) => x.id !== id) ?? null);
  }

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          {tr("‹ 戻る")}
        </Link>
        <h1>{tr("家のお酒")}</h1>
      </header>
      <p className="lead">{tr("買ったお酒を登録しておくと、飲むたびにすぐ記録できて、開けてからの味の変化も追えます。")}</p>
      <main className="content">
        <AddBottle onAdded={(b) => setBottles((bs) => [b, ...(bs ?? [])])} />
        {bottles?.length === 0 && (
          <EmptyState title={tr("家のお酒、まだないよ")}>
            {tr("買ったお酒を上の「＋ 買ったお酒を登録」から入れておくと、飲むたびにすぐ記録できるよ。")}
          </EmptyState>
        )}
        {open.map((b) => (
          <BottleCard key={b.id} bottle={b} records={records} onChange={change} onDelete={remove} />
        ))}
        {done.length > 0 && <h2 className="date-head">{tr("飲みきったお酒")}</h2>}
        {done.map((b) => (
          <BottleCard key={b.id} bottle={b} records={records} onChange={change} onDelete={remove} />
        ))}
      </main>
    </>
  );
}
