"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MultiChips, SingleChips } from "./ChipGroup";
import AbvInput from "./AbvInput";
import GlossarySheet from "./GlossarySheet";
import SavedCheck from "./SavedCheck";
import { announceBuddy, buddyLine } from "@/lib/buddy";
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
import { photosOf, shrinkPhotos } from "@/lib/photo";
import { PhotoAddButton, PhotoRow } from "./PhotoAdd";
import { emptyServeNote, GLASSES, hasServeNote, TEMP_NAMES } from "@/lib/serveNote";
import type { Kind, RecordDraft, Score, ServeNote, TastingRecord } from "@/lib/types";

const SCORES: Score[] = [1, 2, 3, 4, 5];

/** 味の評価の項目と、1・5 がそれぞれどちら寄りか */
const RATINGS: [
  "sweetness" | "acidity" | "body" | "aroma" | "finish",
  string,
  string,
  string,
][] = [
  ["sweetness", "甘さ", "辛口", "甘口"],
  ["acidity", "酸味", "穏やか", "強い"],
  ["body", "コク", "軽い", "濃い"],
  ["aroma", "香り", "控えめ", "華やか"],
  ["finish", "キレ", "まろやか", "すっと切れる"],
];

/** 入力の量。かんたん＝名前と★だけ、くわしく＝全部 */
type FormMode = "かんたん" | "くわしく";
const MODE_KEY = "sake-memo:form-mode";

function loadMode(): FormMode | null {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === "かんたん" || m === "くわしく" ? m : null;
  } catch {
    return null;
  }
}

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
    aroma: null,
    finish: null,
    overall: null,
    pairing: "",
    price: null,
    memo: "",
    photos: [],
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

