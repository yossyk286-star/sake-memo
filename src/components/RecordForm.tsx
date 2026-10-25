"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MultiChips, SingleChips } from "./ChipGroup";
import GlossarySheet from "./GlossarySheet";
import { putRecord, listRecords } from "@/lib/db";
import {
  ALL_SERVES,
  FLAVORS,
  KINDS,
  SERVES_BY_KIND,
  STYLES_BY_KIND,
  type GlossaryCategory,
} from "@/lib/glossary";
import { today } from "@/lib/lastScan";
import { shrinkPhoto } from "@/lib/photo";
import type { Kind, RecordDraft, Score, TastingRecord } from "@/lib/types";

const SCORES: Score[] = [1, 2, 3, 4, 5];

function emptyDraft(): RecordDraft {
  return {
    date: today(),
    shop: "",
    name: "",
    maker: "",
    origin: "",
    kind: null,
    style: null,
    serve: null,
    menuNote: "",
    flavors: [],
    sweetness: null,
    acidity: null,
    body: null,
    overall: null,
    pairing: "",
    memo: "",
    photo: null,
  };
}

function HelpButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="help"
      aria-label={`${label}とは`}
      onClick={onClick}
    >
      ?
    </button>
  );
}

function RatingRow({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: Score | null;
  onChange: (v: Score | null) => void;
  required?: boolean;
}) {
  return (
    <div className="rating-row" role="group" aria-label={label}>
      <span className="label">
        {label}
        {required && <span className="req">必須</span>}
      </span>
      <div className="rating-btns">
        {SCORES.map((n) => (
          <button
            type="button"
            key={n}
            className="chip"
            aria-pressed={value === n}
            aria-label={`${label} ${n}`}
            onClick={() => onChange(value === n && !required ? null : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RecordForm({
  initial,
  prefill,
  drinkFilled = false,
  onSaved,
}: {
  initial?: TastingRecord;
  /** 新規作成時に先に入れておく値（メニュー読み取り結果など） */
  prefill?: Partial<RecordDraft>;
  /** お酒の情報が読み取りで入っているとき true。感想を先に出し、お酒の情報はたたむ */
  drinkFilled?: boolean;
  /** 保存後の動き。なければ一覧（編集なら詳細）に戻る */
  onSaved?: (record: TastingRecord) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<RecordDraft>(
    () => initial ?? { ...emptyDraft(), ...prefill },
  );
  const [sheet, setSheet] = useState<GlossaryCategory | null>(null);
  const [newFlavor, setNewFlavor] = useState("");
  const [shopNames, setShopNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // 過去に入れた店名を候補に出す
  useEffect(() => {
    listRecords().then((rs) => {
      setShopNames([...new Set(rs.map((r) => r.shop).filter(Boolean))]);
      // 今日すでに記録した店があれば、新しい記録の店名に先に入れておく
      const latest = rs[0];
      if (!initial && latest?.date === today())
        setDraft((d) => (d.shop ? d : { ...d, shop: latest.shop }));
    });
  }, [initial]);

  const photoURL = useMemo(
    () => (draft.photo ? URL.createObjectURL(draft.photo) : null),
    [draft.photo],
  );
  useEffect(
    () => () => void (photoURL && URL.revokeObjectURL(photoURL)),
    [photoURL],
  );

  const flavorOptions = [
    ...FLAVORS,
    ...draft.flavors.filter((f) => !FLAVORS.includes(f)),
  ];

  // タイプと飲み方の選択肢は種類で変わる。種類を変えたら、合わなくなったものは外す
  const styleOptions = draft.kind ? STYLES_BY_KIND[draft.kind] : [];
  const serveBase = draft.kind ? SERVES_BY_KIND[draft.kind] : ALL_SERVES;
  // 読み取りで入った「よく冷やして」などリストにない飲み方も選べるように残す
  const serveOptions =
    draft.serve && !serveBase.includes(draft.serve)
      ? [...serveBase, draft.serve]
      : serveBase;

  function setKind(kind: Kind | null) {
    setDraft((d) => ({
      ...d,
      kind,
      style: kind && d.style && STYLES_BY_KIND[kind].includes(d.style) ? d.style : null,
      serve:
        kind && d.serve && !SERVES_BY_KIND[kind].includes(d.serve) ? null : d.serve,
    }));
  }

  function addFlavor() {
    const f = newFlavor.trim();
    if (f && !draft.flavors.includes(f)) set("flavors", [...draft.flavors, f]);
    setNewFlavor("");
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      set("photo", await shrinkPhoto(file));
    } catch {
      setError("写真を読み込めませんでした");
    }
  }

  async function save() {
    if (!draft.shop.trim()) return setError("店名を入れてください");
    if (!draft.overall) return setError("総合の評価を選んでください");
    setError("");
    setSaving(true);
    const now = Date.now();
    const record: TastingRecord = {
      ...draft,
      shop: draft.shop.trim(),
      overall: draft.overall,
      id: initial?.id ?? crypto.randomUUID(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await putRecord(record);
    if (onSaved) return onSaved(record);
    router.replace(initial ? `/record?id=${record.id}` : "/");
  }

  const drinkFields = (
    <>
      <fieldset className="field">
        <legend className="label">種類</legend>
        <SingleChips options={KINDS} value={draft.kind} onChange={setKind} />
      </fieldset>
      {draft.kind && (
        <fieldset className="field">
          <legend className="label">
            タイプ{" "}
            <HelpButton
              label={`${draft.kind}のタイプ`}
              onClick={() => setSheet(draft.kind)}
            />
          </legend>
          <SingleChips
            options={styleOptions}
            value={draft.style}
            onChange={(v) => set("style", v)}
          />
        </fieldset>
      )}
      <div className="field">
        <label className="label" htmlFor="f-name">
          銘柄・名前
        </label>
        <input
          id="f-name"
          className="input"
          placeholder="例：獺祭 純米大吟醸45"
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-maker">
          蔵元・醸造所
        </label>
        <input
          id="f-maker"
          className="input"
          placeholder="例：旭酒造 / シャトー〇〇"
          value={draft.maker}
          onChange={(e) => set("maker", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-origin">
          産地（都道府県・国）
        </label>
        <input
          id="f-origin"
          className="input"
          placeholder="例：山口 / フランス"
          value={draft.origin}
          onChange={(e) => set("origin", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-menu">
          お店の説明
        </label>
        <input
          id="f-menu"
          className="input"
          placeholder="例：華やかな香り・やや辛口"
          value={draft.menuNote}
          onChange={(e) => set("menuNote", e.target.value)}
        />
      </div>
    </>
  );

  const tasteFields = (
    <>
      <fieldset className="field">
        <legend className="label">
          飲み方{" "}
          <HelpButton label="飲み方" onClick={() => setSheet("飲み方")} />
        </legend>
        <SingleChips
          options={serveOptions}
          value={draft.serve}
          onChange={(v) => set("serve", v)}
        />
      </fieldset>

      <fieldset className="field">
        <legend className="label">
          感じた味{" "}
          <HelpButton
            label="味の表現"
            onClick={() => setSheet("味の表現")}
          />
        </legend>
        <MultiChips
          options={flavorOptions}
          value={draft.flavors}
          onChange={(v) => set("flavors", v)}
        />
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <label htmlFor="f-flavor" className="visually-hidden">
            ほかの味を追加
          </label>
          <input
            id="f-flavor"
            className="input"
            placeholder="ほかの味を追加"
            value={newFlavor}
            onChange={(e) => setNewFlavor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addFlavor();
              }
            }}
          />
          <button type="button" className="btn-secondary" onClick={addFlavor}>
            追加
          </button>
        </div>
      </fieldset>

      <div className="ratings">
        <RatingRow
          label="甘さ"
          value={draft.sweetness}
          onChange={(v) => set("sweetness", v)}
        />
        <RatingRow
          label="酸味"
          value={draft.acidity}
          onChange={(v) => set("acidity", v)}
        />
        <RatingRow
          label="コク"
          value={draft.body}
          onChange={(v) => set("body", v)}
        />
        <RatingRow
          label="総合"
          value={draft.overall}
          onChange={(v) => set("overall", v)}
          required
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-pairing">
          合わせた料理
        </label>
        <input
          id="f-pairing"
          className="input"
          placeholder="例：お刺身、焼き鳥（塩）"
          value={draft.pairing}
          onChange={(e) => set("pairing", e.target.value)}
        />
      </div>
    </>
  );

  return (
    <>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="field">
          <label className="label" htmlFor="f-date">
            日付 <span className="req">必須</span>
          </label>
          <input
            id="f-date"
            className="input"
            type="date"
            value={draft.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="f-shop">
            店名 <span className="req">必須</span>
          </label>
          <input
            id="f-shop"
            className="input"
            list="shop-names"
            placeholder="例：〇〇酒場"
            value={draft.shop}
            onChange={(e) => set("shop", e.target.value)}
          />
          <datalist id="shop-names">
            {shopNames.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        {drinkFilled ? (
          <>
            {tasteFields}
            {/* 読み取り済みのお酒の情報は、直したいときだけ開く */}
            <details className="drink-details">
              <summary>お酒の情報（読み取り済み・タップで直せます）</summary>
              {drinkFields}
            </details>
          </>
        ) : (
          <>
            {drinkFields}
            {tasteFields}
          </>
        )}
        <div className="field">
          <label className="label" htmlFor="f-memo">
            メモ
          </label>
          <textarea
            id="f-memo"
            className="input"
            placeholder="気づいたこと、次に試したいこと"
            value={draft.memo}
            onChange={(e) => set("memo", e.target.value)}
          />
        </div>

        <div className="field">
          {photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt="記録の写真" className="photo-preview" />
          )}
          <div className="row">
            <label className="btn-ghost" style={{ flex: 1 }}>
              {draft.photo ? "写真を変更" : "＋ 記録に写真を残す"}
              <input
                type="file"
                accept="image/*"
                onChange={onPhoto}
                className="visually-hidden"
              />
            </label>
            {draft.photo && (
              <button
                type="button"
                className="btn-secondary btn-danger"
                onClick={() => set("photo", null)}
              >
                写真を外す
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="save-bar">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </form>

      {sheet && (
        <GlossarySheet category={sheet} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
