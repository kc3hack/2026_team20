"use client";

import { useEffect, useRef, useState } from "react";
import {
  createRealtimeProvider,
  destroyRealtimeProvider,
} from "@/lib/realtime/provider";
import type { RealtimeProviderState } from "@/lib/realtime/provider";
import type { AwarenessLike } from "@/lib/realtime/awareness";
import { onAwarenessChange, getLockState, getLockedBy } from "@/lib/realtime/awareness";
import { createMockAwareness } from "@/lib/realtime/mockAwareness";
import type {
  ConnectionStatus,
  LockState,
  SectionAwarenessState,
} from "@/lib/realtime/types";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

function isMockMode(): boolean {
  return (
    process.env.NODE_ENV === "test" &&
    process.env.NEXT_PUBLIC_USE_MOCK === "true"
  );
}

export interface UsePlotRealtimeReturn {
  ydoc: RealtimeProviderState["doc"] | null;
  provider: RealtimeProviderState["provider"];
  awareness: AwarenessLike | null;
  lockStates: Map<string, { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }>;
  connectionStatus: ConnectionStatus;
}

const EMPTY_LOCK_STATES = new Map<
  string,
  { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }
>();

const EMPTY_BROADCAST_LOCKS = new Map<string, SectionAwarenessState["user"]>();

const NO_PLOT_RETURN: UsePlotRealtimeReturn = {
  ydoc: null,
  provider: null,
  awareness: null,
  lockStates: EMPTY_LOCK_STATES,
  connectionStatus: "disconnected",
};

function computeLockStatesFromAwareness(
  awareness: AwarenessLike,
  currentUserId: string | null,
): Map<string, { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }> {
  const states = awareness.getStates();
  const normalizedCurrentUserId = currentUserId ?? "__anonymous_viewer__";
  const newLockStates = new Map<
    string,
    { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }
  >();

  for (const [, awarenessState] of states) {
    if (!awarenessState?.editingSectionId) continue;
    const sectionId = awarenessState.editingSectionId;

    const lockState = getLockState(awareness, sectionId, normalizedCurrentUserId);
    const lockedByUser = getLockedBy(awareness, sectionId);
    newLockStates.set(sectionId, { lockState, lockedBy: lockedByUser });
  }

  return newLockStates;
}

function mergeLockStates(
  awarenessLockStates: Map<string, { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }>,
  broadcastLockStates: Map<string, SectionAwarenessState["user"]>,
  currentUserId: string | null,
): Map<string, { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }> {
  const merged = new Map(awarenessLockStates);

  for (const [sectionId, user] of broadcastLockStates) {
    if (merged.has(sectionId)) continue;
    merged.set(sectionId, {
      lockState: user.id === currentUserId ? "locked-by-me" : "locked-by-other",
      lockedBy: user,
    });
  }

  return merged;
}

