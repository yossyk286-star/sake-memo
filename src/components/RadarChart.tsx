import { tr, trv } from "@/lib/i18n";
/** 比べる2つの色（1つ目はアプリの色、2つ目は見分けやすい暖色）。ダークモードでも見えるよう CSS の変数を使う */
export const SERIES_COLORS = ["var(--accent)", "var(--compare)"];

export type RadarSeries = { label: string; values: (number | null)[] };

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 100;
const MAX = 5;

function point(i: number, n: number, value: number) {
  // 1つ目の軸を真上に置き、時計回りに並べる
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
  // いちばん内側の輪を 0（未入力）にして、1〜5 をその外側に並べる。
  // 未入力の軸があっても中心まで尖らず、五角形の形のまま見られる
  const r = (RADIUS * (value + 1)) / (MAX + 1);
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)] as const;
}

const toPoints = (ps: (readonly [number, number])[]) => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** 1〜5 の評価を多角形のグラフで重ねる。未入力の軸はいちばん内側の輪（0）に置く */
export default function RadarChart({ axes, series }: { axes: string[]; series: RadarSeries[] }) {
  const n = axes.length;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{ maxWidth: 360, display: "block", margin: "0 auto", overflow: "visible" }}
      role="img"
      aria-label={series
        .map((s) => `${tr(s.label)}：${axes.map((a, i) => `${tr(a)}${s.values[i] ?? tr("未入力")}`).join(tr("、"))}`)
        .join(tr("。"))}
    >
      {[0, 1, 2, 3, 4, 5].map((level) => (
        <polygon
          key={level}
          points={toPoints(axes.map((_, i) => point(i, n, level)))}
          fill="none"
          stroke="var(--line)"
          strokeWidth={level === MAX ? 1.5 : 1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, n, MAX);
        return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--line)" />;
      })}
      {series.map((s, si) => {
        const color = SERIES_COLORS[si % SERIES_COLORS.length];
        const ps = s.values.map((v, i) => point(i, n, v ?? 0));
        return (
          <g key={si}>
            <polygon points={toPoints(ps)} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
            {/* 角ごとに点を打つ（未入力の角も内側の輪の上に） */}
            {ps.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3.5} fill={color} />
            ))}
          </g>
        );
      })}
      {axes.map((a, i) => {
        // 軸名はいちばん外の角から外向きに少し離し、角の向きに合わせて寄せる（点と重ならないように）
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const [px, py] = point(i, n, MAX);
        const x = px + cos * 10;
        const y = py + sin * 10;
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        const baseline = sin < -0.3 ? "auto" : sin > 0.3 ? "hanging" : "middle";
        // どの記録にも入っていない軸は、名前を薄くする
        const empty = series.every((s) => !s.values[i]);
        return (
          <text key={a} x={x} y={y} textAnchor={anchor} dominantBaseline={baseline} fontSize="13" fill={empty ? "var(--muted)" : "var(--text)"}>
            {trv(a)}
          </text>
        );
      })}
    </svg>
  );
}
