"use client";

import { useEffect } from "react";

/** オフラインでも開けるよう、サービスワーカーを登録する（開発中は古い画面が残って紛らわしいので本番だけ） */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
