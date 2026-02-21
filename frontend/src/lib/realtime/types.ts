// リアルタイム編集の型定義 — @see docs/frontend/10-realtime-editing.md

/** Y.js Awareness で共有するセクション編集状態 */
export interface SectionAwarenessState {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  /** null = 閲覧のみ（ロック未取得） */
  editingSectionId: string | null;
}

/** Supabase Realtime Broadcast 経由の Y.js 同期メッセージ */
export interface YjsSyncMessage {
  type: "yjs-update";
  /** Y.js 更新バイナリの Base64 エンコード */
  update: string;
  /** 自分のメッセージを無視するための送信者ID */
  senderId: string;
}

/**
 * セクションのロック状態
 * unknown=Awareness接続前, unlocked=空き, locked-by-me=自分が編集中, locked-by-other=他ユーザーが編集中
 */
export type LockState =
  | "unknown"
  | "unlocked"
  | "locked-by-me"
  | "locked-by-other";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/** Supabase Realtime チャネル設定（Plot 単位で 1 つ: `plot:{plotId}`） */
export interface RealtimeChannelConfig {
  channelName: string;
  plotId: string;
}
