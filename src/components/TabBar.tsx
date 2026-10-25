"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadLastScan } from "@/lib/lastScan";

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
    href: "/scan",
    label: "調べる",
    icon: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
  },
  {
    href: "/wishlist",
    label: "気になる",
    icon: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
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
const TASTE_PAGES = ["/taste", "/stamps", "/shops", "/shop", "/prefs", "/bottles"];

export default function TabBar() {
  const pathname = usePathname();
  // 今日調べたお酒の数。画面を移るたびに読み直す
  const [scanned, setScanned] = useState(0);
  useEffect(() => setScanned(loadLastScan()?.drinks.length ?? 0), [pathname]);
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav className="tabbar" aria-label="メイン">
      <div className="tabbar-inner">
        {TABS.map((t) => {
          const active =
            t.href === "/"
              ? pathname === "/" || pathname === "/record" || pathname === "/compare"
              : t.href === "/taste"
                ? TASTE_PAGES.includes(pathname)
                : pathname.startsWith(t.href);
          // 真ん中の「調べる」はお店で片手で押しやすいよう大きな丸ボタンにする
          if (t.href === "/scan") {
            return (
              <Link key={t.href} href={t.href} className="tab tab-scan" aria-current={active ? "page" : undefined}>
                <span className="tab-scan-btn">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {t.icon}
                  </svg>
                  {scanned > 0 && (
                    <span className="tab-badge" aria-label={`今日調べたお酒 ${scanned}種類`}>
                      {scanned}
                    </span>
                  )}
                </span>
                {t.label}
              </Link>
            );
          }
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
