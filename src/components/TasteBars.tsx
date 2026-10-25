import type { DrinkTaste } from "@/lib/menuScan";
import styles from "./MenuScan.module.css";

const ROWS: [keyof DrinkTaste, string][] = [
  ["sweetness", "甘さ"],
  ["acidity", "酸味"],
  ["body", "コク"],
  ["aroma", "香り"],
];

/** 1〜5 におさめる（読み取りが範囲外の数を返したとき用） */
export function level(n: number) {
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** 味の予想を5段階のバーで並べる */
export default function TasteBars({ taste }: { taste: DrinkTaste }) {
  return (
    <div className={styles.taste} aria-label="味の予想">
      {ROWS.map(([key, label]) => {
        const v = level(taste[key]);
        return (
          <div key={key} className={styles.tasteRow} aria-label={`${label} 5段階中${v}`}>
            <span>{label}</span>
            <span className={styles.dots} aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={n <= v ? styles.on : ""} />
              ))}
            </span>
          </div>
        );
      })}
      <span className={styles.tasteNote}>味の予想</span>
    </div>
  );
}
