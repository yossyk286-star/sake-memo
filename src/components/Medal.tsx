import { useId } from "react";

/** 地金の色。hi＝光の当たる所、mid＝地、lo＝彫り込みの影 */
/**
 * 称号は10段。隣どうしの色が似ないように、木→緑青→銅→銀→金→プラチナ（うす紫の光）→ダイヤ（水色）→ルビー→黒金→虹。
 * しるしは銅〜ダイヤの5段なので BADGE_FROM ずらして使う。
 * face は内側の地の色（黒金のように、ふちと地の色が違うとき）、ink は彫った線の色、rainbow は地を虹色にする
 */
type Metal = { hi: string; mid: string; lo: string; sheen?: string; facets?: boolean; face?: [string, string]; ink?: string; rainbow?: boolean };
const METALS: Metal[] = [
  { hi: "#fbf3e4", mid: "#e6d3ad", lo: "#9a7e52" }, // 白木
  { hi: "#d5efe6", mid: "#62a594", lo: "#225a4d" }, // 緑青（青銅）
  { hi: "#f7c8a5", mid: "#c86c3a", lo: "#6a2c10" }, // 銅
  { hi: "#f4f5f7", mid: "#bcc1c8", lo: "#6b727c" }, // 銀
  { hi: "#f6e3a6", mid: "#cfa548", lo: "#7c5a14" }, // 金
  { hi: "#ffffff", mid: "#d8d2ef", lo: "#564a86", sheen: "#f1ecff" }, // プラチナ（うす紫の白い光）
  { hi: "#ffffff", mid: "#cfeaf7", lo: "#2f5f7e", facets: true }, // ダイヤモンド（面に光の切り子）
  { hi: "#ffd0d8", mid: "#d02c4c", lo: "#5a0c1c", sheen: "#ff9db0" }, // ルビー
  { hi: "#f6e3a6", mid: "#cfa548", lo: "#6b4c10", face: ["#3b3327", "#0e0c08"], ink: "#e3bf5c" }, // 黒金（金のふちに黒い地）
  { hi: "#ffffff", mid: "#e9e4f7", lo: "#6c6a8e", rainbow: true, ink: "#4b4870" }, // 虹
];
/** しるしの段 0（銅）が METALS の何番目か */
export const BADGE_FROM = 2;
const LOCKED: Metal = { hi: "#f1f1f4", mid: "#d9d9df", lo: "#a5a5ae" };

