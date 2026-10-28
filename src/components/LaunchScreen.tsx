import icon from "../../public/icon-512.png";

/**
 * ホーム画面から開いたときの起動画面。iPhone が出す起動画像（public/splash）と同じ絵から始めて、
 * アイコンがふわっと消えてアプリに切り替わる。ブラウザで開いたときと「動きを減らす」の設定では出さない（globals.css）
 */
export default function LaunchScreen() {
  return (
    <div className="launch" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- 描画前から出したいので素の img にする */}
      <img src={icon.src} alt="" />
    </div>
  );
}
