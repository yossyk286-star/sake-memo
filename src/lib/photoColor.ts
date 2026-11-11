/**
 * 写真のいちばん目立つ色（ラベルの色）。詳細のにじみ・五角形・点数の色に使う（20）。
 * 小さく縮めて、白・黒・灰色に近い点を除いた平均を取り、文字が読める濃さに整える
 */
export async function photoColor(photo: Blob): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(photo, { resizeWidth: 24, resizeHeight: 24 });
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const g = c.getContext("2d");
    if (!g) return null;
    g.drawImage(bmp, 0, 0);
    bmp.close();
    const d = g.getImageData(0, 0, 24, 24).data;
    let r = 0;
    let gr = 0;
    let b = 0;
    let w = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [R, G, B] = [d[i], d[i + 1], d[i + 2]];
      const max = Math.max(R, G, B);
      const min = Math.min(R, G, B);
      const sat = max === 0 ? 0 : (max - min) / max;
      // 色の薄い点（白い紙・黒い背景・灰色）はほとんど数えない
      const weight = sat * sat * (max > 30 ? 1 : 0);
      r += R * weight;
      gr += G * weight;
      b += B * weight;
      w += weight;
    }
    if (w < 2) return null;
    const [h, s] = hsl(r / w, gr / w, b / w);
    // どの写真でも見やすい濃さ・鮮やかさにそろえる
    return `hsl(${Math.round(h)} ${Math.round(Math.max(45, Math.min(75, s)))}% 45%)`;
  } catch {
    return null;
  }
}

function hsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
