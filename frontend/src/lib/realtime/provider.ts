import SupabaseProvider from "y-supabase";
import * as Y from "yjs";
import type { ConnectionStatus } from "./types";

export interface RealtimeProviderOptions {
  plotId: string;
  supabaseClient: unknown;
  useMock?: boolean;
  /** @default "yjs_documents" */
  tableName?: string;
  /** @default "data" */
  columnName?: string;
}

export interface RealtimeProviderState {
  doc: Y.Doc;
  provider: SupabaseProvider | null;
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
    tableName = "yjs_documents",
    columnName = "data",
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

  const provider = new SupabaseProvider(doc, supabaseClient as never, {
    channel: channelName,
    tableName,
    columnName,
    id: plotId,
  });

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
