"use client";

import { toast } from "@/lib/toast";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BuddyFace from "./BuddyFace";
import BadgeMedal from "./BadgeMedal";
import { plateStyle, TitleMedal } from "./Medal";
import { APP, WORDS, type Badge } from "@/lib/appeal";
import { listRecords } from "@/lib/db";
import { tr } from "@/lib/i18n";
import { newMilestones, titleOf } from "@/lib/milestones";
import { cardImage, shareImage } from "@/lib/shareImage";

// 書いている途中や、人に見せている画面では出さない
const QUIET = ["/new", "/edit", "/show", "/match"];

type Party = { badges: Badge[]; title: string | null; count: number };

/** しるしや称号を新しく取ったときのお祝い。画面を移るたびに記録を数えて、増えていたら出す */
export default function Milestones() {
  const path = usePathname();
  const [party, setParty] = useState<Party | null>(null);

  useEffect(() => {
    if (QUIET.some((p) => path.startsWith(p))) return;
    let alive = true;
    listRecords().then((rs) => {
      if (!alive || document.querySelector(".welcome-backdrop, .tour")) return;
      const fresh = newMilestones(rs);
      if (fresh.badges.length || fresh.title) setParty({ ...fresh, count: rs.length });
    });
    return () => {
      alive = false;
    };
  }, [path]);

  if (!party) return null;
  const next = titleOf(party.count).next;
  const head = party.title ? tr("「{0}」になりました", party.title) : party.badges[0].tier > 0 ? tr("「{0}」が一段ピカッとしました", party.badges[0].label) : tr("「{0}」のしるし", party.badges[0].label);
  const nextLine = next ? tr("次の「{0}」まで あと{1}{2}", next.name, next.left, WORDS.cup) : "";

  async function share() {
    const blob = await cardImage({
      eyebrow: tr("記録 {0}{1}目", party!.count, WORDS.cup),
      title: head,
      stats: [],
      lines: [party!.badges.map((b) => tr(b.label)).join("・"), nextLine].filter(Boolean),
    });
    await shareImage(blob, head).catch(() => toast("共有できませんでした", { tone: "warn" }));
  }

  return (
    <div className="welcome-backdrop">
      <div className="welcome party" role="dialog" aria-modal="true" aria-labelledby="party-title">
        {party.title ? (
          <TitleMedal tier={titleOf(party.count).tier} emblem={APP.emblem} size={112} shine />
        ) : party.badges.length === 1 ? (
          <BadgeMedal badge={party.badges[0]} size={112} shine />
        ) : (
          <BuddyFace mood="happy" size={72} />
        )}
        <span className="party-count">{tr("記録 {0}{1}目", party.count, WORDS.cup)}</span>
        {party.title ? (
          <h2 id="party-title">
            <span className="muted" style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{tr("新しい称号")}</span>
            <span className="title-plate" style={plateStyle(titleOf(party.count).tier)}>{tr(party.title)}</span>
            {titleOf(party.count).quip && <span className="title-quip">{tr(titleOf(party.count).quip ?? "")}</span>}
          </h2>
        ) : (
          <h2 id="party-title">{head}</h2>
        )}
        {party.badges.length > (party.title ? 0 : 1) && (
          <ul className="badge-row">
            {party.badges.slice(0, 4).map((b) => (
              <li key={b.id}>
                <BadgeMedal badge={b} size={48} />
                {tr(b.label)}
              </li>
            ))}
          </ul>
        )}
        {nextLine && <p>{nextLine}</p>}
        <button type="button" className="btn-primary" onClick={() => setParty(null)}>
          {tr("閉じる")}
        </button>
        <button type="button" className="welcome-sub" onClick={share}>
          {tr("画像で送る")}
        </button>
      </div>
    </div>
  );
}
