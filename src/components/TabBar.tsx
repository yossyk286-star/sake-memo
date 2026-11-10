"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LAST_SCAN_EVENT, loadLastScan } from "@/lib/lastScan";
import { tr, trv } from "@/lib/i18n";

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

// 入力・詳細画面はタブを出さない（保存ボタンと重なるため）。店員さんに見せる画面も、見せるものだけにする
const HIDDEN_ON = ["/new", "/edit", "/show"];

// 好みのタブから開くまとめの画面
const TASTE_PAGES = ["/taste", "/stamps", "/shops", "/shop", "/prefs", "/bottles"];

const BADGE_LABEL = (n: number) => tr("今日調べたお酒 {0}種類", n);

export default function TabBar() {
  const pathname = usePathname();
  // 今日調べたお酒の数。画面を移るたびに読み直す
  const [scanned, setScanned] = useState(0);
  // 下へスクロールしたら帯を縮めて画面を広く見せる。上へ戻すか、いちばん上近くで元に戻す
  const [mini, setMini] = useState(false);
  useEffect(() => {
    setMini(false);
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - last;
      if (y < 40) setMini(false);
      else if (d > 8) setMini(true);
      else if (d < -8) setMini(false);
      else return;
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
  useEffect(() => {
    const update = () => setScanned(loadLastScan()?.drinks.length ?? 0);
    update();
    window.addEventListener(LAST_SCAN_EVENT, update);
    return () => window.removeEventListener(LAST_SCAN_EVENT, update);
  }, [pathname]);
  if (HIDDEN_ON.includes(pathname)) return null;

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname === "/record" || pathname === "/compare"
      : href === "/scan"
        ? pathname.startsWith("/scan") || pathname === "/pair"
        : href === "/taste"
          ? TASTE_PAGES.includes(pathname)
          : pathname.startsWith(href);
  const scan = TABS.find((t) => t.href === "/scan")!;
  const others = TABS.filter((t) => t.href !== "/scan");
  // 縮んだときに残すタブ（いまの画面。調べる画面などで無いときは記録）
  const keep = others.find((t) => isActive(t.href))?.href ?? "/";
  const scanActive = isActive(scan.href);

  return (
    <nav className="tabbar" aria-label={tr("メイン")} data-mini={mini ? "" : undefined}>
      <div className="tabbar-inner">
        <div className="tabbar-pill">
          {others.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={t.href === keep ? "tab tab-keep" : "tab"}
              data-tour={`tab-${t.href.slice(1) || "home"}`}
              aria-current={isActive(t.href) ? "page" : undefined}
              onClick={() => setMini(false)}
            >
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
              {trv(t.label)}
            </Link>
          ))}
        </div>
        {/* 「調べる」はお店で片手で押しやすいよう、帯の外の大きな丸ボタンにする */}
        <Link href={scan.href} className="tab-scan" data-tour="tab-scan" aria-label={trv(scan.label)} aria-current={scanActive ? "page" : undefined}>
          <span className="tab-scan-btn">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {scan.icon}
            </svg>
            {scanned > 0 && (
              <span className="tab-badge" aria-label={BADGE_LABEL(scanned)}>
                {trv(scanned)}
              </span>
            )}
          </span>
        </Link>
      </div>
    </nav>
  );
}
