"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/layout/MobileNav/MobileNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import styles from "./Header.module.scss";

type HeaderProps = {
  searchSlot?: ReactNode;
  userMenuSlot?: ReactNode;
};

export function Header({ searchSlot, userMenuSlot }: HeaderProps) {
  const { isLoading } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo.svg" alt="Plot Platform" width={120} height={32} priority />
        </Link>

        <div className={styles.center}>
          {/* Slot 未提供時は Skeleton を表示し、将来のコンポーネント統合（検索バー等）を促す */}
          {searchSlot ?? <Skeleton className="h-10 w-64" />}
        </div>

        <div className={styles.right}>
          {isLoading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : (
            // Slot 未提供時は Skeleton を表示し、将来のコンポーネント統合（ユーザーメニュー等）を促す
            (userMenuSlot ?? <Skeleton className="h-8 w-8 rounded-full" />)
          )}
        </div>

        <div className={styles.mobileMenu}>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
