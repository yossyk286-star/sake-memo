"use client";

import LineIcon from "@/components/LineIcon";
import BackChevron from "@/components/BackChevron";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { removeTally } from "@/lib/tally";
import MenuScan, { PickedDrink } from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import DraftNote from "@/components/DraftNote";
import { clearStash, loadStash, type Stash } from "@/lib/recordDraft";
import { stars } from "@/components/RecordCard";
import { deleteWish, getBottle, getWish, listBottles, listRecords } from "@/lib/db";
import { loadLastScan, markRecorded } from "@/lib/lastScan";
import { drinkToDraft, type ScannedDrink } from "@/lib/menuScan";
import { bestServeNote, serveNoteText } from "@/lib/serveNote";
import type { Bottle, RecordDraft, TastingRecord } from "@/lib/types";
import { tr } from "@/lib/i18n";
import BackLink from "@/components/BackLink";
import { backTarget, popTo } from "@/lib/nav";
import { addLater, getLater, removeLater } from "@/lib/later";
import { shrinkPhotos } from "@/lib/photo";
import { toast } from "@/lib/toast";

/** 保存したあと「来た画面へ戻る」ボタンの文字 */
function fromLabel(from: string) {
  const p = from.split("?")[0];
  if (p === "/scan") return tr("調べた結果へ戻る");
  if (p === "/pair") return tr("料理から選ぶへ戻る");
  if (p === "/wishlist") return tr("気になるお酒へ戻る");
  return tr("前の画面へ戻る");
}

/** 家のお酒から記録する画面。お酒の情報は登録したものを入れて、感想だけ書けばよいようにする */
function BottleRecord({ bottle, count, best }: { bottle: Bottle; count: number; best?: TastingRecord }) {
  const router = useRouter();
  return (
    <>
      <section className="tips" style={{ margin: "16px 16px 0" }}>
        <h2>{tr("家のお酒：{0}", bottle.name)}</h2>
        <p className="term-desc" style={{ margin: 0 }}>
          {tr("{0}回目の記録です。開けてからの味の変化も残しておくと面白いです。", count + 1)}
        </p>
        {best?.serveNote && (
          <p className="term-desc" style={{ margin: 0 }}>
            {tr(
              "このお酒でいちばん良かった回（{0}・{1}）の飲み方を入れています：{2}",
              stars(best.overall),
              best.serve ?? tr("飲み方未入力"),
              serveNoteText(best.serveNote),
            )}
          </p>
        )}
      </section>
      <RecordForm
        prefill={{
          name: bottle.name,
          kind: bottle.kind,
          style: bottle.style,
          maker: bottle.maker,
          origin: bottle.origin,
          abv: bottle.abv ?? null,
          menuNote: bottle.note,
          shop: "家",
          bottleId: bottle.id,
          serve: best?.serve ?? null,
          serveNote: best?.serveNote,
        }}
        drinkFilled
        onSaved={() => router.replace("/bottles")}
      />
    </>
  );
}

