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
}

export function useSectionLock(
  plotId: string,
  sectionId: string,
  options?: UseSectionLockOptions,
): UseSectionLockReturn {
  const { user } = useAuth();
  const awareness = options?.awareness ?? null;
  const [lockState, setLockState] = useState<LockState>("unknown");
  const [lockedBy, setLockedBy] = useState<SectionAwarenessState["user"] | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!awareness || !user) return;

    const updateState = () => {
      const newLockState = getLockState(awareness, sectionId, user.id);
      const newLockedBy = getLockedBy(awareness, sectionId);
      setLockState(newLockState);
      setLockedBy(newLockedBy);
    };

    updateState();

    const cleanup = onAwarenessChange(awareness, () => {
      updateState();
    });

    return cleanup;
  }, [awareness, sectionId, user]);

  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    if (!awareness) return false;

    const currentState = getLockState(awareness, sectionId, user.id);
    if (currentState === "locked-by-other") return false;

    setEditingSection(awareness, sectionId, {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    setLockState("locked-by-me");
    return true;
  }, [awareness, sectionId, user]);

  const releaseLock = useCallback(() => {
    if (!user) return;
    if (!awareness) return;

    clearEditingSection(awareness, {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    setLockState("unlocked");
    setLockedBy(null);
  }, [awareness, user]);

  return { lockState, lockedBy, acquireLock, releaseLock };
}
