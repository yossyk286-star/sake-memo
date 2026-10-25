/** メニューの読み取りや辞典の追加で AI を使うときの合言葉。一度通ったら端末に覚えておく */
export const PASSCODE_KEY = "sake-memo:passcode";

export function loadPasscode() {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePasscode(passcode: string) {
  try {
    localStorage.setItem(PASSCODE_KEY, passcode);
  } catch {}
}

export function normalizePasscode(passcode: string) {
  return passcode.trim().normalize("NFKC");
}
