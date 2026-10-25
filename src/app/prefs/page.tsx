"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MultiChips } from "@/components/ChipGroup";
import { ALL_SERVES, FLAVORS, KINDS, STYLES_BY_KIND } from "@/lib/glossary";
import { EMPTY_PREFS, loadPrefs, savePrefs, type MyPrefs } from "@/lib/prefs";


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
    <div className="rating-row" role="group" aria-label={`${label}（1=${low}、5=${high}）`}>
      <span className="label">{label}</span>
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
          ほかを追加
        </label>
        <input
          id={id}
          className="input"
          placeholder={placeholder}
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
          追加
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
          ‹ 戻る
        </Link>
        <h1>わたしの好み</h1>
      </header>

      <p className="lead">
        当てはまるものを押してください。メニューを撮ったときの「あなたへのおすすめ」や「次の一杯」に使います。押すとすぐ保存されます。
      </p>

      {loaded && (
        <main className="form">
          <fieldset className="field">
            <legend className="label">好きな種類</legend>
            <MultiChips options={KINDS} value={prefs.kinds} onChange={(v) => update("kinds", v)} />
          </fieldset>
          {/* 選んだ種類のタイプだけ出す（何も選んでいなければ全部） */}
          {(prefs.kinds.length > 0 ? KINDS.filter((k) => prefs.kinds.includes(k)) : KINDS).map((k) => (
            <fieldset className="field" key={k}>
              <legend className="label">好きな{k}のタイプ</legend>
              <MultiChips options={STYLES_BY_KIND[k]} value={prefs.styles} onChange={(v) => update("styles", v)} />
            </fieldset>
          ))}
          <fieldset className="field">
            <legend className="label">苦手な種類</legend>
            <MultiChips
              options={KINDS.filter((k) => !prefs.kinds.includes(k))}
              value={prefs.avoidKinds}
              onChange={(v) => update("avoidKinds", v)}
            />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな飲み方</legend>
            <MultiChips options={ALL_SERVES} value={prefs.serves} onChange={(v) => update("serves", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな産地</legend>
            <FlavorPicker
              id="p-origin"
              base={[]}
              placeholder="例：新潟、山口、フランス"
              value={prefs.origins}
              onChange={(v) => update("origins", v)}
            />
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな味の寄り方（こだわらなければ選ばない）</legend>
            <div className="ratings">
              <LeanRow label="甘さ" low="辛口" high="甘口" value={prefs.sweetness} onChange={(v) => update("sweetness", v)} />
              <LeanRow label="コク" low="軽い" high="濃い" value={prefs.body} onChange={(v) => update("body", v)} />
              <LeanRow label="香り" low="控えめ" high="華やか" value={prefs.aroma} onChange={(v) => update("aroma", v)} />
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="label">好きな味</legend>
            <FlavorPicker id="p-like" value={prefs.likes} onChange={(v) => update("likes", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">苦手な味</legend>
            <FlavorPicker id="p-dislike" value={prefs.dislikes} onChange={(v) => update("dislikes", v)} />
          </fieldset>
          <div className="field">
            <label className="label" htmlFor="p-budget">
              1杯の予算（円）
            </label>
            <input
              id="p-budget"
              className="input"
              inputMode="numeric"
              placeholder="例：1000"
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
