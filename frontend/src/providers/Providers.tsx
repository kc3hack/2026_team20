"use client";

import type { ReactNode } from "react";
import QueryProvider from "./QueryProvider";

// TODO: Issue #4 で AuthProvider を統合
// import AuthProvider from "./AuthProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {/* TODO: Issue #4 で AuthProvider でラップする */}
      {children}
    </QueryProvider>
  );
}
