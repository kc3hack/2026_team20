import type { Doc } from "yjs";
import type { LockState, SectionAwarenessState } from "./types";

export type AwarenessLike = {
  clientID: number;
  getLocalState: () => SectionAwarenessState | null;
  setLocalState: (state: SectionAwarenessState | null) => void;
  getStates: () => Map<number, SectionAwarenessState>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb: (...args: unknown[]) => void) => void;
  destroy: () => void;
};

type AwarenessChangeData = {
  added: number[];
  updated: number[];
  removed: number[];
};

export function createAwareness(doc: Doc): AwarenessLike {
  const { Awareness } = require("y-protocols/awareness") as {
    Awareness: new (doc: Doc) => AwarenessLike;
  };
  return new Awareness(doc);
}

export function setEditingSection(
  awareness: AwarenessLike,
  sectionId: string,
  user: SectionAwarenessState["user"],
): void {
  awareness.setLocalState({
    editingSectionId: sectionId,
    user,
  });
}

export function clearEditingSection(
  awareness: AwarenessLike,
  user: SectionAwarenessState["user"],
): void {
  awareness.setLocalState({
    editingSectionId: null,
    user,
  });
}

export function getLockState(
  awareness: AwarenessLike,
  sectionId: string,
  currentUserId: string,
): LockState {
  const states = awareness.getStates();

  for (const [, state] of states) {
    if (!state || state.editingSectionId !== sectionId) continue;

    if (state.user.id === currentUserId) {
      return "locked-by-me";
    }
    return "locked-by-other";
  }

  return "unlocked";
}

export function getLockedBy(
  awareness: AwarenessLike,
  sectionId: string,
): SectionAwarenessState["user"] | null {
  const states = awareness.getStates();

  for (const [, state] of states) {
    if (!state || state.editingSectionId !== sectionId) continue;
    return state.user;
  }

  return null;
}

export function onAwarenessChange(
  awareness: AwarenessLike,
  callback: (changes: AwarenessChangeData) => void,
): () => void {
  const handler = (changes: unknown) => {
    callback(changes as AwarenessChangeData);
  };

  awareness.on("update", handler);

  return () => {
    awareness.off("update", handler);
  };
}
