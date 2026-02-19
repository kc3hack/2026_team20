"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { LoginButton } from "@/components/auth/LoginButton/LoginButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeRedirectPath } from "@/lib/auth/sanitizeRedirectPath";
import styles from "./page.module.scss";

export default function LoginPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawNext = searchParams.get("next");
  const next = sanitizeRedirectPath(rawNext);

  const error = searchParams.get("error");
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    if (error) {
      toast.error("ログインに失敗しました。もう一度お試しください。");
      const cleaned = new URLSearchParams(searchParamsString);
      cleaned.delete("error");
      const remaining = cleaned.toString();
      router.replace(`/auth/login${remaining ? `?${remaining}` : ""}`);
    }
  }, [error, router, searchParamsString]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(next ?? "/");
    }
  }, [isLoading, isAuthenticated, router, next]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Skeleton className="h-64 w-full max-w-sm" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>ログイン</h1>
          <p className={styles.description}>アカウントを連携してログインしてください</p>
        </div>

        <div className={styles.buttons}>
          <LoginButton provider="google" redirectTo={next} />
          <LoginButton provider="github" redirectTo={next} />
        </div>
      </div>
    </div>
  );
}
