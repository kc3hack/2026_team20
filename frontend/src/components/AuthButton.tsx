"use client";

import { useAuth } from "@/hooks/useAuth";
import styles from "./AuthButton.module.scss";

export default function AuthButton() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className={styles.skeleton} aria-hidden="true">
        <span className={styles.skeletonAvatar} />
      </div>
    );
  }

  if (!user) {
    return (
      <a
        href="/auth/login"
        className={styles.loginBtn}
        data-testid="login-button"
      >
        ログイン
      </a>
    );
  }

  return (
    <div className={styles.userMenu}>
      <button
        type="button"
        className={styles.avatar}
        title={user.user_metadata?.full_name ?? user.email ?? "ユーザー"}
        data-testid="user-avatar"
      >
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className={styles.avatarImg}
            width={32}
            height={32}
          />
        ) : (
          <span className={styles.avatarFallback}>
            {(
              user.user_metadata?.full_name?.[0] ??
              user.email?.[0] ??
              "U"
            ).toUpperCase()}
          </span>
        )}
      </button>

      <div className={styles.dropdown}>
        <div className={styles.dropdownHeader}>
          <span className={styles.userName}>
            {user.user_metadata?.full_name ?? "ユーザー"}
          </span>
          <span className={styles.userEmail}>{user.email}</span>
        </div>
        <div className={styles.dropdownDivider} />
        <a
          href={`/profile/${user.user_metadata?.preferred_username ?? user.id}`}
          className={styles.dropdownItem}
        >
          プロフィール
        </a>
        <button
          type="button"
          className={styles.dropdownItem}
          onClick={() => signOut()}
          data-testid="logout-button"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
