import Link from "next/link";
import BuddyFace from "./BuddyFace";
import type { BuddyMood } from "@/lib/buddy";

type Action = { href: string; label: string } | { onClick: () => void; label: string };

/** まだ何もない画面。相棒と、最初の一歩のボタンを出す（1つめが目立つボタン） */
export default function EmptyState({
  title,
  children,
  actions = [],
  mood = "happy",
}: {
  title: string;
  children?: React.ReactNode;
  actions?: Action[];
  mood?: BuddyMood;
}) {
  return (
    <div className="buddy-empty">
      <BuddyFace mood={mood} size={72} />
      <strong>{title}</strong>
      {children && <span>{children}</span>}
      {actions.length > 0 && (
        <div className="empty-actions">
          {actions.map((a, i) => {
            const cls = i === 0 ? "btn-primary" : "btn-secondary";
            return "href" in a ? (
              <Link key={a.label} href={a.href} className={cls}>
                {a.label}
              </Link>
            ) : (
              <button key={a.label} type="button" className={cls} onClick={a.onClick}>
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
