import * as Y from "yjs";
import { decodeYjsUpdate, encodeYjsUpdate } from "./encoding";

export const ORIGIN_REMOTE = "remote";
export const ORIGIN_LOCAL = "local";

type BroadcastChannel = {
  send: (message: Record<string, unknown>) => Promise<unknown>;
};

export function syncYjsUpdate(
  doc: Y.Doc,
  update: Uint8Array,
  origin: string,
): void {
  Y.applyUpdate(doc, update, origin);
}

export function broadcastUpdate(
  channel: BroadcastChannel,
  update: Uint8Array,
  senderId: string,
): void {
  if (update.length === 0) return;

  channel.send({
    type: "broadcast",
    event: "yjs-update",
    payload: {
      type: "yjs-update",
      update: encodeYjsUpdate(update),
      senderId,
    },
  });
}

export function receiveUpdate(doc: Y.Doc, encodedUpdate: string): void {
  if (encodedUpdate === "") return;

  const update = decodeYjsUpdate(encodedUpdate);
  Y.applyUpdate(doc, update, ORIGIN_REMOTE);
}

export function requestInitialState(
  channel: BroadcastChannel,
  doc: Y.Doc,
  senderId: string,
): void {
  const stateVector = Y.encodeStateAsUpdate(doc);

  channel.send({
    type: "broadcast",
    event: "state-vector-request",
    payload: {
      type: "state-vector-request",
      stateVector: encodeYjsUpdate(stateVector),
      senderId,
    },
  });
}

export function sendStateVector(
  channel: BroadcastChannel,
  doc: Y.Doc,
  senderId: string,
): void {
  const update = Y.encodeStateAsUpdate(doc);

  channel.send({
    type: "broadcast",
    event: "state-vector-response",
    payload: {
      type: "state-vector-response",
      update: encodeYjsUpdate(update),
      senderId,
    },
  });
}
