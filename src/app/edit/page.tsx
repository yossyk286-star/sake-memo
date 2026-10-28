"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import MenuScan, { PickedDrink } from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import { drinkToDraft, type ScannedDrink } from "@/lib/menuScan";
import { photosOf } from "@/lib/photo";
import { useRecordFromQuery } from "@/lib/useRecord";

function EditBody() {
  const record = useRecordFromQuery();
  const [scanOpen, setScanOpen] = useState(false);
  const [picked, setPicked] = useState<ScannedDrink | null>(null);

  return (
    <>
      <header className="sub-header">
        <Link href={record ? `/record?id=${record.id}` : "/"} className="back">
          ‹ 戻る
        </Link>
        <h1>記録を編集</h1>
      </header>
      {record === null && <p className="empty">記録が見つかりませんでした。</p>}
      {record && (
        <>
          {picked && <PickedDrink drink={picked} />}
          {!picked && scanOpen && <MenuScan onPick={setPicked} savedPhoto={photosOf(record)[0] ?? null} />}
          {!picked && !scanOpen && (
            <div style={{ padding: "16px 16px 0" }}>
              <button type="button" className="btn-secondary" style={{ width: "100%" }} onClick={() => setScanOpen(true)}>
                メニュー・ラベル・名前から入れる
              </button>
            </div>
          )}
          {/* 読み取り結果は、すでに入っている内容の上に重ねる */}
          <RecordForm
            key={picked?.name ?? "saved"}
            initial={picked ? { ...record, ...drinkToDraft(picked) } : record}
          />
        </>
      )}
    </>
  );
}

export default function EditRecordPage() {
  return (
    <Suspense>
      <EditBody />
    </Suspense>
  );
}
