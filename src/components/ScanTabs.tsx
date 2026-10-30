import Link from "next/link";

/** 調べる画面の「飲み物から｜料理から」の切り替え。同じお店のメニューを行き来しやすいように、ひとつの画面のタブのように見せる */
export default function ScanTabs({ current }: { current: "drink" | "food" }) {
  return (
    <nav className="mode-switch scan-tabs" aria-label="調べ方">
      <Link href="/scan" replace aria-current={current === "drink" ? "page" : undefined}>
        飲み物から
      </Link>
      <Link href="/pair" replace aria-current={current === "food" ? "page" : undefined}>
        料理から
      </Link>
    </nav>
  );
}
