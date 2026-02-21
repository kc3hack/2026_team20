"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ReactNode } from "react";
import styles from "./UserAvatarLink.module.scss";

export type UserAvatarLinkProps = {
  /** ユーザー情報。displayName は必須 */
  user: {
    displayName: string;
    avatarUrl: string | null;
  };
  /** Avatar のサイズ */
  size?: "default" | "sm" | "lg";
  /** 追加のクラス名（既存のスタイルを引き継ぐため） */
  className?: string;
  /** リンクを無効化（自分自身のプロフィールページ等で使用） */
  disableLink?: boolean;
  /** children を指定した場合は Avatar を上書き */
  children?: ReactNode;
};

/**
 * ユーザーのアバターをクリックするとプロフィールページに遷移するリンクコンポーネント。
 * - `/profile/${displayName}` へのリンクを生成
 * - `disableLink` でリンクを無効化可能
 * - `className` で既存のスタイル（avatarSm 等）を引き継ぎ可能
 */
export function UserAvatarLink({
  user,
  size = "sm",
  className,
  disableLink = false,
  children,
}: UserAvatarLinkProps) {
  const initials = user.displayName.slice(0, 2);

  const avatar = children ?? (
    <Avatar size={size} className={className}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );

  if (disableLink) {
    return avatar;
  }

  return (
    <Link href={`/profile/${user.displayName}`} className={styles.link}>
      {avatar}
    </Link>
  );
}
