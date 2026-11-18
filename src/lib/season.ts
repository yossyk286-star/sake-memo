/** いまが旬のお酒（月ごと）。調べる画面の上のカードに使う（7）。文言は tr() で訳せるよう日本語のまま持つ */
export type Season = { title: string; body: string; queries: [string, string] };

const SEASONS: Record<number, Season> = {
  1: { title: "寒造りの新酒", body: "冬のしぼりたてやにごり酒が出まわる時期です。", queries: ["しぼりたて", "にごり酒"] },
  2: { title: "寒造りの最盛期", body: "一年でいちばん酒造りが盛んな頃。吟醸酒が気になります。", queries: ["純米大吟醸", "吟醸酒"] },
  3: { title: "春のにごり・生酒", body: "ひなまつりや春の訪れに、にごりや生酒が合います。", queries: ["にごり酒", "生酒"] },
  4: { title: "お花見の一杯", body: "桜の季節は、華やかな吟醸酒が似合います。", queries: ["純米吟醸", "桜のお酒"] },
  5: { title: "初夏の生酒", body: "新緑のころは、さわやかな生酒や生貯蔵酒が飲みやすい頃です。", queries: ["生酒", "生貯蔵酒"] },
  6: { title: "夏酒のはじまり", body: "軽くて酸のある夏酒や、梅酒がおいしい季節です。", queries: ["夏酒", "梅酒"] },
  7: { title: "冷たく飲む夏酒", body: "よく冷やして、氷やソーダで割るのも楽しい頃です。", queries: ["夏酒", "スパークリング日本酒"] },
  8: { title: "暑い夜の冷酒", body: "軽やかな冷酒やスパークリングを、のどごしよく。", queries: ["生貯蔵酒", "スパークリング日本酒"] },
  9: { title: "ひやおろしの季節", body: "夏を越えて熟した、秋のひやおろしが出まわり始めます。", queries: ["ひやおろし", "秋あがり"] },
  10: { title: "秋あがり", body: "まろやかな旨みがのってくる時期です。燗酒もおいしくなります。", queries: ["ひやおろし", "純米酒"] },
  11: { title: "しぼりたて新酒・ボジョレー", body: "秋に搾ったばかりのお酒が出ます。ボジョレー・ヌーヴォーは{0}月{1}日解禁です。", queries: ["しぼりたて", "ボジョレー"] },
  12: { title: "年末年始の乾杯", body: "大吟醸やスパークリングで乾杯。寒い夜は燗酒も。", queries: ["大吟醸", "燗酒"] },
};

/** ボジョレー・ヌーヴォーの解禁日（11月の第3木曜日） */
export function beaujolaisDay(year: number) {
  const first = new Date(year, 10, 1).getDay(); // 0=日 … 4=木
  return 1 + ((4 - first + 7) % 7) + 14;
}

export function seasonNow(now = new Date()): { month: number; season: Season; args: number[] } {
  const month = now.getMonth() + 1;
  return { month, season: SEASONS[month], args: month === 11 ? [11, beaujolaisDay(now.getFullYear())] : [] };
}
