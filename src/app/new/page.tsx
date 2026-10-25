"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MenuScan, { PickedDrink } from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import { deleteWish, getWish } from "@/lib/db";
import { loadLastScan, markRecorded } from "@/lib/lastScan";
import { drinkToDraft, type ScannedDrink } from "@/lib/menuScan";
import type { RecordDraft } from "@/lib/types";

function NewRecord() {
  // メニュー確認の画面で「＋ 記録に追加」を押すと ?drink=お酒の名前 で来る
  const params = useSearchParams();
  const drinkParam = params.get("drink");
  // 気になるお酒の一覧から「＋ 記録に追加」で来たときは ?wish=id
  const wishParam = params.get("wish");
  const [wishId, setWishId] = useState<string | null>(null);
  const [drinks, setDrinks] = useState<ScannedDrink[]>([]);
  const [picked, setPicked] = useState<ScannedDrink | null>(null);
  // 同じメニューから続けて記録するとき、店名と日付は引き継ぐ
  const [carry, setCarry] = useState<Pick<RecordDraft, "shop" | "date"> | null>(
    null,
  );
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [saveCount, setSaveCount] = useState(0);
  // 今日の読み取り結果を読み込んだら MenuScan を作り直して一覧を出す
  const [loaded, setLoaded] = useState(false);
  // メニューのお酒を選んでいる間はフォームを隠す（メニューにないお酒を記録するときだけ出す）
  const [manual, setManual] = useState(false);

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

  const remaining = drinks.filter((d) => !savedNames.includes(d.name));

  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 戻る
        </Link>
        <h1>新しい記録</h1>
      </header>

      {saveCount > 0 && !picked && (
        <section
          className="tips"
          style={{ margin: "16px 16px 0" }}
          role="status"
        >
          <h2>保存しました</h2>
          <p className="term-desc">
            {remaining.length > 0
              ? "ほかにも飲んだお酒があれば、下から選んで続けて記録できます。"
              : "続けて別の記録も作れます。"}
          </p>
          <Link
            href="/"
            className="btn-secondary"
            style={{ display: "block", textAlign: "center" }}
          >
            記録の一覧へ
          </Link>
        </section>
      )}

      {picked ? (
        <PickedDrink drink={picked} onChange={() => setPicked(null)} />
      ) : (
        <MenuScan
          key={`${saveCount}:${loaded}`}
          onPick={(b) => {
            setPicked(b);
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
          <button
            type="button"
            className="btn-ghost"
            style={{ width: "100%" }}
            onClick={() => setManual(true)}
          >
            メニューにないお酒を記録する
          </button>
        </div>
      ) : (
        /* お酒を選んだり保存したりしたらフォームを作り直して読み取り結果を入れる */
        <RecordForm
          key={`${saveCount}:${picked?.name ?? "blank"}`}
          prefill={{ ...carry, ...(picked ? drinkToDraft(picked) : {}) }}
          drinkFilled={!!picked}
          onSaved={(r) => {
            if (picked) {
              setSavedNames((ns) => [...ns, picked.name]);
              markRecorded(picked.name);
            }
            // 飲んだので気になるお酒からは外す
            if (wishId) {
              deleteWish(wishId);
              setWishId(null);
            }
            setCarry({ shop: r.shop, date: r.date });
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
