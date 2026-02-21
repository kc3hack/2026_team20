import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveSafeAvatarUrl } from "@/lib/api/avatar-url";
import styles from "./UserCard.module.scss";

type UserCardProps = {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

function getInitials(name: string): string {
  return name.slice(0, 2);
}

export function UserCard({ user }: UserCardProps) {
  const avatarUrl = resolveSafeAvatarUrl(user.avatarUrl);

  return (
    <Link href={`/profile/${user.displayName}`} className={styles.card}>
      <Avatar size="sm">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={user.displayName} />
        ) : null}
        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
      </Avatar>
      <span className={styles.displayName}>{user.displayName}</span>
    </Link>
  );
}
