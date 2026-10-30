import { trv } from "@/lib/i18n";
/** AI の返事を待つあいだ、結果の形だけのカードをふわっと光らせて出す */
export default function Skeleton({
  label,
  cards = 3,
  lines = 2,
  chips = false,
  plain = false,
}: {
  /** 読み上げ用と、上に小さく出す文 */
  label: string;
  cards?: number;
  lines?: number;
  /** 料理などのチップの形も出す */
  chips?: boolean;
  /** カードの中に置くときは枠なしで、文の行だけ */
  plain?: boolean;
}) {
  if (plain) {
    return (
      <div className="skel-wrap skel-plain" role="status" aria-live="polite">
        <p className="skel-label">{trv(label)}</p>
        {Array.from({ length: lines }, (_, j) => (
          <span key={j} className="skel" aria-hidden="true" style={{ width: j === lines - 1 ? "55%" : "100%" }} />
        ))}
      </div>
    );
  }
  return (
    <div className="skel-wrap" role="status" aria-live="polite">
      <p className="skel-label">{trv(label)}</p>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="card skel-card" aria-hidden="true" style={{ animationDelay: `${i * 0.12}s` }}>
          <div className="skel-head">
            <span className="skel skel-dot" />
            <span className="skel" style={{ width: `${[46, 58, 38][i % 3]}%`, height: 18 }} />
          </div>
          {Array.from({ length: lines }, (_, j) => (
            <span key={j} className="skel" style={{ width: j === lines - 1 ? "62%" : "100%" }} />
          ))}
          {chips && (
            <div className="skel-chips">
              <span className="skel skel-chip" style={{ width: 92 }} />
              <span className="skel skel-chip" style={{ width: 68 }} />
              <span className="skel skel-chip" style={{ width: 80 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