/** 彫り込む絵（24×24 の線画）。fill を付けたものは塗りで彫る */
const ICONS: Record<string, { d: string; fill?: string }> = {
  sprout: { d: "M12 21v-8M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 11c0-3 2-5 6-5 0 3-2 5-6 5z" },
  pin: { d: "M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11zM12 8a2 2 0 1 0 0 4 2 2 0 1 0 0-4z" },
  map: { d: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" },
  compass: { d: "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM15.5 8.5l-2 5-5 2 2-5z" },
  train: { d: "M7 3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM4 10h16M8 21l2-4M16 21l-2-4M8 13.5h.01M16 13.5h.01" },
  plane: { d: "M3 12l18-8-5 17-4-7zM12 14l9-10" },
  globe: { d: "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" },
  tokkuri: { d: "M9.5 3h5M10.5 3v3c0 1.5-4.5 4-4.5 9a6 6 0 0 0 12 0c0-5-4.5-7.5-4.5-9V3" },
  wine: { d: "M8 3h8l-.5 5a3.5 3.5 0 0 1-7 0zM12 11.5V20M8.5 20.5h7" },
  beer: { d: "M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM15 11h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2M5 8c0-2 2-3 3.5-2 1-1.5 4-1.5 5 0 1.5 0 2 1 1.5 2M8.5 11v6M11.5 11v6" },
  whisky: { d: "M5 6h14l-1.5 13a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2zM5.8 12h12.4M9 14.5h3v3H9z" },
  choko: { d: "M4 9h16l-2 8a3 3 0 0 1-3 2.5H9A3 3 0 0 1 6 17zM8 13a4 1.5 0 0 0 8 0" },
  all: { d: "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z" },
  star: { d: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" },
  lantern: { d: "M9 3h6M12 3v2M7 8c0-2 2-3 5-3s5 1 5 3v7c0 2-2 3-5 3s-5-1-5-3zM7 11.5h10M9 18v2h6v-2" },
  store: { d: "M3 9l2-5h14l2 5M3 9h18M3 9c0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0M5 12v9h14v-9M10 21v-5h4v5" },
  home: { d: "M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6" },
  camera: { d: "M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z" },
  moon: { d: "M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z" },
  cups: { d: "M2.5 10h5.5l-.8 7H3.3zM9.25 10h5.5l-.8 7h-3.9zM16 10h5.5l-.8 7h-3.9zM2 20h20" },
  food: { d: "M3.5 12h17a8.5 8.5 0 0 1-17 0zM9 20.5h6M13 3l-2.5 7M19.5 4l-5 6" },
  bean: { d: "M12 3c4.5 0 7 4 7 9s-2.5 9-7 9-7-4-7-9 2.5-9 7-9zM12 3.5c-2.5 4 2.5 8.5 0 17" },
  "bean-half": { d: "M12 3c4.5 0 7 4 7 9s-2.5 9-7 9-7-4-7-9 2.5-9 7-9zM12 3.5c-2.5 4 2.5 8.5 0 17M7 9h4M6 12h5M7 15h4" },
  "bean-full": { d: "M12 3c4.5 0 7 4 7 9s-2.5 9-7 9-7-4-7-9 2.5-9 7-9zM12 3.5c-2.5 4 2.5 8.5 0 17", fill: "lo" },
  beans: { d: "M7 4c2.5 0 4 2.2 4 5s-1.5 5-4 5-4-2.2-4-5 1.5-5 4-5zM17 4c2.5 0 4 2.2 4 5s-1.5 5-4 5-4-2.2-4-5 1.5-5 4-5zM12 11c2.5 0 4 2.2 4 5s-1.5 5-4 5-4-2.2-4-5 1.5-5 4-5zM7 4.5c-1 1.5 1 3 0 9M17 4.5c-1 1.5 1 3 0 9M12 11.5c-1 1.5 1 3 0 9" },
  dripper: { d: "M8 3h8M4.5 6h15l-4.5 8H9zM9.5 14v2h5v-2M5 20h14M15 16v4" },
  cherry: { d: "M8 14.5a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM16.5 13.5a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM8 14.5c1-5 3-8 7-11M16.5 13.5c-1-4-1.5-7-1.5-10M15 3.5c2.5 0 4.5 1 5.5 3-2.5 0-4.5-1-5.5-3z" },
  cup: { d: "M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4" },
  sun: { d: "M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" },
};

/**
 * 金属のメダル。真ん中のくぼみに絵（icon）か数字（text）を彫り込んだように描く。
 * metal は 0〜4（銅・銀・金・プラチナ・ダイヤモンド）。locked はまだ取っていないもの（灰色でうすく）
 */
export default function Medal({
  metal = 2,
  icon,
  text,
  size = 56,
  locked = false,
  shine = false,
}: {
  metal?: number;
  icon?: string;
  text?: string;
  size?: number;
  locked?: boolean;
  shine?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const c: typeof LOCKED = locked ? LOCKED : METALS[Math.max(0, Math.min(METALS.length - 1, metal))];
  const art = icon ? ICONS[icon] : undefined;
  const ink = locked ? 0.55 : 1;
  // 彫った線：右下に光（hi）、その上に影（lo）を重ねて、くぼんで見せる
  const carve = (dx: number, color: string, opacity: number) =>
    art ? (
      <path
        d={art.d}
        transform={`translate(${27 + dx} ${27 + dx}) scale(1.92)`}
        fill={art.fill ? color : "none"}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    ) : (
      <text x={50 + dx} y={61 + dx} textAnchor="middle" fontSize={text && text.length > 2 ? 26 : 32} fontWeight={800} fill={color} opacity={opacity} fontFamily="Georgia, 'Times New Roman', serif">
        {text}
      </text>
    );
  return (
    <svg className={`medal${shine ? " medal-shine" : ""}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.hi} />
          <stop offset="0.5" stopColor={c.mid} />
          <stop offset="1" stopColor={c.lo} />
        </linearGradient>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="1" y2="1">
          {c.rainbow ? (
            ["#ffb3c7", "#ffd9a0", "#fff3a8", "#b9f0c6", "#a9dcff", "#cdb8ff"].map((col, i) => <stop key={col} offset={i / 5} stopColor={col} />)
          ) : c.face ? (
            <>
              <stop offset="0" stopColor={c.face[0]} />
              <stop offset="1" stopColor={c.face[1]} />
            </>
          ) : (
            <>
              <stop offset="0" stopColor={c.mid} />
              <stop offset="0.6" stopColor={c.hi} />
              <stop offset="1" stopColor={c.mid} />
            </>
          )}
        </linearGradient>
        <clipPath id={`c${id}`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      {/* ふち（外側は光る向き、内側は影の向きにして段差をつける） */}
      <circle cx="50" cy="50" r="47" fill={`url(#r${id})`} />
      <circle cx="50" cy="50" r="47" fill="none" stroke={c.lo} strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="50" cy="50" r="38.5" fill={c.lo} opacity="0.55" />
      <circle cx="50" cy="50" r="37.5" fill={`url(#f${id})`} />
      {/* プラチナは斜めに白い光の帯、ダイヤモンドは切り子の面を重ねる */}
      {c.sheen && (
        <g clipPath={`url(#c${id})`} opacity="0.75">
          <path d="M8 70 L70 8 L84 8 L22 84Z" fill={c.sheen} />
          <path d="M30 92 L92 30 L96 36 L36 96Z" fill="#fff" opacity="0.8" />
        </g>
      )}
      {c.facets && (
        <g opacity="0.9">
          <polygon points="50,12.5 76.5,23.5 50,50" fill="#ffffff" opacity="0.55" />
          <polygon points="76.5,23.5 87.5,50 50,50" fill="#bfe4f5" opacity="0.6" />
          <polygon points="87.5,50 76.5,76.5 50,50" fill="#e9f7fd" opacity="0.5" />
          <polygon points="76.5,76.5 50,87.5 50,50" fill="#a9d7ee" opacity="0.55" />
          <polygon points="50,87.5 23.5,76.5 50,50" fill="#ffffff" opacity="0.45" />
          <polygon points="23.5,76.5 12.5,50 50,50" fill="#c6e8f7" opacity="0.6" />
          <polygon points="12.5,50 23.5,23.5 50,50" fill="#f2fbff" opacity="0.7" />
          <polygon points="23.5,23.5 50,12.5 50,50" fill="#b3def2" opacity="0.5" />
          <circle cx="50" cy="50" r="37.5" fill="none" stroke="#7fb8d6" strokeWidth="0.8" />
        </g>
      )}
      {/* ふちの細い線（打刻のふちどり） */}
      <circle cx="50" cy="50" r="42.5" fill="none" stroke={c.hi} strokeOpacity="0.7" strokeWidth="0.8" strokeDasharray="1.2 2.2" />
      {carve(0.7, c.face ? "#000" : c.hi, 0.9 * ink)}
      {carve(0, c.ink ?? c.lo, ink)}
      {shine && !locked && (
        <g clipPath={`url(#c${id})`}>
          <rect className="medal-glint" x="-30" y="-10" width="14" height="130" fill="#fff" opacity="0.35" transform="rotate(25 50 50)" />
        </g>
      )}
    </svg>
  );
}

/** 称号の段のメダル（銅→銀→金→白金→古金）。真ん中にアプリのしるしを彫る */
export function TitleMedal({ tier, emblem, size = 64, locked = false, shine = false }: { tier: number; emblem: string; size?: number; locked?: boolean; shine?: boolean }) {
  return <Medal metal={tier} icon={emblem} size={size} locked={locked} shine={shine} />;
}

/** 称号の名前の下線を、その段の地金の色にする */
export function plateStyle(tier: number): React.CSSProperties {
  const m = METALS[Math.max(0, Math.min(METALS.length - 1, tier))];
  return { borderColor: m.mid };
}
