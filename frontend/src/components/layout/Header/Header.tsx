"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/layout/MobileNav/MobileNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import styles from "./Header.module.scss";

type HeaderProps = {
  searchSlot?: ReactNode;
  userMenuSlot?: ReactNode;
};

/**
 * Header コンポーネント
 *
 * 現在は useAuth を使用しているため "use client" が必須となっており、
 * ルートレイアウトで読み込まれることでヘッダー全体がクライアントレンダリングされます。
 *
 * 将来的には、認証依存部分コンポーネントのみを分離し、
 * ヘッダーの静的な骨格（ロゴなど）を Server Component 化することで
 * FCP (First Contentful Paint) を改善する余地があります。
 */

export function Header({ searchSlot, userMenuSlot }: HeaderProps) {
  const { isLoading, isAuthenticated } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo.svg" alt="Plot Platform" width={120} height={32} priority />
        </Link>

        <div className={styles.center}>{searchSlot ?? <Skeleton className="h-10 w-64" />}</div>

        <div className={styles.right}>
          {isLoading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : isAuthenticated ? (
            (userMenuSlot ?? <Skeleton className="h-8 w-8 rounded-full" />)
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">ログイン</Link>
            </Button>
          )}
        </div>

        <div className={styles.mobileMenu}>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
