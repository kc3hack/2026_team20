/**
 * Y.js ドキュメントを Supabase Realtime Broadcast 経由で同期するプロバイダー。
 *
 * y-supabase (alpha) の代替として、以下の機能を提供する:
 * - Y.js ドキュメント更新の Broadcast 送受信
 * - y-protocols Awareness の Broadcast 送受信
 * - 接続ステータス管理
 *
 * y-supabase と異なり、DB テーブル（yjs_documents）への永続化は行わない。
 * セクション内容の永続化は既存の REST API（PUT /sections/:id）で管理される。
 */
import * as Y from "yjs";
import type { ConnectionStatus } from "./types";

// ----- Awareness protocol (lazy import) -----
// y-protocols は CJS なので dynamic require でロードし、
// テスト環境では mock 可能にする。
let awarenessProtocol: {
  Awareness: new (doc: Y.Doc) => AwarenessInstance;
  encodeAwarenessUpdate: (awareness: AwarenessInstance, clients: number[]) => Uint8Array;
  applyAwarenessUpdate: (awareness: AwarenessInstance, update: Uint8Array, origin: unknown) => void;
  removeAwarenessStates: (awareness: AwarenessInstance, clients: number[], origin: string) => void;
} | null = null;

function getAwarenessProtocol() {
  if (!awarenessProtocol) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    awarenessProtocol = require("y-protocols/awareness");
  }
  return awarenessProtocol!;
}

/** y-protocols Awareness の最小インターフェース */
export interface AwarenessInstance {
  clientID: number;
  getLocalState: () => Record<string, unknown> | null;
  setLocalState: (state: Record<string, unknown> | null) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: (...args: any[]) => void) => void;
  off: (event: string, cb: (...args: any[]) => void) => void;
  destroy: () => void;
}

// ----- Supabase Channel 型定義 -----
// @supabase/supabase-js の型を直接 import せず、duck-typing で扱う。
interface SupabaseChannel {
  on: (
    type: string,
    filter: { event: string },
    callback: (payload: { payload: unknown }) => void,
  ) => SupabaseChannel;
  subscribe: (callback?: (status: string, err?: Error) => void) => SupabaseChannel;
  send: (message: {
    type: string;
    event: string;
    payload: Record<string, unknown>;
  }) => Promise<string>;
  unsubscribe: () => Promise<unknown>;
}

interface SupabaseClientLike {
  channel: (name: string, opts?: Record<string, unknown>) => SupabaseChannel;
  removeChannel: (channel: SupabaseChannel) => Promise<unknown>;
}

// ----- ロック用ユーザー型 -----
export interface BroadcastLockUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

// ----- イベント型定義 -----
type EventMap = {
  status: [{ status: ConnectionStatus }];
  connect: [];
  disconnect: [];
  error: [unknown];
  synced: [boolean];
  /** セクション単位のコンテンツ更新（JSON 直接同期用） */
  "section-content": [string, Record<string, unknown>];
  /** セクションロック取得通知 */
  "section-lock": [string, BroadcastLockUser];
  /** セクションロック解放通知 */
  "section-unlock": [string];
};

type EventHandler<K extends keyof EventMap> = (...args: EventMap[K]) => void;

// ----- Base64 ヘルパー -----
const CHUNK_SIZE = 32 * 1024;

