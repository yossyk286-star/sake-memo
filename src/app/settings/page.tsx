"use client";

import Link from "next/link";
import { useState } from "react";
import { exportJSON, importJSON } from "@/lib/db";

export default function SettingsPage() {
  const [message, setMessage] = useState("");

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
      setMessage(`${n}件の記録を読み込みました。`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "読み込めませんでした");
    }
  }

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 戻る
        </Link>
        <h1>設定</h1>
      </header>
      <main className="content" style={{ paddingTop: 16 }}>
        <section className="card">
          <h2>データのバックアップ</h2>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            記録はこの端末の中だけに保存されています。機種変更のときや念のために、ファイルに書き出しておけます。
          </p>
          <div className="row">
            <button type="button" className="btn-secondary" onClick={download}>
              書き出す
            </button>
            <label className="btn-secondary">
              読み込む
              <input type="file" accept="application/json,.json" onChange={upload} className="visually-hidden" />
            </label>
          </div>
          {message && (
            <p className="muted" role="status">
              {message}
            </p>
          )}
        </section>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
          お酒は20歳になってから。飲んだら運転はしないでください。
        </p>
      </main>
    </>
  );
}
