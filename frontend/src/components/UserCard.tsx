import type { UserProfile } from "@/lib/api";
import styles from "./UserCard.module.scss";

interface UserCardProps {
  user: UserProfile;
  isOwnProfile?: boolean;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function UserCard({ user, isOwnProfile }: UserCardProps) {
  return (
    <div className={styles.card}>
      {/* Decorative backdrop */}
      <div className={styles.backdrop} />

      <div className={styles.content}>
        <div className={styles.avatarWrap}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className={styles.avatar}
              width={96}
              height={96}
            />
          ) : (
            <span className={styles.avatarFallback}>
              {(user.displayName?.[0] ?? "U").toUpperCase()}
            </span>
          )}
          <div className={styles.statusDot} />
        </div>

        <h1 className={styles.displayName}>{user.displayName}</h1>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{user.plotCount}</span>
            <span className={styles.statLabel}>Plots</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {user.contributionCount}
            </span>
            <span className={styles.statLabel}>Contributions</span>
          </div>
        </div>

        <p className={styles.joinDate}>
          {formatDate(user.createdAt)} から参加
        </p>

        {isOwnProfile && (
          <a href="/auth/settings" className={styles.settingsLink}>
            <svg
              className={styles.settingsIcon}
              viewBox="0 0 20 20"
              fill="currentColor"
              width={16}
              height={16}
            >
              <path
                fillRule="evenodd"
                d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.179.971.405 1.416.674l1.39-.554a1 1 0 011.164.354l.68 1.178a1 1 0 01-.186 1.248l-1.094.92c.056.51.056 1.03 0 1.54l1.094.92a1 1 0 01.186 1.248l-.68 1.178a1 1 0 01-1.164.354l-1.39-.554c-.445.27-.919.495-1.416.674l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a7.957 7.957 0 01-1.416-.674l-1.39.554a1 1 0 01-1.164-.354l-.68-1.178a1 1 0 01.186-1.248l1.094-.92a7.911 7.911 0 010-1.54l-1.094-.92a1 1 0 01-.186-1.248l.68-1.178a1 1 0 011.164-.354l1.39.554c.445-.27.919-.495 1.416-.674l.295-1.473zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            アカウント設定
          </a>
        )}
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`}>
      <div className={styles.backdrop} />
      <div className={styles.content}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatarFallback} />
        </div>
        <div className={styles.displayName}>&nbsp;</div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>&nbsp;</span>
            <span className={styles.statLabel}>&nbsp;&nbsp;&nbsp;</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>&nbsp;</span>
            <span className={styles.statLabel}>&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
