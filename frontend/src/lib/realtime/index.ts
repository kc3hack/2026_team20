export type {
  ConnectionStatus,
  LockState,
  RealtimeChannelConfig,
  SectionAwarenessState,
  YjsSyncMessage,
} from "./types";

export { encodeYjsUpdate, decodeYjsUpdate } from "./encoding";

export {
  createRealtimeChannel,
  subscribeToChannel,
  unsubscribeFromChannel,
} from "./channel";
export type { ChannelCallbacks, ChannelState } from "./channel";

export {
  createAwareness,
  setEditingSection,
  clearEditingSection,
  getLockState,
  getLockedBy,
  onAwarenessChange,
} from "./awareness";

export { createMockAwareness } from "./mockAwareness";

export {
  syncYjsUpdate,
  broadcastUpdate,
  receiveUpdate,
  requestInitialState,
  sendStateVector,
  ORIGIN_REMOTE,
  ORIGIN_LOCAL,
} from "./sync";

export {
  createRealtimeProvider,
  destroyRealtimeProvider,
} from "./provider";
export type {
  RealtimeProviderOptions,
  RealtimeProviderState,
} from "./provider";

export { SupabaseBroadcastProvider } from "./yjsProvider";
export type { BroadcastProviderConfig } from "./yjsProvider";
