"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { lastPath, trackNav } from "@/lib/nav";
import { loadFeatures } from "@/lib/features";

const STARTED = "sake-memo:started";

function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  useEffect(() => {
    // 開いたときの画面（設定）。アプリを開いて最初の1回だけ、記録の一覧から移す
    let first = false;
    try {
      first = !sessionStorage.getItem(STARTED);
      sessionStorage.setItem(STARTED, "1");
    } catch {}
    if (first && pathname === "/" && !search) {
      const start = loadFeatures().start;
      const to = start === "scan" ? "/scan" : start === "last" ? lastPath() : null;
      if (to && to !== "/") {
        router.replace(to);
        return;
      }
    }
    trackNav(pathname + (search ? `?${search}` : ""));
  }, [pathname, search, router]);
  return null;
}

/** 画面を移った順番を覚える（戻る先・開いたときの画面に使う） */
export default function NavTracker() {
  return (
    <Suspense>
      <Tracker />
    </Suspense>
  );
}
