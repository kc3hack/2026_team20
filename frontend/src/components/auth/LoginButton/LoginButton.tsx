"use client";

import { useCallback } from "react";
import { GitHubIcon, GoogleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import styles from "./LoginButton.module.scss";
import type { LoginButtonProps } from "./types";

const providerConfig = {
  github: {
    label: "GitHub でログイン",
    Icon: GitHubIcon,
    variant: "default" as const,
    styleClass: styles.github,
  },
  google: {
    label: "Google でログイン",
    Icon: GoogleIcon,
    variant: "outline" as const,
    styleClass: styles.google,
  },
};

export function LoginButton({ provider, redirectTo, className }: LoginButtonProps) {
  const { signInWithGitHub, signInWithGoogle } = useAuth();

  const { label, Icon, variant, styleClass } = providerConfig[provider];

  const handleClick = useCallback(() => {
    void (provider === "github" ? signInWithGitHub(redirectTo) : signInWithGoogle(redirectTo));
  }, [provider, signInWithGitHub, signInWithGoogle, redirectTo]);

  return (
    <Button variant={variant} size="lg" className={cn(styleClass, className)} onClick={handleClick}>
      <Icon className={styles.icon} />
      {label}
    </Button>
  );
}
