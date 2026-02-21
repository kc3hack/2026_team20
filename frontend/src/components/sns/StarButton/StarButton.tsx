"use client";

import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStar } from "@/hooks/useStar";
import { cn } from "@/lib/utils";
import styles from "./StarButton.module.scss";

type StarButtonProps = {
  plotId: string;
  initialCount: number;
  initialIsStarred: boolean;
};

export function StarButton({ plotId, initialCount, initialIsStarred }: StarButtonProps) {
  const { count, isStarred, isPending, toggleStar } = useStar(
    plotId,
    initialCount,
    initialIsStarred,
  );
  const [showPop, setShowPop] = useState(false);
  const prevIsStarred = useRef(isStarred);

  useEffect(() => {
    if (isStarred && !prevIsStarred.current) {
      setShowPop(true);
      const timer = setTimeout(() => setShowPop(false), 300);
      return () => clearTimeout(timer);
    }
    prevIsStarred.current = isStarred;
  }, [isStarred]);

  return (
    <Button variant="ghost" size="sm" onClick={toggleStar} disabled={isPending}>
      <Star
        size={16}
        fill={isStarred ? "currentColor" : "none"}
        className={cn(styles.starIcon, {
          [styles.starred]: isStarred,
          [styles.pop]: showPop,
        })}
      />
      <span>{count}</span>
    </Button>
  );
}
