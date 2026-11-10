// オフラインでも記録・辞典・好みを開けるようにするサービスワーカー。
// 画面（HTML）は電波があれば最新を取りに行き、なければ前に保存したものを出す。
// /_next/static のファイルは名前に版が入っていて中身が変わらないので、保存したものを優先する。
const VERSION = "v5";
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const RSC = `rsc-${VERSION}`;
// 片付けた日時の記録用（1日1回まで）
const META = "meta";

// 最初に保存しておく画面。ほかの画面も一度開けば保存される
const PRECACHE = ["/", "/new", "/edit", "/record", "/compare", "/scan", "/glossary", "/taste", "/stamps", "/shops", "/shop", "/wishlist", "/prefs", "/bottles", "/settings", "/guide", "/match"];

/** HTML に書かれた /_next/static のファイルも一緒に保存する（開いたことのない画面も動くように） */
async function precache() {
  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  const assets = new Set();
  await Promise.all(
    PRECACHE.map(async (path) => {
      try {
        const res = await fetch(path, { cache: "no-cache" });
        if (!res.ok) return;
        const html = await res.clone().text();
        await pages.put(path, res);
        for (const m of html.matchAll(/["'](\/_next\/static\/[^"'\s]+)["']/g)) assets.add(m[1]);
      } catch {}
    }),
  );
  await Promise.all(
    [...assets].map(async (url) => {
      if (await statics.match(url)) return;
      try {
        const res = await fetch(url);
        if (res.ok) await statics.put(url, res);
      } catch {}
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, STATIC, RSC, META];
      for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
      await self.clients.claim();
      await prune();
    })(),
  );
});

/**
 * 古い版の /_next/static のファイルを片付ける。更新のたびに名前の違うファイルが増え、端末の容量を食い続けるため。
 * 保存してある画面（HTML・RSC）が使うファイルと、そこから読み込まれるファイル（地図・英語など後から読むもの）は残す。
 * 1日1回まで
 */
async function prune() {
  try {
    const meta = await caches.open(META);
    const last = await meta.match("/__pruned");
    if (last && Date.now() - Number(await last.text()) < 24 * 60 * 60 * 1000) return;
    await meta.put("/__pruned", new Response(String(Date.now())));

    const pages = await caches.open(PAGES);
    const statics = await caches.open(STATIC);
    const keep = new Set();
    for (const req of await pages.keys()) {
      const res = await pages.match(req);
      if (!res) continue;
      for (const m of (await res.text()).matchAll(/["'](\/_next\/static\/[^"'\s]+)["']/g)) keep.add(m[1]);
    }
    if (keep.size === 0) return;
    // 残すファイルの中に名前が出てくるファイルも残す（たどれなくなるまで繰り返す）
    const cached = (await statics.keys()).map((req) => ({ req, path: new URL(req.url).pathname }));
    // 画面の切り替えで取りに来るデータ（RSC）に名前が出てくるファイルも残す
    let text = "";
    const rsc = await caches.open(RSC);
    for (const req of await rsc.keys()) {
      const res = await rsc.match(req);
      if (res) text += await res.text();
    }
    const read = new Set();
    for (let changed = true; changed; ) {
      changed = false;
      for (const { req, path } of cached) {
        if (keep.has(path) && !read.has(path) && /\.(js|css)$/.test(path)) {
          read.add(path);
          const res = await statics.match(req);
          if (res) text += await res.text();
        }
      }
      for (const { path } of cached) {
        const name = path.split("/").pop().replace(/\.[^.]+$/, "");
        if (!keep.has(path) && name.length >= 8 && text.includes(name)) {
          keep.add(path);
          changed = true;
        }
      }
    }
    for (const { req, path } of cached) if (!keep.has(path)) await statics.delete(req);
  } catch {}
}

/** 電波があれば最新を取って保存し、なければ保存したものを返す */
async function networkFirst(request, cacheName, key) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(key, res.clone());
    return res;
  } catch {
    return (await cache.match(key)) ?? null;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) await cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // 画面の切り替えで取りに来るデータ（RSC）。HTML とは別に保存する。
  // 保存がなければ失敗を返すと、Next.js が画面ごと読み込み直すので、下の HTML の保存が使われる
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(
      networkFirst(request, RSC, url.pathname).then((res) => res ?? Response.error()),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.waitUntil(prune());
    // /record?id=… のような画面は、? より前だけで保存する（中身は端末の記録から読むので同じ HTML でよい）
    event.respondWith(
      networkFirst(request, PAGES, url.pathname).then(
        async (res) => res ?? (await caches.match("/", { cacheName: PAGES })) ?? Response.error(),
      ),
    );
  }
});
