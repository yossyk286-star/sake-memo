"use client";

import EmptyState from "@/components/EmptyState";

import BackLink from "@/components/BackLink";
import { Suspense, useState } from "react";
import MenuScan, { PickedDrink } from "@/components/MenuScan";
import RecordForm from "@/components/RecordForm";
import { drinkToDraft, type ScannedDrink } from "@/lib/menuScan";
import { photosOf } from "@/lib/photo";
import { useRecordFromQuery } from "@/lib/useRecord";
import { tr } from "@/lib/i18n";

function EditBody() {
  const record = useRecordFromQuery();
  const [scanOpen, setScanOpen] = useState(false);
  const [picked, setPicked] = useState<ScannedDrink | null>(null);

  return (
    <>
      <header className="sub-header">
        <BackLink fallback={record ? `/record?id=${record.id}` : "/"} />
        <h1>{tr("記録を編集")}</h1>
      </header>
      {record === null && (
        <main className="content" style={{ paddingTop: 16 }}>
          <EmptyState title={tr("記録が見つかりませんでした")} mood="sad" actions={[{ href: "/", label: tr("記録の一覧へ") }]}>
            {tr("消した記録か、別の端末で作った記録かもしれません。")}
          </EmptyState>
        </main>
      )}
      {record && (
        <>
          {picked && <PickedDrink drink={picked} />}
          {!picked && scanOpen && <MenuScan onPick={setPicked} savedPhoto={photosOf(record)[0] ?? null} />}
          {!picked && !scanOpen && (
            <div style={{ padding: "16px 16px 0" }}>
              <button type="button" className="btn-secondary" style={{ width: "100%" }} onClick={() => setScanOpen(true)}>
                {tr("メニュー・ラベル・名前から入れる")}
              </button>
            </div>
          )}
          {/* 読み取り結果は、すでに入っている内容の上に重ねる */}
          <RecordForm key={picked?.name ?? "saved"} initial={picked ? { ...record, ...drinkToDraft(picked) } : record} />
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
