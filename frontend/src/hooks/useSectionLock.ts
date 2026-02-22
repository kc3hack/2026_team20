"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearEditingSection,
  getLockState,
  getLockedBy,
  onAwarenessChange,
  setEditingSection,
} from "@/lib/realtime/awareness";
import type { LockState, SectionAwarenessState } from "@/lib/realtime/types";
import type { SupabaseBroadcastProvider } from "@/lib/realtime/yjsProvider";
import { useAuth } from "@/providers/AuthProvider";

type AwarenessLike = Parameters<typeof getLockState>[0];

export interface UseSectionLockReturn {
  lockState: LockState;
  lockedBy: SectionAwarenessState["user"] | null;
  acquireLock: () => Promise<boolean>;
  releaseLock: () => void;
}

interface UseSectionLockOptions {
  awareness?: AwarenessLike | null;
  provider?: SupabaseBroadcastProvider | null;
}

export function useSectionLock(
  plotId: string,
  sectionId: string,
  options?: UseSectionLockOptions,
): UseSectionLockReturn {
  const { user } = useAuth();
  const awareness = options?.awareness ?? null;
  const provider = options?.provider ?? null;
  const [lockState, setLockState] = useState<LockState>("unknown");
  const [lockedBy, setLockedBy] = useState<SectionAwarenessState["user"] | null>(null);
  const [broadcastLockedBy, setBroadcastLockedBy] = useState<SectionAwarenessState["user"] | null>(null);
  const mountedRef = useRef(true);

  const recomputeFromAwareness = useCallback(() => {
    if (!awareness || !user) return;
    const newLockState = getLockState(awareness, sectionId, user.id);
    const newLockedBy = getLockedBy(awareness, sectionId);
    setLockState(newLockState);
    setLockedBy(newLockedBy);
  }, [awareness, sectionId, user]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!awareness || !user) {
      setLockState("unknown");
      setLockedBy(null);
      return;
    }

    recomputeFromAwareness();

    const cleanup = onAwarenessChange(awareness, () => {
      recomputeFromAwareness();
    });

    return cleanup;
  }, [awareness, user, recomputeFromAwareness]);

  useEffect(() => {
    if (!provider || !user) return;

    const handleSectionLock = (
      eventSectionId: string,
      eventUser: SectionAwarenessState["user"],
    ) => {
      if (eventSectionId !== sectionId) return;
      setBroadcastLockedBy(eventUser);

      if (eventUser.id === user.id) {
        setLockState("locked-by-me");
        setLockedBy(eventUser);
        return;
      }

      setLockState("locked-by-other");
      setLockedBy(eventUser);
    };

    const handleSectionUnlock = (eventSectionId: string) => {
      if (eventSectionId !== sectionId) return;
      setBroadcastLockedBy(null);
      // unlock 通知後は Awareness の最新状態を再評価して確定
      recomputeFromAwareness();
    };

    provider.on("section-lock", handleSectionLock);
    provider.on("section-unlock", handleSectionUnlock);

    return () => {
      provider.off("section-lock", handleSectionLock);
      provider.off("section-unlock", handleSectionUnlock);
    };
  }, [provider, sectionId, user, recomputeFromAwareness]);

  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    if (!awareness) return false;

    if (broadcastLockedBy && broadcastLockedBy.id !== user.id) {
      return false;
    }

    const currentState = getLockState(awareness, sectionId, user.id);
    if (currentState === "locked-by-other") return false;

    setEditingSection(awareness, sectionId, {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    provider?.broadcastLock(sectionId, {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    setLockedBy({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });
    setLockState("locked-by-me");
    return true;
  }, [awareness, sectionId, user, provider, broadcastLockedBy]);

  const releaseLock = useCallback(() => {
    if (!user) return;
    if (!awareness) return;

    clearEditingSection(awareness, {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    provider?.broadcastUnlock(sectionId);

    setBroadcastLockedBy(null);
    setLockState("unlocked");
    setLockedBy(null);
  }, [awareness, user, provider, sectionId]);

  return { lockState, lockedBy, acquireLock, releaseLock };
}
