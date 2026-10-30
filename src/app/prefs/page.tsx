"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MultiChips } from "@/components/ChipGroup";
import { ALL_SERVES, FLAVORS, KINDS, STYLES_BY_KIND } from "@/lib/glossary";
import { EMPTY_PREFS, loadPrefs, savePrefs, type MyPrefs } from "@/lib/prefs";
import { tr, trv } from "@/lib/i18n";


/** 味の寄り方。1〜5 を選び、もう一度押すと「こだわらない」に戻る */
function LeanRow({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="rating-row" role="group" aria-label={tr("{0}（1={1}、5={2}）", label, low, high)}>
      <span className="label">{trv(label)}</span>
      <div className="rating-scale">
        <div className="rating-btns">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              className="chip"
              aria-pressed={value === n}
              onClick={() => onChange(value === n ? null : n)}
            >
              {trv(n)}
            </button>
          ))}
        </div>
        <div className="rating-ends" aria-hidden="true">
          <span>{trv(low)}</span>
          <span>{trv(high)}</span>
        </div>
      </div>
    </div>
  );
}

/** 好きな味・苦手な味・産地。リストにないものは自分で足せる */
function FlavorPicker({
  value,
  onChange,
  id,
  base = FLAVORS,
  placeholder = "例：メロン、はちみつ",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  id: string;
  base?: string[];
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const options = [...base, ...value.filter((f) => !base.includes(f))];

  function add() {
    const f = text.trim();
    if (f && !value.includes(f)) onChange([...value, f]);
    setText("");
  }

  return (
    <>
      <MultiChips options={options} value={value} onChange={onChange} />
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <label htmlFor={id} className="visually-hidden">
          {tr("ほかを追加")}
        </label>
        <input
          id={id}
          className="input"
          placeholder={trv(placeholder)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-secondary" onClick={add}>
          {tr("追加")}
        </button>
      </div>
    </>
  );
}

/** 自分で登録する好み。押したらすぐ保存する */
export default function PrefsPage() {
  const [prefs, setPrefs] = useState<MyPrefs>(EMPTY_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setLoaded(true);
  }, []);

  function update<K extends keyof MyPrefs>(key: K, value: MyPrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  }

  return (
    <>
      <header className="sub-header">
        <Link href="/taste" className="back">
          {tr("‹ 戻る")}
        </Link>
        <h1>{tr("わたしの好み")}</h1>
      </header>

      <p className="lead">
        {tr("当てはまるものを押してください。メニューを撮ったときの「あなたへのおすすめ」や「次の一杯」に使います。押すとすぐ保存されます。")}
      </p>

      {loaded && (
        <main className="form">
          <fieldset className="field">
            <legend className="label">{tr("好きな種類")}</legend>
            <MultiChips options={KINDS} value={prefs.kinds} onChange={(v) => update("kinds", v)} />
          </fieldset>
          {/* 選んだ種類のタイプだけ出す（何も選んでいなければ全部） */}
          {(prefs.kinds.length > 0 ? KINDS.filter((k) => prefs.kinds.includes(k)) : KINDS).map((k) => (
            <fieldset className="field" key={k}>
              <legend className="label">{tr("好きな{0}のタイプ", k)}</legend>
              <MultiChips options={STYLES_BY_KIND[k]} value={prefs.styles} onChange={(v) => update("styles", v)} />
            </fieldset>
          ))}
          <fieldset className="field">
            <legend className="label">{tr("苦手な種類")}</legend>
            <MultiChips
              options={KINDS.filter((k) => !prefs.kinds.includes(k))}
              value={prefs.avoidKinds}
              onChange={(v) => update("avoidKinds", v)}
            />
          </fieldset>
          <fieldset className="field">
            <legend className="label">{tr("好きな飲み方")}</legend>
            <MultiChips options={ALL_SERVES} value={prefs.serves} onChange={(v) => update("serves", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">{tr("好きな産地")}</legend>
            <FlavorPicker
              id="p-origin"
              base={[]}
              placeholder={tr("例：新潟、山口、フランス")}
              value={prefs.origins}
              onChange={(v) => update("origins", v)}
            />
          </fieldset>
          <fieldset className="field">
            <legend className="label">{tr("好きな味の寄り方（こだわらなければ選ばない）")}</legend>
            <div className="ratings">
              <LeanRow label={tr("甘さ")} low={tr("辛口")} high={tr("甘口")} value={prefs.sweetness} onChange={(v) => update("sweetness", v)} />
              <LeanRow label={tr("コク")} low={tr("軽い")} high={tr("濃い")} value={prefs.body} onChange={(v) => update("body", v)} />
              <LeanRow label={tr("香り")} low={tr("控えめ")} high={tr("華やか")} value={prefs.aroma} onChange={(v) => update("aroma", v)} />
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="label">{tr("好きな味")}</legend>
            <FlavorPicker id="p-like" value={prefs.likes} onChange={(v) => update("likes", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">{tr("苦手な味")}</legend>
            <FlavorPicker id="p-dislike" value={prefs.dislikes} onChange={(v) => update("dislikes", v)} />
          </fieldset>
          <div className="field">
            <label className="label" htmlFor="p-budget">
              {tr("1杯の予算（円）")}
            </label>
            <input
              id="p-budget"
              className="input"
              inputMode="numeric"
              placeholder={tr("例：1000")}
              value={prefs.budget ?? ""}
              onChange={(e) => {
                const digits = e.target.value.normalize("NFKC").replace(/\D/g, "");
                update("budget", digits ? Number(digits) : null);
              }}
            />
          </div>
        </main>
      )}
    </>
  );
}
