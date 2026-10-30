"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BuddyFace from "@/components/BuddyFace";
import { announceBuddy, buddyOn, setBuddyOn } from "@/lib/buddy";
import { exportJSON, importJSON } from "@/lib/db";
import { ACCENTS, DEFAULT_THEME, loadTheme, saveTheme, type Appearance, type Theme } from "@/lib/theme";
import { loadLangSetting, saveLangSetting, tr, trv, type LangSetting } from "@/lib/i18n";

const APPEARANCES: { id: Appearance; label: string }[] = [
  { id: "auto", label: "自動" },
  { id: "light", label: "ライト" },
  { id: "dark", label: "ダーク" },
];

// 言語の名前は、どちらの言語で開いていても読めるようにそのまま出す
const LANGS: { id: LangSetting; label: string }[] = [
  { id: "auto", label: "自動" },
  { id: "ja", label: "日本語" },
  { id: "en", label: "English" },
];

export default function SettingsPage() {
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [buddy, setBuddy] = useState(true);
  const [lang, setLang] = useState<LangSetting>("auto");
  useEffect(() => {
    setTheme(loadTheme());
    setLang(loadLangSetting());
    setBuddy(buddyOn());
  }, []);

  function changeBuddy(on: boolean) {
    setBuddy(on);
    setBuddyOn(on);
    if (on) announceBuddy({ mood: "happy", text: "また記録するとき、ひとこと言うね！" });
  }

  function changeTheme(next: Partial<Theme>) {
    const t = { ...theme, ...next };
    setTheme(t);
    saveTheme(t);
  }

  async function download() {
    const blob = new Blob([await exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sake-memo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage("書き出しました。ファイルを iCloud やメールなどに保存しておくと安心です。");
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const n = await importJSON(await file.text());
      setMessage(tr("{0}件の記録を読み込みました。", n));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "読み込めませんでした");
    }
  }

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          {tr("‹ 戻る")}
        </Link>
        <h1>{tr("設定")}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16 }}>
        <h2 className="section-title">{tr("見た目")}</h2>
        <section className="card" style={{ gap: 14 }}>
          <div className="setting-row">
            <span>{tr("明るさ")}</span>
            <div className="mode-switch three" role="group" aria-label={tr("明るさ")}>
              {APPEARANCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={theme.appearance === a.id}
                  onClick={() => changeTheme({ appearance: a.id })}
                >
                  {trv(a.label)}
                </button>
              ))}
            </div>
            <p className="muted">{tr("「自動」はスマホの設定に合わせて、夜は暗い画面になります。")}</p>
          </div>
          <div className="setting-row">
            <span>{tr("テーマ色")}</span>
            <div className="swatches" role="group" aria-label={tr("テーマ色")}>
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="swatch"
                  aria-pressed={theme.accent === a.id}
                  onClick={() => changeTheme({ accent: a.id })}
                >
                  <i style={{ "--sw": a.light } as React.CSSProperties} />
                  {trv(a.label)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <h2 className="section-title">{tr("言語 / Language")}</h2>
        <section className="card">
          <div className="mode-switch three" role="group" aria-label={tr("言語")}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={lang === l.id}
                onClick={() => {
                  if (l.id === lang) return;
                  setLang(l.id);
                  saveLangSetting(l.id);
                }}
              >
                {l.id === "auto" ? tr(l.label) : l.label}
              </button>
            ))}
          </div>
          <p className="muted">{tr("「自動」はスマホの言語に合わせます。日本語以外のときは英語になります。")}</p>
        </section>

        <h2 className="section-title">{tr("相棒")}</h2>
        <section className="card">
          <div className="buddy-setting">
            <BuddyFace mood={buddy ? "happy" : "normal"} size={52} />
            <p className="muted" style={{ margin: 0 }}>
              {tr("記録を保存すると、ちっちゃい徳利がひとこと言います。飲みすぎの日は心配もします。")}
            </p>
          </div>
          <div className="mode-switch" role="group" aria-label={tr("相棒")}>
            <button type="button" aria-pressed={buddy} onClick={() => changeBuddy(true)}>
              {tr("出す")}
            </button>
            <button type="button" aria-pressed={!buddy} onClick={() => changeBuddy(false)}>
              {tr("出さない")}
            </button>
          </div>
        </section>

        <h2 className="section-title">{tr("データ")}</h2>
        <section className="card">
          <h2>{tr("バックアップ")}</h2>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            {tr("記録はこの端末の中だけに保存されています。機種変更のときや念のために、ファイルに書き出しておけます。")}
          </p>
          <div className="row">
            <button type="button" className="btn-secondary" onClick={download}>
              {tr("書き出す")}
            </button>
            <label className="btn-secondary">
              {tr("読み込む")}
              <input type="file" accept="application/json,.json" onChange={upload} className="visually-hidden" />
            </label>
          </div>
          {message && (
            <p className="muted" role="status">
              {trv(message)}
            </p>
          )}
        </section>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
          {tr("お酒は20歳になってから。飲んだら運転はしないでください。")}
        </p>
      </main>
    </>
  );
}
