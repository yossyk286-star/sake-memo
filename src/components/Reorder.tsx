"use client";

import { useRef, useState, type ReactNode } from "react";
import { tr } from "@/lib/i18n";

export interface Section {
  id: string;
  label: string;
  node: ReactNode;
}

/** 保存された順に並べる。知らない id は捨て、新しく増えた区切りは後ろに足す */
export function ordered(sections: Section[], order: string[]): Section[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const head = order.map((id) => byId.get(id)).filter((s): s is Section => !!s);
  return [...head, ...sections.filter((s) => !order.includes(s.id))];
}

/**
 * 並べ替え中の一覧。行をつまんで上下に動かす（指・マウス）。
 * キーボードでは ↑↓ で1つずつ動かせる。
 */
export function ReorderList({ sections, onOrder }: { sections: Section[]; onOrder: (ids: string[]) => void }) {
  const [ids, setIds] = useState(() => sections.map((s) => s.id));
  const [drag, setDrag] = useState<{ id: string; y0: number; dy: number } | null>(null);
  const rowH = useRef(56);
  const label = new Map(sections.map((s) => [s.id, s.label]));

  const move = (from: number, to: number) => {
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setIds(next);
    return next;
  };

  return (
    <ol className="reorder-list" aria-label={tr("並べ替え")}>
      {ids.map((id, i) => (
        <li
          key={id}
          className="reorder-row"
          data-drag={drag?.id === id ? "" : undefined}
          style={drag?.id === id ? { transform: `translateY(${drag.dy}px)` } : undefined}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            // 行の高さ＋すき間。動かすときの1段ぶん
            rowH.current = e.currentTarget.offsetHeight + 8;
            setDrag({ id, y0: e.clientY, dy: 0 });
          }}
          onPointerMove={(e) => {
            if (drag?.id !== id) return;
            let { y0 } = drag;
            let dy = e.clientY - y0;
            const at = ids.indexOf(id);
            const h = rowH.current;
            if (dy > h / 2 && at < ids.length - 1) {
              move(at, at + 1);
              y0 += h;
              dy -= h;
            } else if (dy < -h / 2 && at > 0) {
              move(at, at - 1);
              y0 -= h;
              dy += h;
            }
            setDrag({ id, y0, dy });
          }}
          onPointerUp={() => {
            setDrag(null);
            onOrder(ids);
          }}
          onPointerCancel={() => {
            setDrag(null);
            onOrder(ids);
          }}
        >
          <span>{tr(label.get(id) ?? "")}</span>
          <button
            type="button"
            className="reorder-handle"
            aria-label={tr("{0}を動かす（↑↓キー）", label.get(id) ?? "")}
            onKeyDown={(e) => {
              const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : -1;
              if (to < 0 || to >= ids.length) return;
              e.preventDefault();
              onOrder(move(i, to));
            }}
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
    </ol>
  );
}
