"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MultiChips } from "@/components/ChipGroup";
import { FLAVORS, KINDS, STYLES_BY_KIND } from "@/lib/glossary";
import { EMPTY_PREFS, loadPrefs, savePrefs, type MyPrefs } from "@/lib/prefs";


/** 好きな味・苦手な味。リストにない味は自分で足せる */
function FlavorPicker({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id: string }) {
  const [text, setText] = useState("");
  const options = [...FLAVORS, ...value.filter((f) => !FLAVORS.includes(f))];

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
          ほかの味を追加
        </label>
        <input
          id={id}
          className="input"
          placeholder="例：メロン、はちみつ"
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
        当てはまるものを押してください。メニューを撮ったときの「あなたへのおすすめ」に使います。押すとすぐ保存されます。
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
            <legend className="label">好きな味</legend>
            <FlavorPicker id="p-like" value={prefs.likes} onChange={(v) => update("likes", v)} />
          </fieldset>
          <fieldset className="field">
            <legend className="label">苦手な味</legend>
            <FlavorPicker id="p-dislike" value={prefs.dislikes} onChange={(v) => update("dislikes", v)} />
          </fieldset>
        </main>
      )}
    </>
  );
}
