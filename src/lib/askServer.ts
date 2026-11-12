import { getLang } from "./i18n";
import { loadPasscode } from "./passcode";
import { fetchOnline } from "./pending";

/** 覚えている合言葉を付けて AI に頼む。合言葉がまだなければ理由つきで失敗する */
export async function askServer<T>(payload: object): Promise<T> {
  const passcode = loadPasscode();
  if (!passcode) throw new Error("調べる画面で合言葉を入れると使えます");
  const res = await fetchOnline("/api/read-menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, passcode, lang: getLang() }),
  });
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
