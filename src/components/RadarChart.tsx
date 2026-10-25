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
  const r = (RADIUS * value) / MAX;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)] as const;
}

const toPoints = (ps: (readonly [number, number])[]) => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** 1〜5 の評価を多角形のグラフで重ねる。未入力の軸は中心に置く */
export default function RadarChart({ axes, series }: { axes: string[]; series: RadarSeries[] }) {
  const n = axes.length;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{ maxWidth: 360, display: "block", margin: "0 auto" }}
      role="img"
      aria-label={series
        .map((s) => `${s.label}：${axes.map((a, i) => `${a}${s.values[i] ?? "未入力"}`).join("、")}`)
        .join("。")}
    >
      {[1, 2, 3, 4, 5].map((level) => (
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
            {ps.map(([x, y], i) =>
              s.values[i] ? <circle key={i} cx={x} cy={y} r={3.5} fill={color} /> : null,
            )}
          </g>
        );
      })}
      {axes.map((a, i) => {
        const [x, y] = point(i, n, MAX + 1.1);
        return (
          <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="var(--text)">
            {a}
          </text>
        );
      })}
    </svg>
  );
}
