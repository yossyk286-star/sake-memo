import type { MenuRank } from "@/lib/foodPairing";

/**
 * 同じお店で今日読み取ったもう一方のメニューから選ぶボタンと、押したあとの合う順（上位3つ）。
 * 料理から選ぶでは飲み物メニューを、調べる画面では料理メニューを出す。色は親の --kind
 */
export default function MenuPicks({
  label,
  button,
  ranks,
  busy,
  error,
  onAsk,
}: {
  label: string;
  button: string;
  ranks?: MenuRank[];
  busy: boolean;
  error: string;
  onAsk: () => void;
}) {
  if (!ranks) {
    return (
      <div className="pair-on-menu">
        <button type="button" className="btn-secondary pair-on-menu-btn" onClick={onAsk} disabled={busy}>
          {busy ? "選んでいます…" : button}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }
  const top = ranks.filter((r) => r.score >= 3).slice(0, 3);
  return (
    <div className="pair-on-menu">
      <p className="pair-dish-for">{label}</p>
      {top.length === 0 ? (
        <p className="muted">メニューの中には、とくに合うものが見つかりませんでした。</p>
      ) : (
        <ol className="pair-on-menu-list">
          {top.map((r) => (
            <li key={r.name} className="pair-on-menu-item">
              <span className="pair-on-menu-name">
                <strong>{r.name}</strong>
                <span className="pair-on-menu-score" aria-label={`相性${r.score}`}>
                  {"●".repeat(r.score) + "○".repeat(5 - r.score)}
                </span>
              </span>
              <span className="muted">{r.reason}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
