import "./globals.css";
import type { Metadata } from "next";
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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
