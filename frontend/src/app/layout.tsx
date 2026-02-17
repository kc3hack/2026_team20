import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
