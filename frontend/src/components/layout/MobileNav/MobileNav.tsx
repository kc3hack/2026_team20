"use client";

import { Check, Home, LogIn, LogOut, Menu, Monitor, Moon, Plus, Search, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import styles from "./MobileNav.module.scss";

export function MobileNav() {
  const { isAuthenticated, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const createHref = isAuthenticated ? "/plots/new" : "/auth/login?redirectTo=/plots/new";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="メニューを開く">
          <Menu size={24} />
        </Button>
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>メニュー</SheetTitle>
        </SheetHeader>

        <nav className={styles.nav}>
          <SheetClose asChild>
            <Link href="/" className={styles.navItem}>
              <Home size={20} />
              <span>ホーム</span>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link href="/search" className={styles.navItem}>
              <Search size={20} />
              <span>検索</span>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link href={createHref} className={styles.navItem}>
              <Plus size={20} />
              <span>作成</span>
            </Link>
          </SheetClose>

          {/* /profile/undefined 防止: user.id が存在する場合のみマイページリンクを表示 */}
          {isAuthenticated && user?.id && (
            <SheetClose asChild>
              <Link href={`/profile/${user.id}`} className={styles.navItem}>
                <User size={20} />
                <span>マイページ</span>
              </Link>
            </SheetClose>
          )}

          {isAuthenticated ? (
            <SheetClose asChild>
              <button type="button" className={styles.navItem} onClick={() => signOut()}>
                <LogOut size={20} />
                <span>ログアウト</span>
              </button>
            </SheetClose>
          ) : (
            <SheetClose asChild>
              <Link href="/auth/login" className={styles.navItem}>
                <LogIn size={20} />
                <span>ログイン</span>
              </Link>
            </SheetClose>
          )}

          <div className={styles.themeSection}>
            <span className={styles.themeSectionLabel}>テーマ</span>
            <div className={styles.themeButtons}>
              {([
                { value: "light", label: "ライト", icon: Sun },
                { value: "dark", label: "ダーク", icon: Moon },
                { value: "system", label: "システム", icon: Monitor },
              ] as const).map(({ value, label, icon: Icon }) => (
                <SheetClose asChild key={value}>
                  <button
                    type="button"
                    className={styles.navItem}
                    onClick={() => setTheme(value)}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                    {mounted && theme === value && (
                      <Check size={16} className={styles.checkIcon} />
                    )}
                  </button>
                </SheetClose>
              ))}
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
