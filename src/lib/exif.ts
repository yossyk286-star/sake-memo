/**
 * 写真（JPEG）の撮った日を読む（EXIF の DateTimeOriginal）。読めなければ null。
 * 縮小すると消えるので、縮小する前のファイルから読む
 */
export async function photoDate(file: Blob): Promise<string | null> {
  try {
    const buf = await file.slice(0, 128 * 1024).arrayBuffer();
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xffd8) return null;
    let p = 2;
    while (p + 4 < v.byteLength) {
      const marker = v.getUint16(p);
      const len = v.getUint16(p + 2);
      // APP1 の "Exif\0\0"
      if (marker === 0xffe1 && v.getUint32(p + 4) === 0x45786966) return readTiff(v, p + 10);
      if ((marker & 0xff00) !== 0xff00) return null;
      p += 2 + len;
    }
  } catch {}
  return null;
}

function readTiff(v: DataView, t: number): string | null {
  const le = v.getUint16(t) === 0x4949;
  const u16 = (o: number) => v.getUint16(o, le);
  const u32 = (o: number) => v.getUint32(o, le);
  const entries = (ifd: number) => {
    const n = u16(ifd);
    return Array.from({ length: n }, (_, i) => ifd + 2 + i * 12);
  };
  const ascii = (e: number) => {
    const count = u32(e + 4);
    const off = count > 4 ? t + u32(e + 8) : e + 8;
    let s = "";
    for (let i = 0; i < count - 1 && off + i < v.byteLength; i++) s += String.fromCharCode(v.getUint8(off + i));
    return s;
  };
  let date: string | null = null;
  for (const e of entries(t + u32(t + 4))) {
    const tag = u16(e);
    if (tag === 0x0132) date ??= ascii(e);
    if (tag === 0x8769) {
      for (const x of entries(t + u32(e + 8))) if (u16(x) === 0x9003) date = ascii(x);
    }
  }
  const m = date?.match(/^(\d{4}):(\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
