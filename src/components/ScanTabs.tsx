"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { tr } from "@/lib/i18n";
import { holdPageFade } from "@/lib/pageSwap";

const TABS = [
  { id: "drink", href: "/scan", label: "飲み物から" },
  { id: "food", href: "/pair", label: "料理から" },
] as const;

/**
 * 調べる画面の「飲み物から｜料理から」の切り替え。同じお店のメニューを行き来しやすいように、ひとつの画面のタブのように見せる。
 * 好みタブの切り替えと同じく、白い丸がすべってから中身が押した向きから入れ替わる（画面全体がふわっと出直すとちかちかして見えるので止める）
 */
export default function ScanTabs({ current }: { current: "drink" | "food" }) {
  const router = useRouter();
  const [at, setAt] = useState<string>(current);

  function go(e: React.MouseEvent, id: string, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (id === current) return;
    holdPageFade(id === "food" ? "next" : "prev");
    setAt(id);
    // 丸がすべり終わってから移る（途中で移ると新しい画面の丸が最後の位置へ飛んで見える。0.28s は globals.css の .mode-switch::before と合わせる）
    window.setTimeout(() => router.replace(href), 280);
  }

  return (
    <nav className="mode-switch scan-tabs" aria-label={tr("調べ方")}>
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          replace
          onClick={(e) => go(e, t.id, t.href)}
          data-tour={t.id === "food" ? "scan-food" : undefined}
          aria-current={at === t.id ? "page" : undefined}
        >
          {tr(t.label)}
        </Link>
      ))}
    </nav>
  );
}
