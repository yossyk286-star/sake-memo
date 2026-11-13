"use client";

import BackLink from "@/components/BackLink";
import Link from "next/link";
import { useEffect, useState } from "react";
import BuddyFace from "@/components/BuddyFace";
import { announceBuddy, buddyOn, pick, setBuddyOn } from "@/lib/buddy";
import { importJSON } from "@/lib/db";
import { daysSince, lastBackup, saveBackup } from "@/lib/backup";
import { ACCENTS, DEFAULT_THEME, loadTheme, saveTheme, type Appearance, type Theme } from "@/lib/theme";
import { loadLangSetting, saveLangSetting, tr, trv, type LangSetting } from "@/lib/i18n";
import { askConfirm } from "@/components/ConfirmSheet";
import { LimitSetting, LookExtras, RecordSettings, UseSettings } from "@/components/FeatureSettings";

const APPEARANCES: { id: Appearance; label: string }[] = [
  { id: "auto", label: "自動" },
  { id: "light", label: "ライト" },
  { id: "dark", label: "ダーク" },
  { id: "time", label: "時間で" },
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
  const [last, setLast] = useState<number | null>(null);
  useEffect(() => {
    setLast(lastBackup());
    setTheme(loadTheme());
    setLang(loadLangSetting());
    setBuddy(buddyOn());
  }, []);

  function changeBuddy(on: boolean) {
    setBuddy(on);
    setBuddyOn(on);
    if (on) announceBuddy({ mood: "happy", text: pick(["また記録するとき、ひとこと言うね！", "ただいま！また相棒させてね"]) });
  }

  function changeTheme(next: Partial<Theme>) {
    const t = { ...theme, ...next };
    setTheme(t);
    saveTheme(t);
  }

  async function download() {
    if (!(await saveBackup())) return;
    setLast(lastBackup());
    setMessage(tr("書き出しました。ファイルを iCloud やメールなどに保存しておくと安心です。"));
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!(await askConfirm({ message: tr("読み込むと、同じ記録は読み込んだ内容で上書きされます。読み込みますか？"), action: tr("読み込む") }))) return;
    try {
      const n = await importJSON(await file.text());
      setMessage(tr("{0}件の記録を読み込みました。", n));
    } catch (err) {
      setMessage(tr(err instanceof Error ? err.message : "読み込めませんでした"));
    }
  }

  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/" />
        <h1>{tr("設定")}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16 }}>
        <Link href="/guide" className="hub-item hub-show" data-tour="set-guide">
          <strong>{tr("使い方")}</strong>
          <span className="muted">{tr("記録のしかた・お店での調べ方・バックアップなど")}</span>
        </Link>

        <h2 className="section-title">{tr("見た目")}</h2>
        <section data-tour="set-look" className="card" style={{ gap: 14 }}>
          <div className="setting-row">
            <span>{tr("明るさ")}</span>
            <div className="mode-switch" role="group" aria-label={tr("明るさ")}>
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
            <p className="muted">{tr("「自動」はスマホの設定に合わせます。「時間で」は18時〜朝6時だけ暗い画面になります。")}</p>
          </div>
          <div className="setting-row">
            <span>{tr("文字の大きさ")}</span>
            <div className="mode-switch" role="group" aria-label={tr("文字の大きさ")}>
              {(["normal", "large"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={(theme.text ?? "normal") === t}
                  onClick={() => changeTheme({ text: t })}
                >
                  {t === "normal" ? tr("標準") : tr("大きめ")}
                </button>
              ))}
            </div>
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
          <LookExtras />
        </section>

        <h2 className="section-title">{tr("操作")}</h2>
        <UseSettings />

        <h2 className="section-title">{tr("記録")}</h2>
        <RecordSettings />

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
          <LimitSetting />
        </section>

        <h2 className="section-title">{tr("データ")}</h2>
        <section className="card" data-tour="set-backup">
          <h2>{tr("バックアップ")}</h2>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            {tr("記録はこの端末の中だけに保存されています。機種変更のときや念のために、ファイルに書き出しておけます。")}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {last === null
              ? tr("まだ書き出していません")
              : daysSince(last) === 0
                ? tr("最後に書き出した日：今日")
                : tr("最後に書き出した日：{0}日前", daysSince(last))}
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
        <p className="muted settings-note">
          {tr("お酒は20歳になってから。飲んだら運転はしないでください。")}
        </p>
      </main>
    </>
  );
}
