import type { ConnectionStatus, YjsSyncMessage } from "./types";

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const DEFAULT_MAX_RETRIES = 5;

export interface ChannelCallbacks {
  onMessage?: (message: YjsSyncMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: unknown) => void;
  maxRetries?: number;
}

export interface ChannelState {
  channel: unknown;
  plotId: string;
  status: ConnectionStatus;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * `plot:{plotId}` チャネルを作成する。
 * Supabase Realtime の Broadcast 機能を使い、Y.js 差分を配信する。
 */
export function createRealtimeChannel(
  client: { channel: (name: string, opts?: unknown) => unknown },
  plotId: string,
): ChannelState {
  const channelName = `plot:${plotId}`;

  const channel = client.channel(channelName, {
    config: { broadcast: { self: false } },
  });

  return {
    channel,
    plotId,
    status: "disconnected",
    retryCount: 0,
    retryTimer: null,
  };
}

export function subscribeToChannel(
  state: ChannelState,
  callbacks: ChannelCallbacks,
): void {
  const maxRetries = callbacks.maxRetries ?? DEFAULT_MAX_RETRIES;
  const channel = state.channel as {
    on: (
      event: string,
      filter: Record<string, unknown>,
      cb: (payload: { payload: YjsSyncMessage }) => void,
    ) => unknown;
    subscribe: (cb?: (status: string) => void) => unknown;
  };

  if (callbacks.onMessage) {
    const onMessage = callbacks.onMessage;
    channel.on("broadcast", { event: "yjs-update" }, (raw) => {
      onMessage(raw.payload);
    });
  }

  state.status = "connecting";

  channel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      state.status = "connected";
      state.retryCount = 0;
      callbacks.onStatusChange?.("connected");
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      state.status = "disconnected";
      callbacks.onStatusChange?.("disconnected");
      scheduleReconnect(state, callbacks, maxRetries);
    }
  });
}

function scheduleReconnect(
  state: ChannelState,
  callbacks: ChannelCallbacks,
  maxRetries: number,
): void {
  if (state.retryCount >= maxRetries) {
    callbacks.onError?.(
      new Error(`Reconnection failed after ${maxRetries} retries`),
    );
    return;
  }

  const backoff = Math.min(
    INITIAL_BACKOFF_MS * 2 ** state.retryCount,
    MAX_BACKOFF_MS,
  );
  state.retryCount++;

  state.retryTimer = setTimeout(() => {
    const channel = state.channel as {
      subscribe: (cb?: (status: string) => void) => unknown;
    };

    state.status = "connecting";

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        state.status = "connected";
        state.retryCount = 0;
        callbacks.onStatusChange?.("connected");
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        state.status = "disconnected";
        callbacks.onStatusChange?.("disconnected");
        scheduleReconnect(state, callbacks, maxRetries);
      }
    });
  }, backoff);
}

export async function unsubscribeFromChannel(
  client: { removeChannel: (channel: unknown) => Promise<unknown> },
  state: ChannelState,
): Promise<void> {
  if (state.retryTimer) {
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
  }

  await client.removeChannel(state.channel);
  state.status = "disconnected";
  state.retryCount = 0;
}
