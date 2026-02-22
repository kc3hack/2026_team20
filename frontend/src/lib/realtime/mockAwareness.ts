/**
 * モックモード用のAwareness実装
 *
 * Supabase不要で複数タブ間のセクションロック同期を実現するため、
 * BroadcastChannel API を使ってタブ間で状態を共有する。
 *
 * 本番では y-supabase の Awareness が同等の役割を担うが、
 * モックモードでも「他タブ = 他ユーザー」としてロック排他を検証可能にする。
 */

import type { AwarenessLike } from "./awareness";
import type { SectionAwarenessState } from "./types";

interface AwarenessMessage {
  type: "awareness-update" | "awareness-remove";
  clientID: number;
  state: SectionAwarenessState | null;
}

/**
 * モック用Awarenessを作成する。
 *
 * plotId 単位でチャネルを分離するため、異なるPlotの編集状態が混ざらない。
 * BroadcastChannel は同一オリジンの全タブで共有されるため、
 * タブを2つ開けば「2ユーザー」としてロック排他を確認できる。
 */
export function createMockAwareness(plotId: string): AwarenessLike & { destroy: () => void } {
  const clientID = Math.floor(Math.random() * 2_147_483_647);
  const states = new Map<number, SectionAwarenessState>();
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const channelName = `mock-awareness:${plotId}`;
  let channel: BroadcastChannel | null = null;

  // BroadcastChannel はブラウザ環境でのみ利用可能（SSR / テストでは無効）
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(channelName);

    channel.onmessage = (event: MessageEvent<AwarenessMessage>) => {
      const msg = event.data;
      if (msg.clientID === clientID) return;

      if (msg.type === "awareness-update" && msg.state) {
        states.set(msg.clientID, msg.state);
      } else if (msg.type === "awareness-remove") {
        states.delete(msg.clientID);
      }

      emit("update", {
        added: msg.type === "awareness-update" && !states.has(msg.clientID) ? [msg.clientID] : [],
        updated: msg.type === "awareness-update" ? [msg.clientID] : [],
        removed: msg.type === "awareness-remove" ? [msg.clientID] : [],
      });
    };
  }

  function emit(event: string, ...args: unknown[]) {
    const set = listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      cb(...args);
    }
  }

  function broadcast(msg: AwarenessMessage) {
    try {
      channel?.postMessage(msg);
    } catch {
    }
  }

  const awareness: AwarenessLike & { destroy: () => void } = {
    clientID,

    getLocalState(): SectionAwarenessState | null {
      return states.get(clientID) ?? null;
    },

    setLocalState(state: SectionAwarenessState | null): void {
      if (state) {
        states.set(clientID, state);
      } else {
        states.delete(clientID);
      }

      broadcast({
        type: state ? "awareness-update" : "awareness-remove",
        clientID,
        state,
      });

      emit("update", {
        added: [],
        updated: state ? [clientID] : [],
        removed: state ? [] : [clientID],
      });
    },

    getStates(): Map<number, SectionAwarenessState> {
      return states;
    },

    on(event: string, cb: (...args: unknown[]) => void): void {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb);
    },

    off(event: string, cb: (...args: unknown[]) => void): void {
      const set = listeners.get(event);
      if (set) {
        set.delete(cb);
      }
    },

    destroy(): void {
      broadcast({
        type: "awareness-remove",
        clientID,
        state: null,
      });

      channel?.close();
      channel = null;
      states.clear();
      listeners.clear();
    },
  };

  return awareness;
}
