import { tr } from "@/lib/i18n";

/** 上の「戻る」：丸いガラスのボタンの中の ‹ だけ（読み上げは「戻る」） */
export default function BackChevron() {
  return (
    <>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <span className="visually-hidden">{tr("戻る")}</span>
    </>
  );
}
