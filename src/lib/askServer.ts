import { getLang } from "./i18n";
import { loadPasscode, normalizePasscode, savePasscode } from "./passcode";
import { fetchOnline } from "./pending";

/**
 * 合言葉を付けて AI に頼む。どの画面からもここを通す（合言葉のそろえ方と覚え方を1か所に）。
 * 通ったら合言葉を端末に覚える。答えの読み方は画面ごとに違うので Response をそのまま返す
 */
export async function sendAI(payload: object, passcode: string): Promise<Response> {
  const code = normalizePasscode(passcode);
  const res = await fetchOnline("/api/read-menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, passcode: code, lang: getLang() }),
  });
  if (res.ok) savePasscode(code);
  return res;
}

/** 覚えている合言葉を付けて AI に頼み、答えを JSON で受け取る。合言葉がまだなければ理由つきで失敗する */
export async function askServer<T>(payload: object): Promise<T> {
  const passcode = loadPasscode();
  if (!passcode) throw new Error("調べる画面で合言葉を入れると使えます");
  const res = await sendAI(payload, passcode);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました。もう一度お試しください");
  return data as T;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export { blobToBase64 };