function NewRecord() {
  const router = useRouter();
  // メニュー確認の画面で「＋ 記録に追加」を押すと ?drink=お酒の名前 で来る
  const params = useSearchParams();
  const drinkParam = params.get("drink");
  // 料理から選ぶで「＋記録」を押したときは、合わせた料理も ?food=料理名 で来る
  const foodParam = params.get("food");
  // 気になるお酒の一覧から「＋ 記録に追加」で来たときは ?wish=id
  const wishParam = params.get("wish");
  // 家のお酒から「飲んだので記録する」で来たときは ?bottle=id
  const bottleParam = params.get("bottle");
  // 記録の一覧で見つからなかった名前（62）は ?name=、あとで書く箱から（41）は ?later=id
  const nameParam = params.get("name");
  const laterParam = params.get("later");
  // カウンターで数えた1杯を「記録にする」で来たときは ?tally=id（保存したら数えた分は記録に置きかえる）
  const tallyParam = params.get("tally");
  const [extra, setExtra] = useState<Partial<RecordDraft> | null>(nameParam ? { name: nameParam } : null);
  const [laterId, setLaterId] = useState<string | null>(null);
  useEffect(() => {
    if (!laterParam) return;
    getLater(laterParam).then((l) => {
      if (!l) return;
      setLaterId(l.id);
      setExtra({ photos: l.photos, date: l.date, ...(l.shop ? { shop: l.shop } : {}) });
      setManual(true);
    });
  }, [laterParam]);
  /** 写真だけ撮って「あとで書く」箱へ（41） */
  async function toLater(files: FileList | null) {
    try {
      const photos = await shrinkPhotos(files);
      if (!photos.length) return;
      await addLater(photos);
      toast("あとで書くに入れました");
      router.push("/later");
    } catch {
      toast("写真を読み込めませんでした", { tone: "warn" });
    }
  }
  const [bottle, setBottle] = useState<{ bottle: Bottle; count: number; best?: TastingRecord } | null>(null);
  const [openBottles, setOpenBottles] = useState(0);
  const [wishId, setWishId] = useState<string | null>(null);
  const [drinks, setDrinks] = useState<ScannedDrink[]>([]);
  const [picked, setPicked] = useState<ScannedDrink | null>(null);
  // 同じメニューから続けて記録するとき、店名と日付は引き継ぐ
  const [carry, setCarry] = useState<Pick<RecordDraft, "shop" | "date"> | null>(null);
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [saveCount, setSaveCount] = useState(0);
  // 来た画面（調べる・気になるなど）。保存したあとそこへ戻れるようにする
  const [from, setFrom] = useState("/");
  useEffect(() => setFrom(backTarget("/")), []);
  // 今日の読み取り結果を読み込んだら MenuScan を作り直して一覧を出す
  const [loaded, setLoaded] = useState(false);
  // メニューのお酒を選んでいる間はフォームを隠す（メニューにないお酒を記録するときだけ出す）
  const [manual, setManual] = useState(!!nameParam);
  // 読み取りの段（撮る・写真から・名前で）は、押したときだけ出す。読み取った一覧があるときは最初から出す
  const [scanOpen, setScanOpen] = useState(false);
  // 前に書きかけて保存しなかった記録と、「続きを書く」で開いた書きかけ
  const [stash, setStash] = useState<Stash | null>(null);
  const [resumed, setResumed] = useState<RecordDraft | null>(null);
  useEffect(() => {
    loadStash().then(setStash);
  }, []);

  // お店で撮っておいた今日のメニューがあれば、撮り直さずにそこから選べる
  useEffect(() => {
    const scan = loadLastScan();
    if (scan) {
      setDrinks(scan.drinks);
      setSavedNames(scan.recorded);
      const drink = scan.drinks.find((d) => d.name === drinkParam);
      if (drink) setPicked(drink);
    }
    setLoaded(true);
  }, [drinkParam]);

  useEffect(() => {
    if (!wishParam) return;
    getWish(wishParam).then((w) => {
      if (!w) return;
      setPicked(w);
      setWishId(w.id);
    });
  }, [wishParam]);

  useEffect(() => {
    listBottles().then((bs) => setOpenBottles(bs.filter((b) => !b.finished).length));
    if (!bottleParam) return;
    Promise.all([getBottle(bottleParam), listRecords()]).then(([b, rs]) => {
      if (!b) return;
      const mine = rs.filter((r) => r.bottleId === b.id);
      setBottle({ bottle: b, count: mine.length, best: bestServeNote(mine) });
    });
  }, [bottleParam]);

  const remaining = drinks.filter((d) => !savedNames.includes(d.name));

  if (bottleParam) {
    return (
      <>
        <header className="sub-header">
          <Link href="/bottles" className="back">
            <BackChevron />
          </Link>
          <h1>{tr("家のお酒を記録")}</h1>
        </header>
        {bottle && <BottleRecord bottle={bottle.bottle} count={bottle.count} best={bottle.best} />}
      </>
    );
  }

  return (
    <>
      <header className="sub-header">
        <BackLink fallback="/" />
        <h1>{tr("新しい記録")}</h1>
      </header>

      {stash && (
        <DraftNote
          stash={stash}
          onResume={() => {
            setResumed({ ...stash.draft, photos: stash.draft.photos ?? [] });
            setStash(null);
            setPicked(null);
            setManual(true);
          }}
          onDiscard={() => {
            clearStash();
            setStash(null);
          }}
        />
      )}

      {saveCount > 0 && !picked && (
        <section className="tips" style={{ margin: "16px 16px 0" }} role="status">
          <h2>{tr("保存しました")}</h2>
          <p className="term-desc">
            {remaining.length > 0 ? tr("ほかにも飲んだお酒があれば、下から選んで続けて記録できます。") : tr("続けて別の記録も作れます。")}
          </p>
          {from !== "/" && (
            <Link href={from} className="btn-primary" style={{ marginBottom: 8 }} onClick={() => popTo(from)}>
              {fromLabel(from)}
            </Link>
          )}
          <Link href="/" className="btn-secondary" style={{ display: "flex", justifyContent: "center" }}>
            {tr("記録の一覧へ")}
          </Link>
        </section>
      )}

      {!picked && saveCount === 0 && !laterId && (
        <div className="new-shortcuts">
          <label className="btn-secondary" style={{ cursor: "pointer" }}>
            <LineIcon name="camera" />
            {tr("あとで書く")}
            <input type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={(e) => toLater(e.target.files)} />
          </label>
          <Link href="/flight" className="btn-secondary">
            <LineIcon name="flight" />
            {tr("飲み比べセット")}
          </Link>
        </div>
      )}
      {laterId && (
        <p className="lead" style={{ margin: "16px 16px 0" }}>
          {tr("「あとで書く」の写真から記録します。保存すると箱から外れます。")}
        </p>
      )}

      {!picked && saveCount === 0 && openBottles > 0 && (
        <Link href="/bottles" className="btn-secondary" style={{ margin: "16px 16px 0" }}>
          {tr("家のお酒から記録する（{0}本）", openBottles)}
        </Link>
      )}

      {picked ? (
        <PickedDrink drink={picked} onChange={() => setPicked(null)} />
      ) : !scanOpen && remaining.length === 0 ? (
        <button type="button" className="btn-secondary new-scan-open" onClick={() => setScanOpen(true)}>
          <LineIcon name="camera" />
          {tr("メニューやラベルから読み取る")}
        </button>
      ) : (
        <MenuScan
          key={`${saveCount}:${loaded}`}
          onPick={(b) => {
            setPicked(b);
            setResumed(null);
            window.scrollTo({ top: 0 });
          }}
          initialDrinks={remaining}
          onScanned={(ds) => {
            setDrinks(ds);
            setSavedNames([]);
          }}
        />
      )}

      {!picked && !manual && remaining.length > 0 ? (
        <div style={{ margin: "12px 16px 0" }}>
          <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={() => setManual(true)}>
            {tr("一覧にないお酒を手で記録する")}
          </button>
        </div>
      ) : (
        /* お酒を選んだり保存したりしたらフォームを作り直して読み取り結果を入れる */
        <RecordForm
          key={`${saveCount}:${picked?.name ?? "blank"}:${resumed ? "resumed" : ""}:${laterId ?? ""}`}
          prefill={
            resumed ?? {
              ...(saveCount === 0 ? extra : null),
              ...carry,
              ...(picked ? drinkToDraft(picked) : {}),
              ...(picked && foodParam && picked.name === drinkParam ? { pairing: foodParam } : {}),
            }
          }
          drinkFilled={!!picked && !resumed}
          autosave={!stash}
          resumed={!!resumed}
          fromWish={!!wishId}
          onSaved={(r) => {
            if (picked) {
              setSavedNames((ns) => [...ns, picked.name]);
              markRecorded(picked.name);
            }
            if (laterId) {
              removeLater(laterId);
              setLaterId(null);
              setExtra(null);
            }
            // 飲んだので気になるお酒からは外す
            if (wishId) {
              deleteWish(wishId);
              setWishId(null);
            }
            if (tallyParam) {
              removeTally(tallyParam);
              router.replace("/tonight");
              return;
            }
            setCarry({ shop: r.shop, date: r.date });
            setResumed(null);
            setPicked(null);
            setManual(false);
            setSaveCount((n) => n + 1);
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </>
  );
}

export default function NewRecordPage() {
  return (
    <Suspense>
      <NewRecord />
    </Suspense>
  );
}
