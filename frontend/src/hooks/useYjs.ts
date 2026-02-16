"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

const WS_URL = process.env.NEXT_PUBLIC_YJS_WS_URL ?? "ws://localhost:1234";

interface UseYjsResult {
  ydoc: Y.Doc;
  isConnected: boolean;
}

/**
 * Manages a Y.js document and WebSocket connection for a given section.
 *
 * Uses y-websocket's WebsocketProvider when available. The provider is
 * imported dynamically so the app still compiles if the package is missing
 * (it falls back to a standalone Y.Doc without network sync).
 */
export function useYjs(sectionId: string): UseYjsResult {
  const ydocRef = useRef<Y.Doc | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: provider type varies
  const providerRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }

  useEffect(() => {
    const ydoc = ydocRef.current!;
    let destroyed = false;

    async function connect() {
      try {
        const { WebsocketProvider } = await import("y-websocket");
        if (destroyed) return;

        const provider = new WebsocketProvider(
          WS_URL,
          `section-${sectionId}`,
          ydoc,
        );

        provider.on("status", (event: { status: string }) => {
          if (!destroyed) setIsConnected(event.status === "connected");
        });

        providerRef.current = provider;
      } catch {
        // y-websocket not installed — operate offline
        if (!destroyed) setIsConnected(false);
      }
    }

    connect();

    return () => {
      destroyed = true;
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [sectionId]);

  // Reset doc when section changes
  useEffect(() => {
    return () => {
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = new Y.Doc();
      }
    };
  }, [sectionId]);

  return { ydoc: ydocRef.current, isConnected };
}
