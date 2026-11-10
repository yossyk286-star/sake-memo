import { trv } from "@/lib/i18n";

/**
 * AI を待つあいだに出す「いま何をしているか」。押したボタンが丸い帯に変わり、その下で段が進む。
 * at は いまの段（0 から）。それより前は ✓、あとは点線の丸
 */
export default function Steps({ title, steps, at }: { title: string; steps: string[]; at: number }) {
  return (
    <div className="steps" role="status" aria-live="polite">
      <div className="steps-pill">
        <span className="step-spin" aria-hidden="true" />
        {trv(title)}
      </div>
      <ol className="steps-list">
        {steps.map((s, i) => {
          const state = i < at ? "done" : i === at ? "now" : "later";
          return (
            <li key={s} data-state={state}>
              {state === "done" ? (
                <span className="step-ok" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 6.2 5 8.5l4.5-5" />
                  </svg>
                </span>
              ) : state === "now" ? (
                <span className="step-spin" aria-hidden="true" />
              ) : (
                <span className="step-wait" aria-hidden="true" />
              )}
              {trv(s)}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
