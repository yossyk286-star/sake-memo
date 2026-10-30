import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import Buddy from "@/components/Buddy";
import ClearField from "@/components/ClearField";
import LaunchScreen from "@/components/LaunchScreen";
import TabBar from "@/components/TabBar";
import ThemeSync from "@/components/ThemeSync";
import { THEME_BOOT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "さけメモ",
  description: "飲んだお酒を記録して、だんだん詳しくなるアプリ",
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
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <LaunchScreen />
        <div className="app">{children}</div>
        <TabBar />
        <Buddy />
        <ServiceWorker />
        <ThemeSync />
        <ClearField />
      </body>
    </html>
  );
}
