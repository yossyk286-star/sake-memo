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

/**
 * 起動画面を「開いたときの1回だけ」にするための小さなスクリプト。<head> で描画より先に読む。
 * - 同じ起動のあいだに読み直し（画面ごとの読み込み）が起きても、sessionStorage の印を見て出さない
 * - 動きが終わったら html に data-launched を付け、起動画面の要素が作り直されても二度と動かさない
 * （iPhone のホーム画面から開いたとき、ボタンを押すたびに起動画面が出ることがあったため）
 */
export const LAUNCH_BOOT = `(function(){var r=document.documentElement;var done=function(){r.dataset.launched="1"};try{if(sessionStorage.getItem("sake-memo:launched"))done();else sessionStorage.setItem("sake-memo:launched","1")}catch(e){}document.addEventListener("animationend",function(e){if(e.animationName==="launch-out")done()});setTimeout(done,2500)})();`;
