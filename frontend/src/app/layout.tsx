import "./globals.css";
import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer/Footer";
import { Header } from "@/components/layout/Header/Header";
import Providers from "@/providers/Providers";

export const metadata: Metadata = {
  title: "Plot Platform",
  description: "「架空の欲しいもの」をみんなで作り上げる Wiki 共同編集プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <Providers>
          <Header />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
