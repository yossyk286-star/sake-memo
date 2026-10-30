import type { MenuRank } from "@/lib/foodPairing";
import { tr, trv } from "@/lib/i18n";

/** 相性の●の数を、ひと目でわかる言葉にする */
export function scoreWord(score: number) {
  return ["", "あまり合わない", "ふつう", "合う", "よく合う", "とても合う"][score] ?? "";
}

/**
 * 同じお店で今日読み取ったもう一方のメニューから選ぶボタンと、押したあとの合う順（上位3つ）。
 * 料理から選ぶでは飲み物メニューを、調べる画面では料理メニューを出す。色は親の --kind。
 * onPick を渡すと、それぞれに「＋記録」を付けてそのまま記録に進めるようにする
 */
export default function MenuPicks({
  label,
  button,
  ranks,
  busy,
  error,
  onAsk,
  onPick,
}: {
  label: string;
  button: string;
  ranks?: MenuRank[];
  busy: boolean;
  error: string;
  onAsk: () => void;
  onPick?: (name: string) => void;
}) {
  if (!ranks) {
    return (
      <div className="pair-on-menu">
        <button type="button" className="btn-secondary pair-on-menu-btn" onClick={onAsk} disabled={busy}>
          {busy ? tr("選んでいます…") : button}
        </button>
        {error && <p className="error">{trv(error)}</p>}
      </div>
    );
  }
  const top = ranks.filter((r) => r.score >= 3).slice(0, 3);
  return (
    <div className="pair-on-menu">
      <p className="pair-dish-for">{trv(label)}</p>
      {top.length === 0 ? (
        <p className="muted">{tr("メニューの中には、とくに合うものが見つかりませんでした。")}</p>
      ) : (
        <ol className="pair-on-menu-list">
          {top.map((r) => (
            <li key={r.name} className="pair-on-menu-item">
              <span className="pair-on-menu-name">
                <strong>{trv(r.name)}</strong>
                <span className="pair-on-menu-score" aria-label={tr("相性{0}・{1}", r.score, scoreWord(r.score))}>
                  <span className="pair-on-menu-word">{scoreWord(r.score)}</span>
                  {"●".repeat(r.score) + "○".repeat(5 - r.score)}
                </span>
              </span>
              <span className="pair-on-menu-foot">
                <span className="muted">{trv(r.reason)}</span>
                {onPick && (
                  <button type="button" className="pair-on-menu-rec" onClick={() => onPick(r.name)}>
                    {tr("＋記録")}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
