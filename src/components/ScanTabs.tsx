"use client";

import Link from "next/link";
import { tr } from "@/lib/i18n";

/** 切り替えのあいだだけ、画面全体のふわっと出る動きを止める（上の見出しとタブが同じなので、消えて出るとちかちかして見える） */
function keepStill() {
  const root = document.documentElement;
  root.dataset.swap = "";
  window.setTimeout(() => {
    // 外すと止めていた動きが始めから出てしまうので、移った先の枠は「出終わった」印を付けてから外す
    document.querySelectorAll<HTMLElement>(".page-enter").forEach((el) => (el.dataset.entered = ""));
    delete root.dataset.swap;
  }, 600);
}

/** 調べる画面の「飲み物から｜料理から」の切り替え。同じお店のメニューを行き来しやすいように、ひとつの画面のタブのように見せる */
export default function ScanTabs({ current }: { current: "drink" | "food" }) {
  return (
    <nav className="mode-switch scan-tabs" aria-label={tr("調べ方")}>
      <Link href="/scan" replace onClick={keepStill} aria-current={current === "drink" ? "page" : undefined}>
        {tr("飲み物から")}
      </Link>
      <Link href="/pair" replace onClick={keepStill} data-tour="scan-food" aria-current={current === "food" ? "page" : undefined}>
        {tr("料理から")}
      </Link>
    </nav>
  );
}
