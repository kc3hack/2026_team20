import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  return (
    <Link href={`/profile/${user.id}`} className={styles.card}>
      <Avatar size="sm">
        {user.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
        ) : null}
        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
      </Avatar>
      <span className={styles.displayName}>{user.displayName}</span>
    </Link>
  );
}
