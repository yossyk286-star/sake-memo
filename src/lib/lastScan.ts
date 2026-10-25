import type { ScannedDrink } from "./menuScan";

/** 最後に読み取ったメニュー（とラベルや名前で調べたお酒）。お店で確認だけして、あとから記録するときに撮り直さずに使う */
export type LastScan = {
  date: string;
  drinks: ScannedDrink[];
  /** この読み取り結果からすでに記録したお酒の名前 */
  recorded: string[];
};

const KEY = "sake-memo:last-scan";

export function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 今日の読み取り結果を返す。前の日のものは使わない */
export function loadLastScan(): LastScan | null {
  try {
    const scan = JSON.parse(localStorage.getItem(KEY) ?? "null") as LastScan | null;
    return scan?.date === today() ? scan : null;
  } catch {
    return null;
  }
}

function store(scan: LastScan) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scan));
  } catch {}
}

/** recorded はラベルや名前で1本足したときに、すでに記録した分を引き継ぐのに使う */
export function saveLastScan(drinks: ScannedDrink[], recorded: string[] = []) {
  store({ date: today(), drinks, recorded });
}

export function markRecorded(name: string) {
  const scan = loadLastScan();
  if (scan && !scan.recorded.includes(name)) store({ ...scan, recorded: [...scan.recorded, name] });
}
