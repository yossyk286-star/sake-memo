"use client";

import { useEffect } from "react";
import { applyTheme, loadTheme } from "@/lib/theme";
import { applyFeatures, loadFeatures } from "@/lib/features";

/** 保存した見た目の設定を当てる。「自動」のときはスマホの明るさの切り替えにもついていく */
export default function ThemeSync() {
  useEffect(() => {
    const apply = () => applyTheme(loadTheme());
    apply();
    applyFeatures(loadFeatures());
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    // 「時間で」のとき、開いたまま18時・6時をまたいでも切り替わるように
    const timer = window.setInterval(() => {
      if (loadTheme().appearance === "time") apply();
    }, 60_000);
    return () => {
      mq.removeEventListener("change", apply);
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