export function usePlotRealtime(plotId: string): UsePlotRealtimeReturn {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [lockStates, setLockStates] = useState(EMPTY_LOCK_STATES);
  const providerStateRef = useRef<RealtimeProviderState | null>(null);
  const awarenessRef = useRef<AwarenessLike | null>(null);
  const broadcastLocksRef = useRef(EMPTY_BROADCAST_LOCKS);

  // user をrefで保持し、useEffect の依存配列から除外する。
  // user オブジェクトはレンダーごとに新しい参照になることがあり、
  // 依存配列に含めると provider/awareness の再生成ループを引き起こすため。
  const userRef = useRef(user);
  userRef.current = user;

  // user が null → non-null に変わったタイミングで、
  // 既に存在する awareness から lockStates を再計算する。
  // provider/awareness の初期化完了より user の解決が遅い場合に
  // lockStates が空のまま残る問題を防ぐ。
  useEffect(() => {
    if (!awarenessRef.current) return;
    const awarenessLockStates = computeLockStatesFromAwareness(
      awarenessRef.current,
      user?.id ?? null,
    );
    setLockStates(mergeLockStates(awarenessLockStates, broadcastLocksRef.current, user?.id ?? null));
  }, [user]);

  // モックモード: BroadcastChannel ベースのAwarenessでタブ間ロック同期を実現
  useEffect(() => {
    if (!isMockMode() || !plotId || !userRef.current) return;

    const awareness = createMockAwareness(plotId);
    awarenessRef.current = awareness;
    setConnectionStatus("connected");

    const recompute = () => {
      const awarenessLockStates = computeLockStatesFromAwareness(
        awareness,
        userRef.current?.id ?? null,
      );
      setLockStates(
        mergeLockStates(
          awarenessLockStates,
          broadcastLocksRef.current,
          userRef.current?.id ?? null,
        ),
      );
    };

    recompute();

    const cleanupAwareness = onAwarenessChange(awareness, recompute);

    return () => {
      cleanupAwareness();
      awareness.destroy();
      awarenessRef.current = null;
      broadcastLocksRef.current = EMPTY_BROADCAST_LOCKS;
      setConnectionStatus("disconnected");
      setLockStates(EMPTY_LOCK_STATES);
    };
  }, [plotId]);

  // 本番モード: SupabaseBroadcastProvider 経由のリアルタイム同期・Awareness
  useEffect(() => {
    if (isMockMode() || !plotId) return;
    const supabaseClient = createClient();

    const state = createRealtimeProvider({
      plotId,
      supabaseClient,
      useMock: false,
    });

    providerStateRef.current = state;
    setConnectionStatus(state.status);

    let cleanupAwareness: (() => void) | undefined;
    let cleanupProviderEvents: (() => void) | undefined;

    const provider = state.provider;

    if (provider) {
      // Awareness をフックに接続
      const awareness = provider.awareness as unknown as AwarenessLike;
      awarenessRef.current = awareness;

      const recompute = () => {
        const awarenessLockStates = computeLockStatesFromAwareness(
          awareness,
          userRef.current?.id ?? null,
        );
        setLockStates(
          mergeLockStates(
            awarenessLockStates,
            broadcastLocksRef.current,
            userRef.current?.id ?? null,
          ),
        );
      };

      const handleStatus = (statusObj: { status?: ConnectionStatus }) => {
        if (statusObj?.status) {
          setConnectionStatus(statusObj.status);
        }
      };

      const handleError = (...args: unknown[]) => {
        console.error("[usePlotRealtime] Realtime error:", args);
        setConnectionStatus("disconnected");
      };

      const handleConnect = () => {
        console.info("[usePlotRealtime] Connected to Supabase Realtime channel");
      };

      const handleSectionLock = (
        sectionId: string,
        lockedUser: SectionAwarenessState["user"],
      ) => {
        const nextBroadcastLocks = new Map(broadcastLocksRef.current);
        nextBroadcastLocks.set(sectionId, lockedUser);
        broadcastLocksRef.current = nextBroadcastLocks;
        recompute();
      };

      const handleSectionUnlock = (sectionId: string) => {
        if (!broadcastLocksRef.current.has(sectionId)) return;

        const nextBroadcastLocks = new Map(broadcastLocksRef.current);
        nextBroadcastLocks.delete(sectionId);
        broadcastLocksRef.current = nextBroadcastLocks;
        recompute();
      };

      provider.on("status", handleStatus);
      provider.on("error", handleError);
      provider.on("connect", handleConnect);
      provider.on("section-lock", handleSectionLock);
      provider.on("section-unlock", handleSectionUnlock);

      cleanupProviderEvents = () => {
        provider.off("status", handleStatus);
        provider.off("error", handleError);
        provider.off("connect", handleConnect);
        provider.off("section-lock", handleSectionLock);
        provider.off("section-unlock", handleSectionUnlock);
      };

      recompute();
      cleanupAwareness = onAwarenessChange(awareness, recompute);
    }

    return () => {
      cleanupAwareness?.();
      cleanupProviderEvents?.();
      destroyRealtimeProvider(state);
      providerStateRef.current = null;
      awarenessRef.current = null;
      broadcastLocksRef.current = EMPTY_BROADCAST_LOCKS;
      setConnectionStatus("disconnected");
      setLockStates(EMPTY_LOCK_STATES);
    };
  }, [plotId]);

  if (!plotId) {
    return NO_PLOT_RETURN;
  }

  return {
    ydoc: providerStateRef.current?.doc ?? null,
    provider: providerStateRef.current?.provider ?? null,
    awareness: awarenessRef.current,
    lockStates,
    connectionStatus,
  };
}
