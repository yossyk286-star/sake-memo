import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import Buddy from "@/components/Buddy";
import ClearField from "@/components/ClearField";
import ConfirmHost from "@/components/ConfirmSheet";
import LangGate from "@/components/LangGate";
import LaunchScreen, { LAUNCH_BOOT } from "@/components/LaunchScreen";
import TabBar from "@/components/TabBar";
import Toaster from "@/components/Toaster";
import SmoothDetails from "@/components/SmoothDetails";
import Welcome from "@/components/Welcome";
import InstallHint from "@/components/InstallHint";
import Milestones from "@/components/Milestones";
import ThemeSync from "@/components/ThemeSync";
import PressFx from "@/components/PressFx";
import { THEME_BOOT } from "@/lib/theme";
import localFont from "next/font/local";
import "./globals.css";

/**
 * 数字だけに使う丸い書体（M PLUS Rounded 1c の英数字の部分だけ。日本語はいつもの書体のまま）。
 * Google Fonts から読むと日本語の分まで250個の書体指定が全画面の CSS に入って重くなるので、英数字のファイルだけ同梱する
 */
const numFont = localFont({
  src: [
    { path: "./fonts/m-plus-rounded-1c-700-latin.woff2", weight: "700" },
    { path: "./fonts/m-plus-rounded-1c-800-latin.woff2", weight: "800" },
  ],
  variable: "--font-num",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const metadata: Metadata = {
  title: "さけメモ",
  description: "メニューを撮るだけで、どんなお酒かすぐわかる。飲んだお酒を記録して、だんだん詳しくなるアプリ",
  metadataBase: new URL("https://sake-memo.vercel.app"),
  // LINE などで URL を送ったときに出る画像と一言
  openGraph: {
    title: "さけメモ",
    description: "メニューを撮るだけで、どんなお酒かすぐわかる。飲んだお酒を記録して、だんだん詳しくなるアプリ",
    siteName: "さけメモ",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "さけメモ" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  appleWebApp: { capable: true, title: "さけメモ", statusBarStyle: "default", startupImage: startupImages() },
};

/** iPhone のホーム画面から開いたときの起動画像（縦向き）。明るさの設定に合わせて白地・黒地を出し分ける */
function startupImages() {
  const devices: [number, number, number][] = [
    [440, 956, 3],
    [430, 932, 3],
    [402, 874, 3],
    [393, 852, 3],
    [428, 926, 3],
    [390, 844, 3],
    [375, 812, 3],
    [414, 896, 3],
    [414, 896, 2],
    [375, 667, 2],
  ];
  return devices.flatMap(([w, h, r]) =>
    (["light", "dark"] as const).map((mode) => ({
      url: `/splash/splash-${mode}-${w}x${h}@${r}x.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: ${mode})`,
    })),
  );
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#11131c" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme / data-accent は THEME_BOOT が描画前に付けるので、React の食い違い警告を出さない
    <html lang="ja" className={numFont.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT + LAUNCH_BOOT }} />
      </head>
      <body>
        <LaunchScreen />
        <LangGate>
          <div className="app">{children}</div>
          <TabBar />
          <Buddy />
          <ClearField />
          <Welcome />
          <Milestones />
          <InstallHint />
          <ConfirmHost />
          <Toaster />
          <SmoothDetails />
        </LangGate>
        <ServiceWorker />
        <ThemeSync />
        <PressFx />
      </body>
    </html>
  );
}
