"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BuddyFace from "./BuddyFace";
import { WORDS, type Badge } from "@/lib/appeal";
import { listRecords } from "@/lib/db";
import { tr } from "@/lib/i18n";
import { newMilestones, titleOf } from "@/lib/milestones";
import { cardImage, shareImage } from "@/lib/shareImage";

// 書いている途中や、人に見せている画面では出さない
const QUIET = ["/new", "/edit", "/show", "/match"];
const CONFETTI = Array.from({ length: 14 }, (_, i) => i);

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
  const head = party.title ? tr("「{0}」になりました", party.title) : tr("「{0}」のしるし", party.badges[0].label);
  const nextLine = next ? tr("次の「{0}」まで あと{1}{2}", next.name, next.left, WORDS.cup) : "";

  async function share() {
    const blob = await cardImage({
      eyebrow: tr("記録 {0}{1}目", party!.count, WORDS.cup),
      title: head,
      stats: [],
      lines: [party!.badges.map((b) => `${b.icon} ${tr(b.label)}`).join("　"), nextLine].filter(Boolean),
    });
    await shareImage(blob, head).catch(() => alert(tr("共有できませんでした")));
  }

  return (
    <div className="welcome-backdrop">
      <div className="welcome party" role="dialog" aria-modal="true" aria-labelledby="party-title">
        <div className="confetti" aria-hidden="true">
          {CONFETTI.map((i) => (
            <i key={i} style={{ left: `${6 + i * 6.5}%`, animationDelay: `${(i % 5) * 0.12}s` }} data-c={i % 4} />
          ))}
        </div>
        <BuddyFace mood="happy" size={72} />
        <span className="party-count">{tr("記録 {0}{1}目", party.count, WORDS.cup)}</span>
        <h2 id="party-title">{head}</h2>
        {party.badges.length > 0 && (
          <ul className="badge-row">
            {party.badges.slice(0, 4).map((b) => (
              <li key={b.id}>
                <span className="badge-icon" aria-hidden="true">
                  {b.icon}
                </span>
                {tr(b.label)}
              </li>
            ))}
          </ul>
        )}
        {nextLine && <p>{nextLine}</p>}
        <button type="button" className="btn-primary" onClick={() => setParty(null)}>
          {tr("やったね")}
        </button>
        <button type="button" className="welcome-sub" onClick={share}>
          {tr("画像で送る")}
        </button>
      </div>
    </div>
  );
}
