"use client";

import { Home, LogIn, LogOut, Plus, Search } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import styles from "./MobileNav.module.scss";

type MobileNavProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  toggleButtonRef: RefObject<HTMLButtonElement | null>;
};

export function MobileNav({ isOpen, onOpenChange, toggleButtonRef }: MobileNavProps) {
  const { isAuthenticated, signOut } = useAuth();

  const closeSheet = () => onOpenChange(false);

  const handleSignOut = async () => {
    closeSheet();
    await signOut();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={true}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (toggleButtonRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (toggleButtonRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>メニュー</SheetTitle>
        </SheetHeader>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navItem} onClick={closeSheet}>
            <Home size={20} />
            <span>ホーム</span>
          </Link>

          <Link href="/search" className={styles.navItem} onClick={closeSheet}>
            <Search size={20} />
            <span>検索</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link href="/plots/new" className={styles.navItem} onClick={closeSheet}>
                <Plus size={20} />
                <span>作成</span>
              </Link>

              <button type="button" className={styles.navItem} onClick={handleSignOut}>
                <LogOut size={20} />
                <span>ログアウト</span>
              </button>
            </>
          ) : (
            <Link href="/auth/login" className={styles.navItem} onClick={closeSheet}>
              <LogIn size={20} />
              <span>ログイン</span>
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
