import styles from "./layout.module.scss";
import "./globals.css";
import type { Metadata } from "next";
import { UserMenu } from "@/components/auth/UserMenu/UserMenu";
import { Footer } from "@/components/layout/Footer/Footer";
import { Header } from "@/components/layout/Header/Header";
import { SearchBar } from "@/components/search/SearchBar/SearchBar";
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
      <body className={styles.body}>
        <Providers>
          {/* Header は useAuth を使用しているため、必ず Providers の子としてレンダリングする必要がある */}
          <Header searchSlot={<SearchBar />} userMenuSlot={<UserMenu />} />
          <main className={styles.main}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
