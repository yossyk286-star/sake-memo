import { getLang } from "./i18n";

/** 案内の文。ja / en をそのまま持つ（文が長いので en.json には入れない） */
export type Text = { ja: string; en: string };

export const t = (x: Text) => (getLang() === "en" ? x.en : x.ja);


/** 初めて開いたときのあいさつ。このあと画面の上で案内（TOURS.home）に進む */
export const WELCOME = {
  title: { ja: "さけメモへようこそ", en: "Welcome to Sake Memo" },
  body: {
    ja: "飲んだお酒を記録して、だんだん詳しくなるアプリです。記録はこの端末の中だけに保存されます。どこを押すとどうなるか、画面で案内しますね。",
    en: "Record what you drink and learn as you go. Your records stay on this device. Let me show you around the screen.",
  },
};

/** 画面の上で、実際のボタンを光らせて矢印と吹き出しで案内する。target は data-tour の値 */
export type TourStep = { target: string; text: Text };
export type TourId = "home" | "scan" | "glossary" | "wishlist" | "taste" | "settings";
/** label は使い方ページの「もう一度見る」ボタンの名前 */
export const TOURS: Record<TourId, { path: string; label: Text; steps: TourStep[] }> = {
  home: {
    path: "/",
    label: { ja: "記録", en: "Records" },
    steps: [
      { target: "fab", text: { ja: "飲んだらここを押して記録します。名前と★だけでも保存できます。", en: "Tap here after a drink to record it. A name and stars are enough." } },
      { target: "tab-scan", text: { ja: "お店ではここ。メニューやラベルを撮ると、お酒ごとの解説とおすすめが出ます。", en: "At a bar, tap here. Shoot a menu or label to get notes and picks for each drink." } },
      { target: "tab-wishlist", text: { ja: "「☆」を付けた気になるお酒は、ここにたまります。", en: "Drinks you star (☆) collect here." } },
      { target: "tab-taste", text: { ja: "味マップ・産地スタンプ・店員さんに見せる画面はここから。", en: "Your taste map, origin stamps and the staff screen are here." } },
      { target: "settings", text: { ja: "使い方とバックアップは、いつでもここ（設定）から。", en: "The guide and backups are always here in Settings." } },
    ],
  },
  scan: {
    path: "/scan",
    label: { ja: "調べる", en: "Explore" },
    steps: [
      { target: "scan-shoot", text: { ja: "ここを押してメニューやラベルを撮ると、お酒ごとに解説とおすすめの飲み方が出ます。", en: "Tap here to shoot a menu or label. You'll get notes and serving tips for each drink." } },
      { target: "scan-photo", text: { ja: "撮ってある写真からも読み取れます（5枚まで）。", en: "You can also read photos you already took (up to 5)." } },
      { target: "scan-text", text: { ja: "名前を打って調べることもできます。", en: "Or type a name to look it up." } },
      { target: "scan-food", text: { ja: "料理のメニューを撮ると、料理ごとに合うお酒が出ます。", en: "Shoot the food menu to see drinks that go with each dish." } },
      { target: "scan-show", text: { ja: "好みを大きな字で出して、店員さんに見せられます。", en: "Show your taste in large type to the staff." } },
    ],
  },
  glossary: {
    path: "/glossary",
    label: { ja: "辞典", en: "Glossary" },
    steps: [
      { target: "g-search", text: { ja: "言葉を打って探せます。辞典にない言葉は、調べて辞典に足せます。", en: "Type a word to find it. Words that aren't here can be looked up and added." } },
      { target: "g-filter", text: { ja: "種類や飲み方でしぼり込めます。", en: "Narrow down by type or serving style." } },
      { target: "g-quiz", text: { ja: "毎日1問のクイズで、少しずつ覚えられます。", en: "A daily quiz helps you learn a little at a time." } },
    ],
  },
  wishlist: {
    path: "/wishlist",
    label: { ja: "気になる", en: "Want" },
    steps: [
      { target: "wish-item", text: { ja: "調べる画面で「☆」を付けたお酒が、ここにたまります。押すと説明が開き、右の「＋」でそのまま記録できます。", en: "Drinks you star (☆) while exploring collect here. Tap one for notes, or “+” to record it." } },
      { target: "wish-sort", text: { ja: "種類で分けたり、甘口・辛口の順に並べ替えたりできます。", en: "Filter by type, or sort from sweet to dry." } },
    ],
  },
  taste: {
    path: "/taste",
    label: { ja: "好み", en: "Taste" },
    steps: [
      { target: "taste-view", text: { ja: "「わたしの傾向」は味の好み、「マイコレクション」は称号やスタンプ帳・お店・気になる・家のお酒です。", en: "“My trends” shows your taste; “My collection” has badges, stamps, shops, your Want list and bottles at home." } },
      { target: "taste-show", text: { ja: "好みを大きな字で出して、お店で見せられます。友だちと好みくらべもできます。", en: "Show your taste in large type at the shop, or compare tastes with a friend." } },
      { target: "taste-sort", text: { ja: "並ぶ順番は「並べ替え」で好きに変えられます。", en: "Use “Reorder” to change the order of sections." } },
    ],
  },
  settings: {
    path: "/settings",
    label: { ja: "設定", en: "Settings" },
    steps: [
      { target: "set-guide", text: { ja: "使い方と、この画面の案内の見直しはここから。", en: "Open the guide and replay these tips here." } },
      { target: "set-look", text: { ja: "明るさ・文字の大きさ・テーマ色を変えられます。", en: "Change brightness, text size and theme color." } },
      { target: "set-backup", text: { ja: "記録はこの端末の中だけ。ときどき「書き出す」で残しておくと安心です。", en: "Records stay on this device only. Export them now and then to be safe." } },
    ],
  },
};

/** 案内を始めるイベント。detail に TourId */
export const TOUR_EVENT = "app:start-tour";
export function startTour(id: TourId) {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: id }));
}
