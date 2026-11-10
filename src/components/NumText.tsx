import { Fragment } from "react";

/** 数字と、すぐ後ろの単位を見つける（「16%」「1,200円」「¥900」「3杯」「15.5g」など） */
const NUM = /(¥?)(\d[\d,]*(?:\.\d+)?)(\s?(?:%|円|杯|g|ml|mL|℃|°C|°|分|秒|cc|県|か国|軒|種類?|件|年|kg|L)(?![A-Za-z]))?/g;

/** 文の中の数字だけ丸い書体に、単位はひと回り小さく薄く出す */
export default function NumText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(NUM)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(
      <Fragment key={i}>
        {m[1] && <span className="unit">{m[1]}</span>}
        <span className="num">{m[2]}</span>
        {m[3] && <span className="unit">{m[3]}</span>}
      </Fragment>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
