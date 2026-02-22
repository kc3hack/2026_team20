"use client";

import { useEffect, useRef, useState } from "react";
import type { ConnectionStatus } from "@/lib/realtime/types";

function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK === "true";
}

type YDocLike = {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb: (...args: unknown[]) => void) => void;
};

export interface UseRealtimeSectionReturn {
  liveContent: Record<string, unknown> | null;
  connectionStatus: ConnectionStatus;
}

interface UseRealtimeSectionOptions {
  ydoc?: YDocLike | null;
}

const NO_OP_RETURN: UseRealtimeSectionReturn = {
  liveContent: null,
  connectionStatus: "disconnected",
};

export function useRealtimeSection(
  _plotId: string,
  _sectionId: string,
  enabled: boolean,
  options?: UseRealtimeSectionOptions,
): UseRealtimeSectionReturn {
  const ydoc = options?.ydoc ?? null;
  const [liveContent, setLiveContent] = useState<Record<string, unknown> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMockMode() || !enabled || !ydoc) {
      setLiveContent(null);
      setConnectionStatus("disconnected");
      return;
    }

    setConnectionStatus("connecting");

    const handleUpdate = (..._args: unknown[]) => {
      if (!mountedRef.current) return;
      setConnectionStatus("connected");
    };

    ydoc.on("update", handleUpdate);

    return () => {
      ydoc.off("update", handleUpdate);
    };
  }, [enabled, ydoc]);

  if (isMockMode() || !enabled) {
    return NO_OP_RETURN;
  }

  return { liveContent, connectionStatus };
}
