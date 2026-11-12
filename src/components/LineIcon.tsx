/** タブと同じ線のアイコン（24 の枠・線の太さ 1.8・角は丸く）。絵文字のかわりに使う */
const PATHS = {
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.6-2h5.4l1.6 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  // 並んだ3つのグラス（飲み比べ）
  flight: (
    <>
      <path d="M3.5 7h4l-.6 10.5h-2.8zM10 7h4l-.6 10.5h-2.8zM16.5 7h4l-.6 10.5h-2.8z" />
      <path d="M2.5 20.5h19" />
    </>
  ),
  compare: <path d="M12 3.5l8 5.8-3 9.2H7l-3-9.2z" />,
  share: (
    <>
      <path d="M12 15V4M8 7.5 12 3.5l4 4" />
      <path d="M6 11H5v9.5h14V11h-1" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  // 脚つきのグラス（飲み方）
  glass: (
    <>
      <path d="M7 3.5h10l-.6 5.2a4.4 4.4 0 0 1-8.8 0z" />
      <path d="M12 13.2v6.3M8.5 20.5h7" />
    </>
  ),
  // きらきら（AI）
  sparkle: (
    <>
      <path d="M10.5 4l1.7 4.8 4.8 1.7-4.8 1.7-1.7 4.8-1.7-4.8L4 10.5l4.8-1.7z" />
      <path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
};

export type IconName = keyof typeof PATHS;

export default function LineIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="line-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
