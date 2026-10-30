import { tr } from "@/lib/i18n";
/** 保存できたときに一瞬だけ出る ✓。線が描かれていくように見せる */
export default function SavedCheck() {
  return (
    <div className="saved-check" role="status" aria-label={tr("保存しました")}>
      <div className="saved-check-box">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" />
          <path d="M20 33l8 8 16-17" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {tr("保存しました")}
      </div>
    </div>
  );
}
