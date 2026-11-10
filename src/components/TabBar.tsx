"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LAST_SCAN_EVENT, loadLastScan } from "@/lib/lastScan";
import { tr, trv } from "@/lib/i18n";
import { isPlainClick, transitionTo } from "@/lib/viewTransition";

const TABS = [
  {
    href: "/",
    label: "記録",
    icon: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
    solid: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" strokeWidth="2.6" />
        <circle cx="4.5" cy="6" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="18" r="1.7" fill="currentColor" stroke="none" />
      </>
    ),
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
    solid: (
      <>
        <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" fill="currentColor" />
        <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
      </>
    ),
  },
  {
    href: "/scan",
    label: "調べる",
    icon: (
      <>
        {/* 撮るだけでなく、名前・料理からも調べられるのでカメラではなく虫めがね */}
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 20 20" />
      </>
    ),
    solid: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" fill="currentColor" fillOpacity="0.22" />
        <path d="M15.5 15.5 20 20" strokeWidth="2.8" />
      </>
    ),
  },
  {
    href: "/wishlist",
    label: "気になる",
    icon: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
    solid: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor" />,
  },
  {
    href: "/taste",
    label: "好み",
    icon: <path d="M5 20v-7M12 20V5M19 20v-10M3 20h18" />,
    solid: (
      <>
        <path d="M5 19v-6M12 19V5M19 19v-9" strokeWidth="3.4" />
        <path d="M3 20.5h18" />
      </>
    ),
  },
];

// 入力・詳細画面はタブを出さない（保存ボタンと重なるため）。店員さんに見せる画面も、見せるものだけにする
const HIDDEN_ON = ["/new", "/edit", "/show"];

// 好みのタブから開くまとめの画面
const TASTE_PAGES = ["/taste", "/stamps", "/shops", "/shop", "/prefs", "/bottles"];

const BADGE_LABEL = (n: number) => tr("今日調べたお酒 {0}種類", n);

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
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
  /** タブを移るとき、ぱっと変えずに前の画面を薄めながら次の画面を重ねる */
  const go = (href: string) => (e: React.MouseEvent) => {
    setMini(false);
    if (!isPlainClick(e) || pathname === href) return;
    e.preventDefault();
    transitionTo(() => router.push(href), () => location.pathname === href, "tab");
  };

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
              onClick={go(t.href)}
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
                {/* 選んでいるタブは塗りの絵にする（CSS で一瞬弾む） */}
                {isActive(t.href) ? t.solid : t.icon}
              </svg>
              {trv(t.label)}
            </Link>
          ))}
        </div>
        {/* 「調べる」はお店で片手で押しやすいよう、帯の外の大きな丸ボタンにする */}
        <Link href={scan.href} className="tab-scan" data-tour="tab-scan" aria-label={trv(scan.label)} aria-current={scanActive ? "page" : undefined} onClick={go(scan.href)}>
          <span className="tab-scan-btn">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {scanActive ? scan.solid : scan.icon}
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
