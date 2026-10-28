// 記録や比較を、友達や SNS に送れる画像にする。画面のダークモードに関係なく、いつも明るい色で描く

const APP_NAME = "さけメモ";
const W = 1080;
const H = 1350;
const PAD = 72;
const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif';
const COLORS = {
  bg: "#f4f4f7",
  surface: "#ffffff",
  text: "#1d2030",
  muted: "#5a5f73",
  line: "#dfe1e8",
  accent: "#2f3f7a",
  series: ["#2f3f7a", "#c2562b"],
};

export type ShareSeries = { label: string; values: (number | null | undefined)[] };

/** 総合の点。★1〜5 を「4.0」のように出す */
const scoreText = (n: number) => n.toFixed(1);

export type RecordShare = {
  title: string;
  overall: number;
  tags: string[];
  axes: string[];
  values: (number | null | undefined)[];
  flavors: string[];
  memo: string;
  footer: string;
  photo: Blob | null;
};

function font(size: number, bold = false) {
  return `${bold ? 700 : 400} ${size}px ${FONT}`;
}

/** 日本語は単語の区切りがないので、1文字ずつ測って折り返す */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  for (const ch of text.replace(/\s+/g, " ")) {
    if (ctx.measureText(line + ch).width > width) {
      lines.push(line);
      line = ch;
      if (lines.length === maxLines) break;
    } else {
      line += ch;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && lines.join("").length < text.length) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + "…";
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** 1〜5 の評価を多角形で描く。いちばん内側の輪が 0（未入力）で、1〜5 はその外側（画面の RadarChart と同じ） */
function drawRadar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  axes: string[],
  series: ShareSeries[],
) {
  const n = axes.length;
  const at = (i: number, v: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = (radius * (v + 1)) / 6;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };
  ctx.strokeStyle = COLORS.line;
  for (let level = 0; level <= 5; level++) {
    ctx.lineWidth = level === 5 ? 3 : 2;
    ctx.beginPath();
    axes.forEach((_, i) => {
      const [x, y] = at(i, level);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  series.forEach((s, si) => {
    const color = COLORS.series[si % COLORS.series.length];
    ctx.beginPath();
    s.values.forEach((v, i) => {
      const [x, y] = at(i, v ?? 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.stroke();
    // 角ごとに点を打つ（未入力の角も内側の輪の上に）
    ctx.fillStyle = color;
    s.values.forEach((v, i) => {
      const [x, y] = at(i, v ?? 0);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  ctx.fillStyle = COLORS.text;
  ctx.font = font(30, true);
  // 軸名はいちばん外の角から外向きに少し離し、角の向きに合わせて寄せる（点と重ならないように）
  axes.forEach((a, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [x, y] = at(i, 5);
    ctx.textAlign = cos > 0.3 ? "left" : cos < -0.3 ? "right" : "center";
    ctx.textBaseline = sin < -0.3 ? "bottom" : sin > 0.3 ? "top" : "middle";
    ctx.fillText(a, x + cos * 26, y + sin * 26);
  });
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function base() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COLORS.surface;
  roundRect(ctx, 36, 36, W - 72, H - 72, 40);
  ctx.fill();
  return { canvas, ctx };
}

function footer(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(28);
  ctx.fillText(text, PAD, H - PAD - 6);
  ctx.fillStyle = COLORS.accent;
  ctx.font = font(30, true);
  ctx.textAlign = "right";
  ctx.fillText(APP_NAME, W - PAD, H - PAD - 6);
  ctx.textAlign = "left";
}

async function drawPhoto(ctx: CanvasRenderingContext2D, photo: Blob, x: number, y: number, w: number, h: number) {
  const img = await createImageBitmap(photo);
  // 枠いっぱいに切り抜く
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.save();
  roundRect(ctx, x, y, w, h, 28);
  ctx.clip();
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("画像を作れませんでした"))), "image/png"),
  );
}

/** 1杯の記録の画像 */
export async function recordImage(r: RecordShare) {
  const { canvas, ctx } = base();
  let y = PAD + 8;
  // 評価が3つ以上あるときだけグラフを描く（2つ以下だと線になってしまう）
  const hasRadar = r.values.filter((v) => v).length >= 3;

  if (r.photo) {
    await drawPhoto(ctx, r.photo, PAD, y, W - PAD * 2, hasRadar ? 360 : 560);
    y += (hasRadar ? 360 : 560) + 56;
  } else {
    y += 40;
  }

  ctx.fillStyle = COLORS.text;
  ctx.font = font(60, true);
  for (const line of wrap(ctx, r.title, W - PAD * 2, 2)) {
    ctx.fillText(line, PAD, y + 50);
    y += 74;
  }
  if (r.tags.length) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(30);
    ctx.fillText(wrap(ctx, r.tags.join("・"), W - PAD * 2, 1)[0], PAD, y + 30);
    y += 56;
  }

  // 総合はグラフに入れず、グラフの上に大きな数字で出す
  y += 16;
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(30, true);
  ctx.fillText("総合評価", PAD, y + 62);
  const labelW = ctx.measureText("総合評価").width;
  ctx.fillStyle = COLORS.accent;
  ctx.font = font(96, true);
  ctx.fillText(scoreText(r.overall), PAD + labelW + 28, y + 80);
  const scoreW = ctx.measureText(scoreText(r.overall)).width;
  ctx.font = font(44);
  ctx.fillText(stars(r.overall), PAD + labelW + 28 + scoreW + 24, y + 72);
  y += 110;

  const bottom = H - PAD - 60;
  const textLines = (r.flavors.length ? 1 : 0) + (r.memo ? 2 : 0);
  if (hasRadar) {
    const room = bottom - y - textLines * 46 - 40;
    const radius = Math.min(250, room / 2 - 50);
    if (radius > 90) {
      drawRadar(ctx, W / 2, y + room / 2 + 10, radius, r.axes, [{ label: r.title, values: r.values }]);
      y += room + 20;
    }
  }

  ctx.font = font(32);
  if (r.flavors.length) {
    ctx.fillStyle = COLORS.text;
    ctx.fillText(wrap(ctx, `感じた味：${r.flavors.join("・")}`, W - PAD * 2, 1)[0], PAD, y + 32);
    y += 50;
  }
  if (r.memo) {
    ctx.fillStyle = COLORS.muted;
    for (const line of wrap(ctx, r.memo, W - PAD * 2, 2)) {
      ctx.fillText(line, PAD, y + 32);
      y += 46;
    }
  }
  footer(ctx, r.footer);
  return toBlob(canvas);
}

/** 2つの記録をくらべた画像 */
export async function compareImage(axes: string[], series: (ShareSeries & { sub: string; overall: number })[]) {
  const { canvas, ctx } = base();
  ctx.fillStyle = COLORS.accent;
  ctx.font = font(34, true);
  ctx.fillText("くらべてみた", PAD, PAD + 60);
  let y = PAD + 110;
  series.forEach((s, i) => {
    ctx.fillStyle = COLORS.series[i];
    ctx.beginPath();
    ctx.arc(PAD + 16, y + 26, 16, 0, Math.PI * 2);
    ctx.fill();
    // 右に総合の点を大きく出す
    const scoreW = 200;
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(24, true);
    ctx.textAlign = "right";
    ctx.fillText("総合", W - PAD, y + 8);
    ctx.fillStyle = COLORS.series[i];
    ctx.font = font(76, true);
    ctx.fillText(scoreText(s.overall), W - PAD, y + 82);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.text;
    ctx.font = font(44, true);
    ctx.fillText(wrap(ctx, s.label, W - PAD * 2 - 50 - scoreW, 1)[0], PAD + 50, y + 42);
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(28);
    ctx.fillText(wrap(ctx, s.sub, W - PAD * 2 - 50 - scoreW, 1)[0], PAD + 50, y + 88);
    y += 130;
  });
  const room = H - PAD - 80 - y;
  drawRadar(ctx, W / 2, y + room / 2, Math.min(300, room / 2 - 60), axes, series);
  footer(ctx, "");
  return toBlob(canvas);
}

/** 共有シートで送る。共有できない端末では画像を保存する */
export async function shareImage(blob: Blob, name: string) {
  const file = new File([blob], `${name}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      // 共有シートを閉じただけのときは何もしない
      if (e instanceof Error && e.name === "AbortError") return;
      throw e;
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
