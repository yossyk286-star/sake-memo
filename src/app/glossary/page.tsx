"use client";

import SearchField from "@/components/SearchField";
import { useEffect, useState } from "react";
import DailyQuiz from "@/components/DailyQuiz";
import { CATEGORIES, CHOOSING_TIPS, TERMS, type GlossaryCategory } from "@/lib/glossary";
import type { TermLookup } from "@/lib/menuScan";
import { COCKTAIL_LIST, findCocktail } from "@/lib/cocktails";
import Skeleton from "@/components/Skeleton";
import { announceBuddy, pick } from "@/lib/buddy";
import { loadMyTerms, saveMyTerms, type MyTerm } from "@/lib/myTerms";
import { loadPasscode, normalizePasscode, savePasscode } from "@/lib/passcode";
import { getLang, tr, trv } from "@/lib/i18n";
import { askConfirm } from "@/components/ConfirmSheet";

const FILTERS: ("すべて" | "自分で追加" | "カクテル" | GlossaryCategory)[] = ["すべて", "自分で追加", "カクテル", ...CATEGORIES];

/** 辞典にない言葉を AI に調べてもらい、自分の辞典に足す */
function AddTerm({ query, onAdded }: { query: string; onAdded: (t: MyTerm) => void }) {
  const [passcode, setPasscode] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = loadPasscode();
    setPasscode(p);
    setSaved(!!p);
  }, []);

  async function lookup() {
    if (!passcode) return setError("合言葉を入れてください");
    if (!navigator.onLine) return setError("オフラインのため調べられません");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/read-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: query.trim(), passcode: normalizePasscode(passcode), lang: getLang() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setSaved(false);
      if (!res.ok) throw new Error(data.error ?? "調べられませんでした");
      savePasscode(normalizePasscode(passcode));
      const t = data as TermLookup;
      onAdded({
        term: t.term,
        reading: t.reading || undefined,
        category: t.category,
        description: t.description,
        addedAt: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "調べられませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tips" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ margin: 0 }}>{tr("「{0}」を調べて辞典に追加", query.trim())}</h2>
      <p className="term-desc" style={{ margin: 0 }}>
        {tr("AI が初心者向けの説明を書いて、「自分で追加」に入れます（1回0.1円くらい）。")}
      </p>
      {!saved && (
        <input
          className="input"
          aria-label={tr("合言葉")}
          placeholder={tr("合言葉")}
          autoComplete="off"
          autoCapitalize="off"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
      )}
      <button type="button" className="btn-primary" onClick={lookup} disabled={busy}>
        {busy ? tr("調べています…") : tr("調べて追加する")}
      </button>
      {busy && <Skeleton plain label={tr("AI が説明を書いています…")} lines={3} />}
      {error && (
        <p className="error" role="alert">
          {trv(error)}
        </p>
      )}
    </section>
  );
}

