"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "記録",
    icon: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  },
  {
    href: "/glossary",
    label: "辞典",
    icon: (
      <>
        <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
        <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
      </>
    ),
  },
  {
    href: "/taste",
    label: "好み",
    icon: <path d="M5 20v-7M12 20V5M19 20v-10M3 20h18" />,
  },
];

// 入力・詳細画面はタブを出さない（保存ボタンと重なるため）
const HIDDEN_ON = ["/new", "/edit"];

// 好みのタブから開くまとめの画面
const TASTE_PAGES = ["/taste", "/stamps", "/shops", "/shop", "/wishlist", "/prefs"];

export default function TabBar() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav className="tabbar" aria-label="メイン">
      <div className="tabbar-inner">
        {TABS.map((t) => {
          const active =
            t.href === "/"
              ? pathname === "/" || pathname === "/record"
              : t.href === "/taste"
                ? TASTE_PAGES.includes(pathname)
                : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className="tab" aria-current={active ? "page" : undefined}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {t.icon}
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
