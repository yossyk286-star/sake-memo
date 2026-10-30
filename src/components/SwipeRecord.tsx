"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import RecordCard from "./RecordCard";
import { deleteRecord } from "@/lib/db";
import type { TastingRecord } from "@/lib/types";
import { tr } from "@/lib/i18n";

/** 横にずらしたときに出すボタンの幅 */
const ACTION_W = 88;

type Drag = { x: number; y: number; base: number; axis: "x" | "y" | null };

/** 記録カード。左へスライドで削除、右へスライドで編集のボタンが出る。大きくスライドするとそのまま実行 */
export default function SwipeRecord({
  record,
  onDeleted,
  showDate,
}: {
  record: TastingRecord;
  onDeleted: (id: string) => void;
  showDate?: boolean;
}) {
  const router = useRouter();
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  // スライドした直後のタップで詳細を開かないようにする
  const swiped = useRef(false);

  function edit() {
    router.push(`/edit?id=${record.id}`);
  }

  async function remove() {
    if (!confirm(tr("この記録を削除しますか？"))) return setDx(0);
    await deleteRecord(record.id);
    onDeleted(record.id);
  }

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, base: dx, axis: null };
    swiped.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    // 縦のスクロールと見分けるため、最初に大きく動いた向きで決める
    if (!d.axis) {
      if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) {
        d.axis = "x";
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      } else if (Math.abs(my) > 8) {
        d.axis = "y";
      }
    }
    if (d.axis !== "x") return;
    swiped.current = true;
    const limit = ACTION_W * 2;
    setDx(Math.max(-limit, Math.min(limit, d.base + mx)));
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (d?.axis !== "x") return;
    setDragging(false);
    if (dx <= -ACTION_W * 1.6) {
      setDx(-ACTION_W);
      remove();
    } else if (dx >= ACTION_W * 1.6) {
      setDx(0);
      edit();
    } else if (dx <= -ACTION_W / 2) {
      setDx(-ACTION_W);
    } else if (dx >= ACTION_W / 2) {
      setDx(ACTION_W);
    } else {
      setDx(0);
    }
  }

  function onClickCapture(e: React.MouseEvent) {
    // ずらしている途中やボタンが出ているときのタップは、元に戻すだけ
    if (swiped.current) {
      // スライドを離したときに出るクリックは無視する
      e.preventDefault();
      e.stopPropagation();
      swiped.current = false;
    } else if (dx !== 0) {
      e.preventDefault();
      e.stopPropagation();
      setDx(0);
    }
  }

  return (
    <div className="swipe">
      {dx > 0 && (
        <button type="button" className="swipe-action swipe-edit" style={{ width: Math.max(dx, ACTION_W) }} onClick={edit}>
          {tr("編集")}
        </button>
      )}
      {dx < 0 && (
        <button type="button" className="swipe-action swipe-delete" style={{ width: Math.max(-dx, ACTION_W) }} onClick={remove}>
          {tr("削除")}
        </button>
      )}
      <div
        className="swipe-body"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform 0.2s ease" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        // リンクを掴んで引っぱる動き（ブラウザ標準のドラッグ）を止めて、スライドとして扱う
        onDragStart={(e) => e.preventDefault()}
      >
        <RecordCard record={record} showDate={showDate} />
      </div>
    </div>
  );
}
