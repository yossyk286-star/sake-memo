import type { TastingRecord } from "./types";
import { isHome } from "./shops";

export type LatLng = { lat: number; lng: number };

/** いまいる場所。使えない・断られたら null */
export function here(timeout = 6000): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Math.round(p.coords.latitude * 1e4) / 1e4, lng: Math.round(p.coords.longitude * 1e4) / 1e4 }),
      () => resolve(null),
      { timeout, maximumAge: 5 * 60_000, enableHighAccuracy: false },
    );
  });
}

/** 位置を使ってよいと前に許可されているか（聞かれる画面を急に出さないため） */
export async function geoAllowed() {
  try {
    const s = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return s?.state === "granted";
  } catch {
    return false;
  }
}

/** 2点の距離（m） */
export function distance(a: LatLng, b: LatLng) {
  const R = 6371e3;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 近くで記録したことのあるお店（近い順・1km 以内） */
export function nearbyShops(records: TastingRecord[], at: LatLng, within = 1000) {
  const best = new Map<string, number>();
  for (const r of records) {
    if (!r.geo || !r.shop.trim() || isHome(r.shop)) continue;
    const d = distance(at, r.geo);
    if (d <= within && d < (best.get(r.shop) ?? Infinity)) best.set(r.shop, d);
  }
  return [...best].sort((a, b) => a[1] - b[1]).map(([shop, m]) => ({ shop, m: Math.round(m) }));
}