function uint8ToBase64(data: Uint8Array): string {
  if (data.length === 0) return "";
  if (data.length <= CHUNK_SIZE) {
    return btoa(String.fromCharCode(...data));
  }
  let binary = "";
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.subarray(offset, offset + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToUint8(encoded: string): Uint8Array {
  if (encoded === "") return new Uint8Array(0);
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ----- Provider 設定 -----
export interface BroadcastProviderConfig {
  /** Supabase チャネル名（例: "plot:xxx"） */
  channel: string;
  /** 再同期間隔（ms）。false で無効化。@default 5000 */
  resyncInterval?: number | false;
}

// ----- Provider 本体 -----
export class SupabaseBroadcastProvider {
  readonly doc: Y.Doc;
  readonly awareness: AwarenessInstance;

  private supabase: SupabaseClientLike;
  private config: BroadcastProviderConfig;
  private channel: SupabaseChannel | null = null;
  private connected = false;
  private _synced = false;
  private resyncTimer: ReturnType<typeof setInterval> | null = null;

  // イベントリスナー
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  // bound ハンドラー（cleanup 用に参照を保持）
  private boundOnDocUpdate: (update: Uint8Array, origin: unknown) => void;
  private boundOnAwarenessUpdate: (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => void;

  constructor(
    doc: Y.Doc,
    supabase: SupabaseClientLike,
    config: BroadcastProviderConfig,
  ) {
    this.doc = doc;
    this.supabase = supabase;
    this.config = config;

    const proto = getAwarenessProtocol();
    this.awareness = new proto.Awareness(doc);

    // ---- Y.js doc 更新 → Broadcast 送信 ----
    this.boundOnDocUpdate = (update: Uint8Array, origin: unknown) => {
      // 自分が適用した remote update は再送信しない
      if (origin === this) return;
      this.broadcastDocUpdate(update);
    };
    this.doc.on("update", this.boundOnDocUpdate);

    // ---- Awareness 更新 → Broadcast 送信 ----
    this.boundOnAwarenessUpdate = (
      { added, updated, removed },
    ) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoded = proto.encodeAwarenessUpdate(this.awareness, changedClients);
      this.broadcastAwareness(encoded);
    };
    this.awareness.on("update", this.boundOnAwarenessUpdate);

    // ---- beforeunload で自分の Awareness を削除 ----
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleUnload);
    }

    // ---- 接続開始 ----
    this.connect();
  }

  // ====== Public API ======

  get synced(): boolean {
    return this._synced;
  }

  get status(): ConnectionStatus {
    return this.connected ? "connected" : "disconnected";
  }

  /** チャネルを購読し接続を開始する */
  connect(): void {
    if (this.channel) return;

    this.emit("status", { status: "connecting" as ConnectionStatus });

    this.channel = this.supabase.channel(this.config.channel, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        this.onRemoteDocUpdate(payload as { update: string; senderId: string });
      })
      .on("broadcast", { event: "yjs-awareness" }, ({ payload }) => {
        this.onRemoteAwareness(payload as { update: string });
      })
      .on("broadcast", { event: "section-content" }, ({ payload }) => {
        const data = payload as { sectionId: string; content: Record<string, unknown> };
        this.emit("section-content", data.sectionId, data.content);
      })
      .on("broadcast", { event: "section-lock" }, ({ payload }) => {
        const data = payload as { sectionId: string; user: BroadcastLockUser };
        this.emit("section-lock", data.sectionId, data.user);
      })
      .on("broadcast", { event: "section-unlock" }, ({ payload }) => {
        const data = payload as { sectionId: string };
        this.emit("section-unlock", data.sectionId);
      })
      .on("broadcast", { event: "yjs-sync-request" }, () => {
        // 新規接続クライアントからの同期リクエスト → 自分の doc + awareness を送り返す
        this.respondToSyncRequest();
      })
      .subscribe((status: string, err?: Error) => {
        console.info(
          `[SupabaseBroadcastProvider] subscribe status="${status}" channel="${this.config.channel}"`,
          err ?? "",
        );

        if (status === "SUBSCRIBED") {
          this.connected = true;
          this._synced = true;
          this.emit("status", { status: "connected" as ConnectionStatus });
          this.emit("connect");
          this.emit("synced", true);

          // 接続直後に Awareness をブロードキャスト
          const proto = getAwarenessProtocol();
          if (this.awareness.getLocalState() !== null) {
            const update = proto.encodeAwarenessUpdate(this.awareness, [
              this.doc.clientID,
            ]);
            this.broadcastAwareness(update);
          }

          // 既存クライアントに同期リクエストを送信
          // → 他クライアントのロック状態等を即座に取得する
          this.requestSync();

          // resync interval 開始
          this.startResync();
        }

        if (status === "CHANNEL_ERROR") {
          console.error("[SupabaseBroadcastProvider] CHANNEL_ERROR:", err);
          this.connected = false;
          this.emit("status", { status: "disconnected" as ConnectionStatus });
          this.emit("error", err);
        }

        if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(`[SupabaseBroadcastProvider] ${status}`);
          this.connected = false;
          this.emit("status", { status: "disconnected" as ConnectionStatus });
          this.emit("disconnect");
        }
      });
  }

  /** チャネルを購読解除する */
  disconnect(): void {
    this.stopResync();
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.connected = false;
    this._synced = false;
    this.emit("status", { status: "disconnected" as ConnectionStatus });
    this.emit("disconnect");
  }

  /** Provider を破棄しリソースを解放する */
  destroy(): void {
    this.disconnect();

    this.doc.off("update", this.boundOnDocUpdate);
    this.awareness.off("update", this.boundOnAwarenessUpdate);

    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleUnload);
    }

    const proto = getAwarenessProtocol();
    proto.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      "provider destroy",
    );
  }

  // ====== Event Emitter ======

  on<K extends keyof EventMap>(event: K, handler: EventHandler<K>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<K>): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (e) {
        console.error(`[SupabaseBroadcastProvider] Error in ${event} handler:`, e);
      }
    }
  }

  // ====== Private: Broadcast 送受信 ======

  /**
   * セクションの Tiptap JSON コンテンツを Broadcast で送信する。
   * Y.js 同期とは独立した、シンプルなコンテンツ同期メカニズム。
   * WebSocket 未接続時は REST API にフォールバックされるため、
   * connected チェックは行わない。
   */
  /**
   * セクションのロック取得を Broadcast で通知する。
   * 他クライアントが「誰が編集中か」を把握できるようにする。
   */
  broadcastLock(sectionId: string, user: BroadcastLockUser): void {
    if (!this.channel) return;

    this.channel
      .send({
        type: "broadcast",
        event: "section-lock",
        payload: { sectionId, user },
      })
      .catch((err) => {
        console.warn("[SupabaseBroadcastProvider] Failed to broadcast lock:", err);
      });
  }

  /**
   * セクションのロック解放を Broadcast で通知する。
   */
  broadcastUnlock(sectionId: string): void {
    if (!this.channel) return;

    this.channel
      .send({
        type: "broadcast",
        event: "section-unlock",
        payload: { sectionId },
      })
      .catch((err) => {
        console.warn("[SupabaseBroadcastProvider] Failed to broadcast unlock:", err);
      });
  }

  broadcastContent(sectionId: string, content: Record<string, unknown>): void {
    if (!this.channel) {
      console.warn("[SupabaseBroadcastProvider] broadcastContent: no channel");
      return;
    }

    console.debug(
      `[SupabaseBroadcastProvider] broadcastContent sectionId="${sectionId}" connected=${this.connected}`,
    );

    this.channel
      .send({
        type: "broadcast",
        event: "section-content",
        payload: { sectionId, content },
      })
      .then((status) => {
        console.debug(`[SupabaseBroadcastProvider] broadcastContent send result: ${status}`);
      })
      .catch((err) => {
        console.warn("[SupabaseBroadcastProvider] Failed to broadcast content:", err);
      });
  }

  /** ローカルの Y.js 更新を Broadcast で送信 */
  private broadcastDocUpdate(update: Uint8Array): void {
    if (!this.channel || !this.connected) return;

    // payload は JSON object でないと Supabase REST fallback で 422 になるため、
    // Base64 エンコードした文字列を object に包んで送信する。
    this.channel
      .send({
        type: "broadcast",
        event: "yjs-update",
        payload: {
          update: uint8ToBase64(update),
          senderId: String(this.doc.clientID),
        },
      })
      .catch((err) => {
        console.warn("[SupabaseBroadcastProvider] Failed to broadcast update:", err);
      });
  }

  /** Awareness 更新を Broadcast で送信 */
  private broadcastAwareness(update: Uint8Array): void {
    if (!this.channel || !this.connected) return;

    this.channel
      .send({
        type: "broadcast",
        event: "yjs-awareness",
        payload: {
          update: uint8ToBase64(update),
        },
      })
      .catch((err) => {
        console.warn("[SupabaseBroadcastProvider] Failed to broadcast awareness:", err);
      });
  }

  /** リモートの Y.js 更新を受信し doc に適用 */
  private onRemoteDocUpdate(data: { update: string; senderId: string }): void {
    // 自分の更新は無視（self: false を設定済みだが念のため）
    if (data.senderId === String(this.doc.clientID)) return;

    try {
      const update = base64ToUint8(data.update);
      // origin = this にすることで boundOnDocUpdate の再送信を防ぐ
      Y.applyUpdate(this.doc, update, this);
    } catch (err) {
      console.error("[SupabaseBroadcastProvider] Failed to apply remote update:", err);
    }
  }

  /** リモートの Awareness 更新を受信し適用 */
  private onRemoteAwareness(data: { update: string }): void {
    try {
      const update = base64ToUint8(data.update);
      const proto = getAwarenessProtocol();
      proto.applyAwarenessUpdate(this.awareness, update, this);
    } catch (err) {
      console.error("[SupabaseBroadcastProvider] Failed to apply awareness update:", err);
    }
  }

  // ====== Private: Resync ======

  private startResync(): void {
    this.stopResync();

    const interval = this.config.resyncInterval;
    if (interval === false || interval === 0) return;

    const ms = interval ?? 5000;
    if (ms < 3000) {
      console.warn("[SupabaseBroadcastProvider] resyncInterval < 3000ms, ignoring");
      return;
    }

    this.resyncTimer = setInterval(() => {
      if (!this.connected) return;
      const fullState = Y.encodeStateAsUpdate(this.doc);
      this.broadcastDocUpdate(fullState);

      // Awareness もリシンクする
      // 後から接続したクライアントがロック状態を取得できるようにする
      this.broadcastLocalAwareness();
    }, ms);
  }

  private stopResync(): void {
    if (this.resyncTimer) {
      clearInterval(this.resyncTimer);
      this.resyncTimer = null;
    }
  }

  // ====== Private: Misc ======

  /**
   * 自分の Awareness 状態を Broadcast で送信する。
   * resync や sync-request 応答時に使う。
   */
  private broadcastLocalAwareness(): void {
    if (this.awareness.getLocalState() === null) return;
    const proto = getAwarenessProtocol();
    const update = proto.encodeAwarenessUpdate(this.awareness, [
      this.doc.clientID,
    ]);
    this.broadcastAwareness(update);
  }

  /**
   * 新規接続クライアントに対して自分の doc + awareness を送信する
   */
  private respondToSyncRequest(): void {
    if (!this.connected) return;
    const fullState = Y.encodeStateAsUpdate(this.doc);
    this.broadcastDocUpdate(fullState);
    this.broadcastLocalAwareness();
  }

  /**
   * 接続直後に既存クライアントへ同期リクエストを送る。
   * 既存クライアントが respond し、自分の awareness にロック状態が反映される。
   */
  private requestSync(): void {
    if (!this.channel) return;
    this.channel
      .send({
        type: "broadcast",
        event: "yjs-sync-request",
        payload: {},
      })
      .catch((err) => {
        console.warn("[SupabaseBroadcastProvider] Failed to send sync-request:", err);
      });
  }

  private handleUnload = (): void => {
    const proto = getAwarenessProtocol();
    proto.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      "window unload",
    );
  };
}
