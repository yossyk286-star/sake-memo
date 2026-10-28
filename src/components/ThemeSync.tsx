"use client";

import { useEffect } from "react";
import { applyTheme, loadTheme } from "@/lib/theme";

/** 保存した見た目の設定を当てる。「自動」のときはスマホの明るさの切り替えにもついていく */
export default function ThemeSync() {
  useEffect(() => {
    const apply = () => applyTheme(loadTheme());
    apply();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return null;
}
