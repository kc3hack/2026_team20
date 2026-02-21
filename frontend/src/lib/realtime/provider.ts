import { SupabaseBroadcastProvider } from "./yjsProvider";
import * as Y from "yjs";
import type { ConnectionStatus } from "./types";

export interface RealtimeProviderOptions {
  plotId: string;
  supabaseClient: unknown;
  useMock?: boolean;
}

export interface RealtimeProviderState {
  doc: Y.Doc;
  provider: SupabaseBroadcastProvider | null;
  channelName: string;
  isMock: boolean;
  status: ConnectionStatus;
}

export function createRealtimeProvider(
  options: RealtimeProviderOptions,
): RealtimeProviderState {
  const {
    plotId,
    supabaseClient,
    useMock = false,
  } = options;

  if (!plotId) {
    throw new Error("plotId is required");
  }

  const channelName = `plot:${plotId}`;
  const doc = new Y.Doc();

  if (useMock) {
    return {
      doc,
      provider: null,
      channelName,
      isMock: true,
      status: "disconnected",
    };
  }

  // SupabaseBroadcastProvider は Supabase Realtime Broadcast で
  // Y.js ドキュメント更新と Awareness をリアルタイム同期する。
  // DB テーブルへの永続化は行わず、既存の REST API で管理する。
  const provider = new SupabaseBroadcastProvider(
    doc,
    supabaseClient as never,
    { channel: channelName },
  );

  return {
    doc,
    provider,
    channelName,
    isMock: false,
    status: "connecting",
  };
}

export function destroyRealtimeProvider(state: RealtimeProviderState): void {
  if (state.provider) {
    state.provider.destroy();
  }
  state.doc.destroy();
  state.status = "disconnected";
}
