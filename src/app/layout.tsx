import type { Metadata, Viewport } from "next";
import ServiceWorker from "@/components/ServiceWorker";
import TabBar from "@/components/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "さけメモ",
  description: "飲んだお酒を記録して、だんだん詳しくなるアプリ",
  appleWebApp: { capable: true, title: "さけメモ", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#14161d" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="app">{children}</div>
        <TabBar />
        <ServiceWorker />
      </body>
    </html>
  );
}