export default function GlossaryPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("すべて");
  const [query, setQuery] = useState("");
  const [myTerms, setMyTerms] = useState<MyTerm[]>([]);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => setMyTerms(loadMyTerms()), []);

  function add(t: MyTerm) {
    // 同じ言葉を調べ直したときは新しい説明に置き換える
    const next = [t, ...myTerms.filter((m) => m.term !== t.term)];
    setMyTerms(next);
    saveMyTerms(next);
    setJustAdded(t.term);
    setQuery(t.term);
    announceBuddy({ mood: "wow", text: pick([tr("「{0}」を覚えたね。ひとつ詳しくなった！", t.term), tr("「{0}」をメモしたよ。お店で見かけたら思い出してね", t.term), tr("「{0}」、覚えた！お酒の話がもっと楽しくなるね", t.term)]) });
    setFilter("すべて");
  }

  async function remove(term: string) {
    if (!(await askConfirm({ message: tr("「{0}」を辞典から外しますか？", term), action: tr("外す") }))) return;
    const next = myTerms.filter((m) => m.term !== term);
    setMyTerms(next);
    saveMyTerms(next);
  }

  const q = query.trim().toLowerCase();
  const all = [...myTerms.map((t) => ({ ...t, mine: true })), ...TERMS.map((t) => ({ ...t, mine: false }))];
  const terms = all.filter(
    (t) =>
      (filter === "すべて" || (filter === "自分で追加" ? t.mine : t.category === filter)) &&
      (!q || [t.term, t.reading ?? "", t.description, tr(t.term), tr(t.description)].some((s) => s.toLowerCase().includes(q))),
  );
  // カクテルはベースや作り方でも探せるようにする
  const cocktails = COCKTAIL_LIST.filter(
    (c) =>
      (filter === "カクテル" || (filter === "すべて" && q)) &&
      (!q || [c.name, ...c.aliases, c.base, c.recipe, tr(c.name), tr(c.base), tr(c.recipe)].some((s) => s.toLowerCase().includes(q))),
  );
  // 種類ごとに見出しを付けてまとめる。自分で足した言葉はいちばん上
  const groups: [string, typeof terms][] = [];
  for (const t of terms) {
    const head = t.mine ? "自分で追加" : t.category;
    const g = groups.find(([h]) => h === head);
    if (g) g[1].push(t);
    else groups.push([head, [t]]);
  }
  // 探して数件だけ見つかったときは、説明まで開いておく
  const few = !!q && terms.length + cocktails.length <= 3;
  // 言葉そのものが辞典にないときだけ、調べて足すボタンを出す
  const exact = all.some((t) => t.term.toLowerCase() === q || t.reading === q || tr(t.term).toLowerCase() === q) || !!findCocktail(q);

  return (
    <>
      <header className="page-header">
        <h1>{tr("辞典")}</h1>
      </header>
      <div className="content" style={{ paddingBottom: 12 }}>
        <label htmlFor="g-search" className="visually-hidden">
          {tr("用語を検索")}
        </label>
        <div data-tour="g-search">
          <SearchField
            id="g-search"
            name="glossary"
            placeholder={tr("用語を検索")}
            value={query}
            onChange={(v) => {
              setQuery(v);
              setJustAdded(null);
            }}
          />
        </div>
        <div className="scroll-row" data-tour="g-filter">
          {FILTERS.filter((c) => c !== "自分で追加" || myTerms.length > 0).map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>
              {trv(c)}
            </button>
          ))}
        </div>
      </div>
      <main className="content" style={{ gap: 10 }}>
        {!q && filter === "すべて" && <DailyQuiz />}
        {!q && (filter === "すべて" || filter === "飲み方") && (
          <details className="tips tips-fold">
            <summary>
              <h2>{tr("選び方の目安")}</h2>
            </summary>
            <ul>
              {CHOOSING_TIPS.map((t) => (
                <li key={t}>{trv(t)}</li>
              ))}
            </ul>
          </details>
        )}
        {q && !exact && <AddTerm key={q} query={query} onAdded={add} />}
        {cocktails.length > 0 && (
          <section className="term-group">
            {filter === "すべて" && <h2 className="term-group-head">{tr("カクテル")}</h2>}
            <div className="list-group">
              {cocktails.map((c) => (
                <details key={`c-${c.name}`} className="term-row" open={few}>
                  <summary>
                    <strong>{trv(c.name)}</strong>
                    <span className="muted">{tr("{0}・約{1}%", c.base, c.abv)}</span>
                  </summary>
                  <div className="fold-body">
                    <p className="term-desc">{trv(c.explanation)}</p>
                    <p className="term-desc">
                      <strong>{tr("作り方：")}</strong>
                      {trv(c.recipe)}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
        {groups.map(([head, list]) => {
          const rows = (
            <div className="list-group">
              {list.map((t) => (
                <details
                  key={`${t.mine}-${t.category}-${t.term}`}
                  className="term-row"
                  open={few || justAdded === t.term}
                  style={{ outline: justAdded === t.term ? "2px solid var(--accent)" : undefined, outlineOffset: -2 }}
                >
                  <summary>
                    <strong>
                      {trv(t.term)}
                      {getLang() === "ja" && t.reading && <span className="muted">{tr("（{0}）", t.reading)}</span>}
                    </strong>
                    {t.mine && <span className="muted">{tr(t.category)}</span>}
                  </summary>
                  <div className="fold-body">
                  <p className="term-desc">{trv(t.description)}</p>
                  {t.mine && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ height: 32, alignSelf: "flex-end", padding: "0 12px", fontSize: 12 }}
                      onClick={() => remove(t.term)}
                    >
                      {tr("辞典から外す")}
                    </button>
                  )}
                  </div>
                </details>
              ))}
            </div>
          );
          // 「すべて」で何も探していないときは、種類ごとに畳んで目次のように見せる
          if (filter === "すべて" && !q)
            return (
              <details key={head} className="month-fold term-fold" open={head === "自分で追加"}>
                <summary>
                  <span>{trv(head)}</span>
                  <span className="month-fold-count">{tr("{0}語", list.length)}</span>
                </summary>
                <div className="month-body">{rows}</div>
              </details>
            );
          return (
            <section key={head} className="term-group">
              {filter === "すべて" && <h2 className="term-group-head">{trv(head)}</h2>}
              {rows}
            </section>
          );
        })}
        {terms.length === 0 && cocktails.length === 0 && !q && <p className="empty">{tr("まだありません。")}</p>}
      </main>
    </>
  );
}
