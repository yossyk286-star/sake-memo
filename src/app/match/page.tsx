"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Suspense, useEffect, useMemo, useState } from "react";
import BuddyFace from "@/components/BuddyFace";
import RadarChart from "@/components/RadarChart";
import { APP, favToWish, favView } from "@/lib/appeal";
import { TASTE_AXES } from "@/lib/axes";
import { listRecords, listWishes, putWish } from "@/lib/db";
import { tr, trJoin } from "@/lib/i18n";
import { compare, hasTaste, loadMyName, matchUrl, myCard, readCard, saveMyName, tasteVector } from "@/lib/match";
import type { TastingRecord } from "@/lib/types";

const AXES = TASTE_AXES.map(([a]) => a);

/** 送られてきた好みと自分の好みを重ねる */
function Compare({ name, card, records }: { name: string; card: NonNullable<ReturnType<typeof readCard>>; records: TastingRecord[] }) {
  const mine = useMemo(() => tasteVector(records), [records]);
  const result = hasTaste(mine) ? compare(mine, card.t) : null;
  const [saved, setSaved] = useState<Set<string>>(new Set());
  useEffect(() => {
    listWishes().then((ws) => setSaved(new Set(ws.map((w) => w.name))));
  }, []);
  const who = name || tr("友だち");

  return (
    <>
      <section className="card match-hero">
        <span className="muted">{tr("{0} さん と あなた", who)}</span>
        {result ? (
          <>
            <span className="match-label">{tr("好みの相性")}</span>
            <strong className="match-score">
              {result.score}
              <small>%</small>
            </strong>
          </>
        ) : (
          <span className="match-label">{tr("{0} さんの好み", who)}</span>
        )}
        <RadarChart axes={AXES} series={result ? [{ label: "あなた", values: mine }, { label: who, values: card.t }] : [{ label: who, values: card.t }]} />
        {result && (
          <div className="match-legend">
            <span><i style={{ background: "var(--accent)" }} />{tr("あなた")}</span>
            <span><i style={{ background: "var(--compare)" }} />{who}</span>
          </div>
        )}
        {result && (
          <p className="match-note">
            {result.bothHigh.length > 0 && tr("ふたりとも「{0}」が強めなのが好き。", trJoin(result.bothHigh))}
            {result.bothLow.length > 0 && tr("ふたりとも「{0}」は控えめが好き。", trJoin(result.bothLow))}
            {result.differ &&
              (result.differ.more
                ? tr("{0} さんはあなたより「{1}」が強いほうが好み。", who, result.differ.axis)
                : tr("あなたは {0} さんより「{1}」が強いほうが好み。", who, result.differ.axis))}
            {!result.bothHigh.length && !result.bothLow.length && !result.differ && tr("好みの形がよく似ています。")}
          </p>
        )}
        {!result && (
          <p className="match-note">
            {records.length === 0
              ? tr("あなたも記録をつけると、{0} さんとの相性が出ます。", who)
              : tr("味（甘さ・酸味など）を入れた記録がもう少したまると、相性が出ます。")}
          </p>
        )}
      </section>

      {card.f.length > 0 && (
        <section className="card">
          <h2 className="match-h2">{result && result.score >= 70 ? tr("{0} さんの★4以上で、あなたも好きそう", who) : tr("{0} さんの★4以上", who)}</h2>
          <ul className="match-favs">
            {card.f.map((f) => {
              const v = favView(f);
              const on = saved.has(v.title);
              return (
                <li key={v.title}>
                  <div>
                    <strong>{v.title}</strong>
                    <span className="muted">{trJoin(v.sub)}</span>
                  </div>
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    disabled={on}
                    onClick={async () => {
                      await putWish(favToWish(f, tr("{0} さんのおすすめ", who)));
                      setSaved((s) => new Set(s).add(v.title));
                    }}
                  >
                    {on ? tr("☆ 気になるに入れました") : tr("☆ 気になる")}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {records.length === 0 ? (
        <Link href="/new" className="btn-primary">
          {tr("自分も記録してみる")}
        </Link>
      ) : (
        <Link href="/match" className="btn-secondary">
          {tr("自分の好みを送り返す")}
        </Link>
      )}
    </>
  );
}

/** 自分の好みをリンクと QR にする */
function Send({ records }: { records: TastingRecord[] }) {
  const [name, setName] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setName(loadMyName()), []);
  const card = useMemo(() => myCard(records), [records]);
  const ok = hasTaste(card.t);
  const url = useMemo(() => matchUrl(name || tr("わたし"), card, location.origin), [name, card]);
  useEffect(() => {
    if (!ok) return;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "L" }).then(setQr).catch(() => setQr(""));
  }, [url, ok]);

  if (!ok)
    return (
      <div className="buddy-empty">
        <BuddyFace mood="normal" size={72} />
        <strong>{tr("まだ好みが送れません")}</strong>
        <span>{tr("味（甘さ・酸味など）を入れた記録が2つ以上あると、好みとして送れます。")}</span>
        <div className="empty-actions">
          <Link href="/new" className="btn-primary">
            {tr("記録する")}
          </Link>
        </div>
      </div>
    );

  return (
    <>
      <p className="lead" style={{ padding: 0 }}>
        {tr("自分の好みをリンクで送ると、相手の画面で好みが重なって相性が出ます。相手がまだ記録していなくても見られます。")}
      </p>
      <section className="card">
        <label className="label" htmlFor="match-name">
          {tr("あなたの呼び名（相手に見えます）")}
        </label>
        <input
          id="match-name"
          className="input"
          type="text"
          maxLength={20}
          placeholder={tr("わたし")}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            saveMyName(e.target.value);
          }}
        />
        <RadarChart axes={AXES} series={[{ label: name || "わたし", values: card.t }]} showValues />
        {card.f.length > 0 && (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {tr("一緒に送る★4以上：{0}", card.f.map((f) => f[0]).join(tr("、")))}
          </p>
        )}
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {tr("送るのは味の平均と、★の高かった{0}の名前だけです。メモ・お店・日付は送りません。", tr("お酒"))}
        </p>
      </section>
      <button
        type="button"
        className="btn-primary"
        onClick={async () => {
          const text = tr("{0}の好み、くらべてみて", APP.name);
          if (navigator.share) {
            try {
              await navigator.share({ title: text, text, url });
              return;
            } catch (e) {
              if (e instanceof Error && e.name === "AbortError") return;
            }
          }
          await navigator.clipboard?.writeText(url).catch(() => {});
          setCopied(true);
        }}
      >
        {tr("LINE などで送る")}
      </button>
      {copied && <p className="muted" role="status">{tr("リンクをコピーしました")}</p>}
      {qr && (
        <section className="card match-qr">
          <span className="muted">{tr("となりの人には、この QR を読んでもらう")}</span>
          <div className="qr" role="img" aria-label={tr("好みのリンクの QR コード")} dangerouslySetInnerHTML={{ __html: qr }} />
        </section>
      )}
    </>
  );
}

function MatchBody() {
  const params = useSearchParams();
  const card = useMemo(() => readCard(params.get("d")), [params]);
  const name = (params.get("n") ?? "").slice(0, 20);
  const [records, setRecords] = useState<TastingRecord[] | null>(null);
  useEffect(() => {
    listRecords().then(setRecords);
  }, []);
  const broken = params.has("d") && !card;

  return (
    <>
      <header className="sub-header">
        <Link href={card ? "/" : "/taste"} className="back">
          {tr("‹ 戻る")}
        </Link>
        <h1>{card ? tr("好みくらべ") : tr("好みを送る")}</h1>
      </header>
      <main className="content" style={{ paddingTop: 16, paddingBottom: 110 }}>
        {broken && <p className="error">{tr("リンクが途中で切れているようです。もう一度送ってもらってください。")}</p>}
        {records && card && <Compare name={name} card={card} records={records} />}
        {records && !card && <Send records={records} />}
      </main>
    </>
  );
}

export default function MatchPage() {
  return (
    <Suspense>
      <MatchBody />
    </Suspense>
  );
}
