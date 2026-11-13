"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import BackChevron from "./BackChevron";
import { backTarget, popTo } from "@/lib/nav";
import { isPlainClick, transitionTo } from "@/lib/viewTransition";

/**
 * 左上の ‹。来た画面へ戻る（直接開いたときは fallback）。
 * slide を付けると、詳細から一覧へ戻るときのようにつながって動く
 */
export default function BackLink({ fallback, slide }: { fallback: string; slide?: boolean }) {
  const router = useRouter();
  function go(e: React.MouseEvent) {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    const to = backTarget(fallback);
    popTo(to);
    const path = to.split("?")[0];
    if (slide)
      transitionTo(
        () => router.push(to),
        () => location.pathname === path,
        "back",
      );
    else router.push(to);
  }
  return (
    <Link href={fallback} className="back" onClick={go}>
      <BackChevron />
    </Link>
  );
}
