"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import styles from "./UserMenu.module.scss";

/**
 * displayName からイニシャルを取得する
 * 例: "田中 太郎" → "田太", "John Doe" → "JD", "" → "?"
 */
function getInitials(displayName: string): string {
  if (!displayName.trim()) return "?";
  return displayName
    .split(/\s+/)
    .map((word) => Array.from(word)[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const displayName = user.displayName ?? "";
  const email = user.email ?? "";
  const avatarUrl = user.avatarUrl ?? undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={styles.trigger}>
        <Avatar>
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className={styles.userInfo}>
            <span className={styles.displayName}>{displayName}</span>
            <span className={styles.email}>{email}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled>プロフィール（実装中...）</DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => signOut()}>ログアウト</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