/** 1〜5 のボタン。下に「1 がどういう意味か・5 がどういう意味か」を出す */
function RatingRow({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: Score | null | undefined;
  onChange: (v: Score | null) => void;
}) {
  return (
    <div className="rating-row" role="group" aria-label={`${label}（1=${low}、5=${high}）`}>
      <span className="label">{label}</span>
      <div className="rating-scale">
        <div className="rating-btns">
          {SCORES.map((n) => (
            <button
              type="button"
              key={n}
              className="chip"
              aria-pressed={value === n}
              aria-label={`${label} ${n}`}
              onClick={() => onChange(value === n ? null : n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="rating-ends" aria-hidden="true">
          <span>{low}</span>
          <span>{high}</span>
        </div>
      </div>
    </div>
  );
}

/** 家で飲んだときの割り方・温度・酒器・コツ */
function ServeNoteFields({ value, onChange }: { value: ServeNote; onChange: (n: ServeNote) => void }) {
  const set = <K extends keyof ServeNote>(key: K, v: ServeNote[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="recipe-fields">
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 0 }}>
          <label className="label" htmlFor="f-ratio">
            割り方
          </label>
          <input id="f-ratio" className="input" placeholder="例：ソーダ 1:3" value={value.ratio} onChange={(e) => set("ratio", e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 0 }}>
          <label className="label" htmlFor="f-temp">
            温度
          </label>
          <input
            id="f-temp"
            className="input"
            list="temp-names"
            placeholder="例：上燗（45℃）"
            value={value.temp}
            onChange={(e) => set("temp", e.target.value)}
          />
          <datalist id="temp-names">
            {TEMP_NAMES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </div>
      <fieldset className="field">
        <legend className="label">酒器・グラス</legend>
        <SingleChips options={GLASSES} value={value.glass} onChange={(v) => set("glass", v)} />
      </fieldset>
      <div className="field">
        <label className="label" htmlFor="f-tip">
          コツ
        </label>
        <input id="f-tip" className="input" placeholder="例：氷は大きめ、グラスを冷やしておく" value={value.tip} onChange={(e) => set("tip", e.target.value)} />
      </div>
    </div>
  );
}

/** 総合の評価。★をタップして選ぶ */
function StarRating({
  value,
  onChange,
}: {
  value: Score | null;
  onChange: (v: Score) => void;
}) {
  return (
    <div className="field">
      <span className="label" id="f-overall">
        総合 <span className="req">必須</span>
      </span>
      <div className="star-rating" role="radiogroup" aria-labelledby="f-overall">
        {SCORES.map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={value === n}
            aria-label={`★${n}`}
            className={value && n <= value ? "on" : ""}
            onClick={() => onChange(n)}
          >
            ★
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
  fromWish = false,
  onSaved,
}: {
  initial?: TastingRecord;
  /** 新規作成時に先に入れておく値（メニュー読み取り結果など） */
  prefill?: Partial<RecordDraft>;
  /** お酒の情報が読み取りで入っているとき true。感想を先に出し、お酒の情報はたたむ */
  drinkFilled?: boolean;
  /** 気になるリストのお酒を記録するとき true（相棒が「ついに飲めたね」と言う） */
  fromWish?: boolean;
  /** 保存後の動き。なければ一覧（編集なら詳細）に戻る */
  onSaved?: (record: TastingRecord) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<RecordDraft>(
    () =>
      initial
        ? { ...initial, photos: photosOf(initial), photo: null }
        : { ...emptyDraft(), ...prefill },
  );
  const [sheet, setSheet] = useState<GlossaryCategory | null>(null);
  const [newFlavor, setNewFlavor] = useState("");
  const [shopNames, setShopNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // 編集はふだん全部の項目を見たいので「くわしく」から。新規は前に選んだほう
  const [mode, setModeState] = useState<FormMode>("くわしく");
  useEffect(() => {
    if (!initial) setModeState(loadMode() ?? "くわしく");
  }, [initial]);
  function setMode(m: FormMode) {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  }

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

  async function onPhotos(files: FileList | null) {
    try {
      const added = await shrinkPhotos(files);
      setDraft((d) => ({ ...d, photos: [...d.photos, ...added] }));
    } catch {
      setError("写真を読み込めませんでした");
    }
  }

  async function save() {
    if (!draft.shop.trim()) return setError("店名を入れるか「家で」を選んでください");
    if (!draft.overall) return setError("総合の評価を選んでください");
    setError("");
    setSaving(true);
    const now = Date.now();
    const record: TastingRecord = {
      ...draft,
      serveNote: hasServeNote(draft.serveNote) ? draft.serveNote : undefined,
      shop: draft.shop.trim(),
      overall: draft.overall,
      id: initial?.id ?? crypto.randomUUID(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await putRecord(record);
    // ✓ を少し見せてから移る（動きを減らす設定の人はすぐ移る）
    setSaved(true);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) await new Promise((r) => setTimeout(r, 700));
    setSaved(false);
    // 新しい記録のときだけ、相棒がひとこと言う
    if (!initial) listRecords().then((all) => announceBuddy(buddyLine(record, all, { fromWish })));
    if (onSaved) return onSaved(record);
    router.replace(initial ? `/record?id=${record.id}` : "/");
  }

  const overallField = (
    <StarRating value={draft.overall} onChange={(v) => set("overall", v)} />
  );

  const nameField = (
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
  );

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
      {nameField}
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
      {overallField}
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
      {/* 家で飲むときだけ使うので、店で飲んだ記録ではたたんでおく */}
      <details className="drink-details" open={draft.shop.trim() === "家" || hasServeNote(draft.serveNote)}>
        <summary>飲み方メモ（割り方・温度・グラス）</summary>
        <ServeNoteFields value={draft.serveNote ?? emptyServeNote()} onChange={(n) => set("serveNote", n)} />
      </details>

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
        {RATINGS.map(([key, label, low, high]) => (
          <RatingRow
            key={key}
            label={label}
            low={low}
            high={high}
            value={draft[key]}
            onChange={(v) => set(key, v)}
          />
        ))}
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
      <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
      <div className="field" style={{ flex: 1, minWidth: 0 }}>
        <label className="label" htmlFor="f-abv">
          度数（%）
        </label>
        <AbvInput id="f-abv" value={draft.abv} onChange={(v) => set("abv", v)} />
      </div>
      <div className="field" style={{ flex: 1, minWidth: 0 }}>
        <label className="label" htmlFor="f-price">
          値段（1杯・円）
        </label>
        <input
          id="f-price"
          className="input"
          inputMode="numeric"
          placeholder="例：800"
          value={draft.price ?? ""}
          onChange={(e) => {
            // 全角数字やカンマ入りでも数字だけ取り出す
            const digits = e.target.value.normalize("NFKC").replace(/\D/g, "");
            set("price", digits ? Number(digits) : null);
          }}
        />
      </div>
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
            max={today()}
            value={draft.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="f-shop">
            どこで飲んだ <span className="req">必須</span>
          </label>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input
              id="f-shop"
              className="input"
              list="shop-names"
              placeholder="店名（例：〇〇酒場）"
              value={draft.shop}
              onChange={(e) => set("shop", e.target.value)}
            />
            {/* 家で買って飲んだときは店名の代わりに「家」 */}
            <button
              type="button"
              className="chip"
              style={{ flexShrink: 0 }}
              aria-pressed={draft.shop.trim() === "家"}
              onClick={() => set("shop", draft.shop.trim() === "家" ? "" : "家")}
            >
              家で
            </button>
          </div>
          <datalist id="shop-names">
            {shopNames.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="mode-switch" role="group" aria-label="入力の量">
          {(["かんたん", "くわしく"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "かんたん" ? (
          <>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              名前と★だけで保存できます。味や飲み方はあとから編集で足せます。
            </p>
            {!drinkFilled && nameField}
            {!drinkFilled && (
              <fieldset className="field">
                <legend className="label">種類</legend>
                <SingleChips options={KINDS} value={draft.kind} onChange={setKind} />
              </fieldset>
            )}
            {overallField}
          </>
        ) : drinkFilled ? (
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
          <PhotoRow
            photos={draft.photos}
            onRemove={(i) =>
              set(
                "photos",
                draft.photos.filter((_, k) => k !== i),
              )
            }
          />
          <div className="row">
            <PhotoAddButton
              label={
                draft.photos.length > 0
                  ? "＋ 写真をもっと追加"
                  : "＋ 記録に写真を残す"
              }
              onFiles={onPhotos}
            />
          </div>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {saved && <SavedCheck />}
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
