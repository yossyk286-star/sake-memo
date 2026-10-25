"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getRecord } from "./db";
import type { TastingRecord } from "./types";

/** URL の ?id= から記録を読む。undefined = 読み込み中、null = 見つからない */
export function useRecordFromQuery() {
  const id = useSearchParams().get("id");
  const [record, setRecord] = useState<TastingRecord | null | undefined>(undefined);
  useEffect(() => {
    if (!id) return setRecord(null);
    getRecord(id).then((r) => setRecord(r ?? null));
  }, [id]);
  return record;
}
