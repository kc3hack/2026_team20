"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import styles from "./AuthGuard.module.scss";
import type { AuthGuardProps } from "./types";

export function AuthGuard({ children, fallback, redirectTo = "/auth/login" }: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const currentPath = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // currentPath をエンコードして安全に query string に埋め込む
      // middleware.ts では URL API (searchParams.set) で自動エンコードしているため、同等の安全性を確保する
      router.replace(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoading, isAuthenticated, router, redirectTo, currentPath]);

  if (isLoading) {
    return (
      fallback ?? (
        <div className={styles.loading}>
          <Skeleton className="h-32 w-full max-w-md" />
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
