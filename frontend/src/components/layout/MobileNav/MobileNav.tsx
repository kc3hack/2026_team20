import { Home, LogIn, LogOut, Menu, Plus, Search } from "lucide-react";
import Link from "next/link";
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
  const { isAuthenticated, signOut } = useAuth();

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

          {isAuthenticated ? (
            <>
              <SheetClose asChild>
                <Link href="/plots/new" className={styles.navItem}>
                  <Plus size={20} />
                  <span>作成</span>
                </Link>
              </SheetClose>

              <SheetClose asChild>
                <button type="button" className={styles.navItem} onClick={() => signOut()}>
                  <LogOut size={20} />
                  <span>ログアウト</span>
                </button>
              </SheetClose>
            </>
          ) : (
            <SheetClose asChild>
              <Link href="/auth/login" className={styles.navItem}>
                <LogIn size={20} />
                <span>ログイン</span>
              </Link>
            </SheetClose>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
