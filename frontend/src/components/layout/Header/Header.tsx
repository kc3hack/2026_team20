"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { MobileNav } from "@/components/layout/MobileNav/MobileNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import styles from "./Header.module.scss";

type HeaderProps = {
  searchSlot?: ReactNode;
  userMenuSlot?: ReactNode;
};

export function Header({ searchSlot, userMenuSlot }: HeaderProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isLoading } = useAuth();
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

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
          ) : (
            (userMenuSlot ?? <Skeleton className="h-8 w-8 rounded-full" />)
          )}
        </div>

        <div className={styles.mobileMenu}>
          <Button
            ref={toggleButtonRef}
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            aria-label="メニューを開く"
          >
            <Menu size={24} />
          </Button>
        </div>
      </div>

      <MobileNav
        isOpen={isMobileNavOpen}
        onOpenChange={setIsMobileNavOpen}
        toggleButtonRef={toggleButtonRef}
      />
    </header>
  );
}
