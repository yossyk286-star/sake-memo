import { getLang } from "./i18n";

/** 使い方の1項目。ja / en をそのまま持つ（文が長いので en.json には入れない） */
type Text = { ja: string; en: string };
export type GuideSection = { id: string; title: Text; where: Text; steps: Text[]; href?: string };

export const t = (x: Text) => (getLang() === "en" ? x.en : x.ja);

export const GUIDE: GuideSection[] = [
  {
    id: "record",
    title: { ja: "飲んだお酒を記録する", en: "Record a drink" },
    where: { ja: "記録タブの「＋ 記録する」", en: "Log tab → “Log it”" },
    href: "/new",
    steps: [
      { ja: "「かんたん」なら名前と★だけで保存できます。味や飲み方はあとから編集で足せます。", en: "In “Quick”, a name and stars are enough. You can add taste and serving later." },
      { ja: "上の「メニューやラベルを撮って読み取る」で撮ると、お酒の情報が入った状態で書けます。", en: "Shoot the menu or label at the top and the drink info is filled in for you." },
      { ja: "前に飲んだお酒は名前の候補に出て、選ぶと蔵元・産地と前回の★が出ます。", en: "Drinks you've had show up as name suggestions, with the maker, origin and your last rating." },
      { ja: "書きかけは自動で残ります。次に開くと「続きを書く」が出ます。", en: "Unfinished records are kept automatically. Next time, tap “Continue”." },
      { ja: "一覧の記録は左にスライドで削除、右にスライドで編集です。", en: "In the list, swipe left to delete and right to edit." },
    ],
  },
  {
    id: "scan",
    title: { ja: "お店でメニューやラベルを調べる", en: "Look up a menu or label" },
    where: { ja: "真ん中のカメラ（調べる）→「飲み物から」", en: "Center camera (Explore) → “Drinks”" },
    href: "/scan",
    steps: [
      { ja: "撮る・写真から（5枚まで）・文字で、のどれかで調べると、お酒ごとに解説とおすすめの飲み方が出ます。", en: "Shoot, pick up to 5 photos, or type a name to get notes and serving tips for each drink." },
      { ja: "好みに合いそうなお酒には「おすすめ」が付きます。食べている料理を入れると相性順にも並べられます。", en: "Drinks that suit your taste get a “Pick” tag. Enter a dish to sort by pairing." },
      { ja: "「＋記録」で記録へ、「☆」で気になるお酒に残せます。調べた一覧はその日のあいだ残ります。", en: "“+Log” starts a record and “☆” saves it to Want. The list stays for the day." },
      { ja: "電波がなくて読めなかった写真は取っておき、電波が戻ったら自動で読み取ります。", en: "Photos taken without signal are kept and read once you're back online." },
    ],
  },
  {
    id: "pair",
    title: { ja: "料理から合うお酒を選ぶ", en: "Choose by food" },
    where: { ja: "調べる →「料理から」", en: "Explore → “Food”" },
    href: "/pair",
    steps: [
      { ja: "料理のメニューを撮ると料理の一覧が出て、押すとその料理に合うお酒が出ます。", en: "Shoot the food menu, then tap a dish to see drinks that go with it." },
      { ja: "同じ日に飲み物のメニューも撮っていれば、そのメニューの中から合う順に選べます。", en: "If you also shot the drink menu today, it ranks drinks from that menu." },
    ],
  },
  {
    id: "show",
    title: { ja: "店員さんに好みを伝える", en: "Show your taste to staff" },
    where: { ja: "好みタブ・調べる画面の「店員さんに見せる」", en: "“Show the staff” on the Taste tab or Explore screen" },
    href: "/show",
    steps: [
      { ja: "★の高い記録から好みを大きな字で出します。「今日の気分」に切り替えもできます。", en: "Shows your taste in large type, based on your top-rated drinks. Switch to “Today's mood” too." },
      { ja: "「上下を逆にして相手に向ける」で、カウンター越しに見せられます。", en: "Tap “Flip it to face them” to turn it toward them." },
    ],
  },
  {
    id: "home",
    title: { ja: "家のお酒・気になるお酒", en: "My bottles & Want list" },
    where: { ja: "好みタブの「家のお酒」・気になるタブ", en: "Taste tab → “My bottles”, and the Want tab" },
    href: "/bottles",
    steps: [
      { ja: "買った瓶を登録しておくと、飲むたびに感想だけ書けば記録できます。", en: "Register a bottle you bought and just add your impressions each time you drink it." },
      { ja: "☆を付けたお酒は気になるタブにたまります。飲んだら「＋ 記録に追加」で記録へ。", en: "Starred drinks collect in Want. When you try one, tap “+ Add to log”." },
    ],
  },
  {
    id: "taste",
    title: { ja: "好みやスタンプを見る", en: "See your taste & stamps" },
    where: { ja: "好みタブ", en: "Taste tab" },
    href: "/taste",
    steps: [
      { ja: "味マップ・産地スタンプ帳・お店・くらべる（五角形の重ね合わせ）で、記録をふり返れます。", en: "Look back with the taste map, origin stamps, shops and compare (overlaid charts)." },
      { ja: "「わたしの好み」に好きな味を登録すると、おすすめや店員さんに見せる画面に使われます。", en: "Set “My taste” and it's used for picks and the staff screen." },
      { ja: "記録の画面の「AI に聞く」で、そのお酒のことを質問できます。", en: "Use “Ask AI” on a record to ask about that drink." },
    ],
  },
  {
    id: "match",
    title: { ja: "称号・しるし・友だちと好みくらべ", en: "Titles, badges & taste match" },
    where: { ja: "好みタブのいちばん上", en: "Top of the Taste tab" },
    href: "/match",
    steps: [
      { ja: "記録が増えると称号が上がり、10杯目・産地5か所などで「しるし」が取れます。取れたときはお祝いが出て、画像で送れます。", en: "Your title goes up as you log more, and you earn badges like 10 drinks or 5 origins. Each comes with a little celebration you can share." },
      { ja: "「友だちと好みくらべ」で自分の好みをリンクや QR で送ると、相手の画面で好みが重なり相性が出ます。送るのは味の平均と★の高かった名前だけです。", en: "“Taste match with a friend” sends your taste as a link or QR. Your friend sees both tastes overlaid with a match score. Only average taste and favorite names are sent." },
      { ja: "毎月はじめに、記録の画面の上に「先月のふりかえり」が出ます。", en: "At the start of each month, a recap of last month appears on the Log screen." },
    ],
  },
  {
    id: "glossary",
    title: { ja: "言葉を調べる", en: "Glossary" },
    where: { ja: "辞典タブ", en: "Glossary tab" },
    href: "/glossary",
    steps: [
      { ja: "お酒の言葉や飲み方を調べられます。ない言葉は AI で追加できます。毎日のクイズもあります。", en: "Look up drink terms and serving styles. Add missing words with AI, and try the daily quiz." },
    ],
  },
  {
    id: "passcode",
    title: { ja: "合言葉と AI", en: "Passcode & AI" },
    where: { ja: "はじめて撮るときに入力", en: "Entered the first time you shoot" },
    steps: [
      { ja: "読み取り・名前で調べる・AI に聞くは合言葉が必要です（AI を使うたびにお金がかかるため）。一度入れると覚えています。合言葉がなくても、記録・辞典・カクテル47種・よくある料理は使えます。", en: "Reading, name search and Ask AI need the passcode (AI costs money each time). It's remembered after the first time. Without it you can still log, use the glossary, 47 cocktails and common dishes." },
      { ja: "一度調べたお酒は端末に残るので、次からは AI を使わずにすぐ出ます。", en: "Drinks you've looked up are saved, so next time they show instantly without AI." },
    ],
  },
  {
    id: "data",
    title: { ja: "データとバックアップ", en: "Data & backup" },
    where: { ja: "設定の「バックアップ」", en: "Settings → “Backup”" },
    steps: [
      { ja: "記録はこの端末の中だけにあります。機種変更やもしものために、ときどき「書き出す」でファイルに残してください。", en: "Records live only on this device. Export now and then in case you change or lose your phone." },
      { ja: "新しい端末では「読み込む」で戻せます。", en: "On a new device, use “Import” to restore them." },
    ],
  },
];

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
export type TourId = "home" | "scan";
export const TOURS: Record<TourId, { path: string; steps: TourStep[] }> = {
  home: {
    path: "/",
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
    steps: [
      { target: "scan-shoot", text: { ja: "ここを押してメニューやラベルを撮ると、お酒ごとに解説とおすすめの飲み方が出ます。", en: "Tap here to shoot a menu or label. You'll get notes and serving tips for each drink." } },
      { target: "scan-photo", text: { ja: "撮ってある写真からも読み取れます（5枚まで）。", en: "You can also read photos you already took (up to 5)." } },
      { target: "scan-text", text: { ja: "名前を打って調べることもできます。", en: "Or type a name to look it up." } },
      { target: "scan-food", text: { ja: "料理のメニューを撮ると、料理ごとに合うお酒が出ます。", en: "Shoot the food menu to see drinks that go with each dish." } },
      { target: "scan-show", text: { ja: "好みを大きな字で出して、店員さんに見せられます。", en: "Show your taste in large type to the staff." } },
    ],
  },
};

/** 案内を始めるイベント。detail に TourId */
export const TOUR_EVENT = "app:start-tour";
export function startTour(id: TourId) {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: id }));
}
