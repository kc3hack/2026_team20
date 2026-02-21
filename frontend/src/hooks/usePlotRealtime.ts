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
  return process.env.NEXT_PUBLIC_USE_MOCK === "true";
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

const NO_PLOT_RETURN: UsePlotRealtimeReturn = {
  ydoc: null,
  provider: null,
  awareness: null,
  lockStates: EMPTY_LOCK_STATES,
  connectionStatus: "disconnected",
};

function computeLockStatesFromAwareness(
  awareness: AwarenessLike,
  currentUserId: string,
): Map<string, { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }> {
  const states = awareness.getStates();
  const newLockStates = new Map<
    string,
    { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }
  >();

  for (const [, awarenessState] of states) {
    if (!awarenessState?.editingSectionId) continue;
    const sectionId = awarenessState.editingSectionId;

    const lockState = getLockState(awareness, sectionId, currentUserId);
    const lockedByUser = getLockedBy(awareness, sectionId);
    newLockStates.set(sectionId, { lockState, lockedBy: lockedByUser });
  }

  return newLockStates;
}

export function usePlotRealtime(plotId: string): UsePlotRealtimeReturn {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [lockStates, setLockStates] = useState(EMPTY_LOCK_STATES);
  const providerStateRef = useRef<RealtimeProviderState | null>(null);
  const awarenessRef = useRef<AwarenessLike | null>(null);

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
    if (!user || !awarenessRef.current) return;
    setLockStates(computeLockStatesFromAwareness(awarenessRef.current, user.id));
  }, [user]);

  // モックモード: BroadcastChannel ベースのAwarenessでタブ間ロック同期を実現
  useEffect(() => {
    if (!isMockMode() || !plotId || !userRef.current) return;

    const awareness = createMockAwareness(plotId);
    awarenessRef.current = awareness;
    setConnectionStatus("connected");

    const recompute = () => {
      if (!userRef.current) return;
      setLockStates(computeLockStatesFromAwareness(awareness, userRef.current.id));
    };

    recompute();

    const cleanupAwareness = onAwarenessChange(awareness, recompute);

    return () => {
      cleanupAwareness();
      awareness.destroy();
      awarenessRef.current = null;
      setConnectionStatus("disconnected");
      setLockStates(EMPTY_LOCK_STATES);
    };
  }, [plotId]);

  // 本番モード: y-supabase SupabaseProvider 経由のAwareness
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

    if (state.provider?.awareness) {
      // y-protocols の Awareness は {[x: string]: any} 型 → AwarenessLike にキャスト
      const awareness = state.provider.awareness as unknown as AwarenessLike;
      awarenessRef.current = awareness;

      const recompute = () => {
        if (!userRef.current) return;
        setLockStates(computeLockStatesFromAwareness(awareness, userRef.current.id));
      };

      recompute();
      cleanupAwareness = onAwarenessChange(awareness, recompute);
    }

    return () => {
      cleanupAwareness?.();
      destroyRealtimeProvider(state);
      providerStateRef.current = null;
      awarenessRef.current = null;
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
