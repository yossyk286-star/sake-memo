/**
 * ホーム画面から開いたときの起動画面（約2.4秒）。
 * 徳利が線で描かれ、お猪口が下から弾んで出てくる → 徳利が傾いて注ぐと蛇の目に波紋 → お猪口を持ち上げて乾杯
 * → 名前が弾んで出て、真ん中から穴が開くようにアプリへ。
 * iPhone が出す起動画像（public/splash）は同じ地の色だけなので、そこから続けて始まる。
 * ブラウザで開いたときと「動きを減らす」の設定では出さない（globals.css「起動画面」）。
 * 色は .launch の --ln-* で決め、ライト・ダークで切り替える。
 */

const E = "cubic-bezier(.2,.7,.2,1)";
const IO = "cubic-bezier(.65,0,.35,1)";
const BOUNCE = "cubic-bezier(.3,1.4,.5,1)";
/** animation の1つ分。名前・始まり(ms)・長さ(ms)・動き方 */
const a = (name: string, delay: number, dur: number, ease = E) => `ln-${name} ${dur}ms ${ease} ${delay}ms both`;
const anim = (...xs: string[]) => `animation:${xs.join(",")};`;
const INK = "stroke:var(--ln-ink)";

// 徳利：底の真ん中が基準、高さ 280。お猪口：底の真ん中が基準、高さ 124
const TOKKURI = "M-30,0 H30 Q20,6 18,18 V44 C18,96 94,126 94,196 C94,252 56,280 0,280 C-56,280 -94,252 -94,196 C-94,126 -18,96 -18,44 V18 Q-20,6 -30,0Z";
const OCHOKO = "M-70,0 C-66,60 -40,100 -24,108 H24 C40,100 66,60 70,0 A70,20 0 0 1 -70,0Z";
const RIM = [362, 275]; // お猪口の口の真ん中

function art() {
  const draw = anim(a("draw", 0, 650, IO), a("fill", 450, 300));
  const tokkuri = `<g style="transform-origin:180px 348px;${anim(a("pour", 650, 800, IO))}">
    <g transform="translate(180,424) scale(.95) translate(0,-280)">
      <path class="ln-d" pathLength="1" d="${TOKKURI}" stroke-width="25.3" style="fill:var(--ln-tint);${INK};${draw}"/>
      <path class="ln-d" pathLength="1" d="M-62,140 C-30,152 30,152 62,140" fill="none" stroke-width="15.2" stroke-opacity=".45" style="${INK};${anim(a("draw", 300, 450, IO))}"/>
    </g></g>`;
  const stream = `<path class="ln-d" pathLength="1" d="M300,172 C332,178 356,212 360,264" fill="none" stroke-width="14" stroke-opacity=".6" style="${INK};${anim(a("draw", 880, 200, "linear"), a("fade-out", 1180, 160))}"/>`;
  const rings = [0, 1, 2]
    .map(
      (i) =>
        `<ellipse cx="${RIM[0]}" cy="${RIM[1]}" rx="60" ry="16" fill="none" stroke-width="5" style="${INK};transform-box:fill-box;transform-origin:center;${anim(a("ring", 960 + i * 170, 560, "ease-out"))}"/>`,
    )
    .join("");
  const ochoko = `<g style="transform-origin:362px 424px;${anim(a("rise-in", 150, 560, BOUNCE))}"><g style="transform-origin:362px 424px;${anim(a("lift", 1400, 460, IO))}">
    <g transform="translate(362,424) scale(1.2) translate(0,-124)" stroke-width="20" stroke-linejoin="round" stroke-linecap="round" style="${INK}">
      <path d="M-22,108 v14 h44 v-14" style="fill:var(--ln-tint)"/>
      <path d="${OCHOKO}" style="fill:var(--ln-tint)"/>
      <ellipse rx="70" ry="20" style="fill:var(--ln-rim)"/>
      <g style="transform-box:fill-box;transform-origin:center;${anim(a("pop-in", 920, 380, BOUNCE))}">
        <ellipse rx="42" ry="11" fill="none" stroke-width="13"/><ellipse rx="15" ry="4" stroke="none" style="fill:var(--ln-ink)"/>
      </g>
    </g>${rings}</g></g>`;
  const sparks = `<g style="transform-origin:362px 150px;${anim(a("pop", 1500, 260), a("spark-out", 1760, 200, "ease-in"))}"><path d="M362,142 v-34 M322,154 l-22,-26 M402,154 l22,-26" fill="none" stroke-width="18" stroke-linecap="round" style="${INK}"/></g>`;
  const drops = [
    [-50, -70],
    [0, -96],
    [46, -64],
  ]
    .map(
      ([dx, dy], i) =>
        `<circle cx="${RIM[0]}" cy="${RIM[1] - 60}" r="${8 - i}" style="fill:var(--ln-ink);--dx:${dx}px;--dy:${dy}px;${anim(a("drip", 1520 + i * 40, 420, "cubic-bezier(.2,.6,.4,1)"))}"/>`,
    )
    .join("");
  return tokkuri + stream + ochoko + sparks + drops;
}

const NAME = [..."さけメモ"].map((c, i) => `<span style="${anim(a("hop", 1450 + i * 70, 420))}">${c}</span>`).join("");
const MARKUP = `<div class="ln-ct" style="${anim(a("fade-out", 1960, 200))}">
  <div class="ln-icon" style="${anim(a("zoom-out", 1900, 320, "ease-in"))}"><svg viewBox="0 0 512 512" stroke-linecap="round">${art()}</svg></div>
  <div class="ln-name">${NAME}</div></div>`;

export default function LaunchScreen() {
  return <div className="launch" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}

/**
 * 起動画面を「開いたときの1回だけ」にするための小さなスクリプト。<head> で描画より先に読む。
 * - 同じ起動のあいだに読み直し（画面ごとの読み込み）が起きても、sessionStorage の印を見て出さない
 * - 動きが終わったら html に data-launched を付け、起動画面の要素が作り直されても二度と動かさない
 * （iPhone のホーム画面から開いたとき、ボタンを押すたびに起動画面が出ることがあったため）
 */
export const LAUNCH_BOOT = `(function(){var r=document.documentElement;var done=function(){r.dataset.launched="1"};try{if(sessionStorage.getItem("sake-memo:launched"))done();else sessionStorage.setItem("sake-memo:launched","1")}catch(e){}document.addEventListener("animationend",function(e){if(e.animationName==="launch-out")done()});setTimeout(done,3200)})();`;
