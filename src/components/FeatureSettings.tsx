"use client";

import { saveFeatures, useFeatures, type Features } from "@/lib/features";
import { tr, trv } from "@/lib/i18n";

type BoolKey = { [K in keyof Features]: Features[K] extends boolean ? K : never }[keyof Features];

/** オン・オフの1行（右に iPhone の設定のようなスイッチ） */
export function SwitchRow({ k, label, note }: { k: BoolKey; label: string; note?: string }) {
  const f = useFeatures();
  const on = f[k];
  return (
    <button type="button" role="switch" aria-checked={on} className="switch-row" onClick={() => saveFeatures({ [k]: !on })}>
      <span className="switch-text">
        <span>{trv(label)}</span>
        {note && <small className="muted">{trv(note)}</small>}
      </span>
      <span className="switch" aria-hidden="true" />
    </button>
  );
}

/** いくつかから1つ選ぶ行 */
function Choice<K extends keyof Features>({ k, label, options, note }: { k: K; label: string; options: { id: Features[K]; label: string }[]; note?: string }) {
  const f = useFeatures();
  return (
    <div className="setting-row">
      <span>{trv(label)}</span>
      <div className={`mode-switch${options.length === 3 ? " three" : ""}`} role="group" aria-label={trv(label)}>
        {options.map((o) => (
          <button key={String(o.id)} type="button" aria-pressed={f[k] === o.id} onClick={() => saveFeatures({ [k]: o.id } as Partial<Features>)}>
            {trv(o.label)}
          </button>
        ))}
      </div>
      {note && <p className="muted">{trv(note)}</p>}
    </div>
  );
}

/** 記録の入力で隠せる欄（RecordForm の hidden と同じ名前） */
export const FIELDS: { id: string; label: string }[] = [
  { id: "maker", label: "蔵元・醸造所" },
  { id: "origin", label: "産地" },
  { id: "menuNote", label: "お店の説明" },
  { id: "serve", label: "飲み方" },
  { id: "serveNote", label: "飲み方メモ" },
  { id: "flavors", label: "感じた味" },
  { id: "ratings", label: "味の5段階" },
  { id: "pairing", label: "合わせた料理" },
  { id: "abv", label: "度数" },
  { id: "price", label: "値段" },
  { id: "memo", label: "メモ" },
  { id: "photos", label: "写真" },
];

/** 見た目のカードに足す行（書体・詰め具合） */
export function LookExtras() {
  return (
    <>
      <Choice
        k="font"
        label="書体"
        options={[
          { id: "gothic", label: "ゴシック" },
          { id: "round", label: "丸ゴシック" },
          { id: "mincho", label: "明朝" },
        ]}
      />
      <Choice
        k="density"
        label="一覧の詰め具合"
        options={[
          { id: "comfy", label: "ゆったり" },
          { id: "compact", label: "ぎっしり" },
        ]}
        note="「ぎっしり」は写真を小さくして、1画面に多く並べます。"
      />
    </>
  );
}

/** 操作のカード（開いたときの画面・利き手） */
export function UseSettings() {
  return (
    <section className="card" style={{ gap: 14 }}>
      <Choice
        k="start"
        label="開いたときの画面"
        options={[
          { id: "records", label: "記録" },
          { id: "scan", label: "調べる" },
          { id: "last", label: "前の画面" },
        ]}
      />
      <Choice
        k="hand"
        label="利き手"
        options={[
          { id: "right", label: "右手" },
          { id: "left", label: "左手" },
        ]}
        note="「左手」は「記録する」と「調べる」のボタンを左に寄せます。"
      />
    </section>
  );
}

/** 記録のカード（点数・使う欄・♥・2回目・診断・残りメーター） */
export function RecordSettings() {
  const f = useFeatures();
  const toggleField = (id: string) =>
    saveFeatures({ hidden: f.hidden.includes(id) ? f.hidden.filter((x) => x !== id) : [...f.hidden, id] });
  return (
    <section className="card" style={{ gap: 14 }}>
      <Choice
        k="scale"
        label="点数の見せ方"
        options={[
          { id: "star5", label: "★5" },
          { id: "ten", label: "10点" },
          { id: "hundred", label: "100点" },
        ]}
        note="入れるときは★のまま。一覧や詳細の数字だけ変わります。"
      />
      <div className="setting-row">
        <span>{tr("記録で使う欄")}</span>
        <div className="chip-wrap" role="group" aria-label={tr("記録で使う欄")}>
          {FIELDS.map((x) => (
            <button key={x.id} type="button" className="chip" aria-pressed={!f.hidden.includes(x.id)} onClick={() => toggleField(x.id)}>
              {trv(x.label)}
            </button>
          ))}
        </div>
        <p className="muted">{tr("外した欄は記録の入力に出しません（入れた内容は消えません）。")}</p>
      </div>
      <div className="switch-list">
        <SwitchRow k="favorites" label="♥ また飲みたい" note="記録に♥を付けて、一覧で絞り込めます" />
        <SwitchRow k="repeatTag" label="「2回目」の印" note="同じ名前のお酒を何回目か一覧に出します" />
        <SwitchRow k="tasteQuiz" label="好み診断" note="記録が少ないうちは8問で好みを決めます" />
        <SwitchRow k="meter" label="家のお酒の残りメーター" />
      </div>
      {f.meter && (
        <Choice
          k="pour"
          label="家で1回に注ぐ量"
          options={[
            { id: 60, label: "60ml" },
            { id: 90, label: "90ml" },
            { id: 180, label: "180ml" },
          ]}
        />
      )}
    </section>
  );
}

/** 飲みすぎの目安（相棒のカードに足す） */
export function LimitSetting() {
  return (
    <Choice
      k="limit"
      label="1日の飲みすぎの目安"
      options={[
        { id: 20, label: "20g" },
        { id: 40, label: "40g" },
        { id: 60, label: "60g" },
      ]}
      note="純アルコールの量。超えると相棒が心配します（日本酒1合で約22g）。"
    />
  );
}

/** 動きのカード */
export function MotionSettings() {
  return (
    <section className="card switch-list">
      <SwitchRow k="listStagger" label="一覧が順に浮かぶ" />
      <SwitchRow k="starWave" label="★が左から灯る" />
      <SwitchRow k="numRoll" label="点数がくるっと回る" />
      <SwitchRow k="barGrow" label="好みの棒が伸びる" />
      <SwitchRow k="radarMorph" label="くらべるの五角形が形を変える" />
      <SwitchRow k="fabShrink" label="スクロールで「記録する」が縮む" />
      <SwitchRow k="rowCollapse" label="消した行が縮んで詰まる" />
      <SwitchRow k="fieldShake" label="入れ忘れた欄が揺れる" />
      <SwitchRow k="parallax" label="詳細の写真がゆっくり動く" />
      <SwitchRow k="photoTint" label="詳細の色を写真から取る" />
      <SwitchRow k="shopCapsule" label="今日のお店を上に出す" note="調べる画面で入れたお店と、今夜の杯数" />
    </section>
  );
}
