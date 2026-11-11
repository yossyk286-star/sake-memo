"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getRecord, peekRecords } from "./db";
import type { TastingRecord } from "./types";

/** URL の ?id= から記録を読む。undefined = 読み込み中、null = 見つからない */
export function useRecordFromQuery() {
  const id = useSearchParams().get("id");
  // 一覧で読んだ記録があれば、それですぐ描く（詳細を開いた瞬間に中身が後から出てくるのを防ぐ）
  const [record, setRecord] = useState<TastingRecord | null | undefined>(() => (id ? peekRecords()?.find((r) => r.id === id) : undefined));
  useEffect(() => {
    if (!id) return setRecord(null);
    getRecord(id).then((r) => setRecord(r ?? null));
  }, [id]);
  return record;
}
