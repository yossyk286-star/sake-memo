import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import TabBar from "@/components/TabBar";
import ThemeSync from "@/components/ThemeSync";
import { THEME_BOOT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "さけメモ",
  description: "飲んだお酒を記録して、だんだん詳しくなるアプリ",
  appleWebApp: { capable: true, title: "さけメモ", statusBarStyle: "default" },
};

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
        <div className="app">{children}</div>
        <TabBar />
        <ServiceWorker />
        <ThemeSync />
      </body>
    </html>
  );
}
