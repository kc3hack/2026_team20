"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseUnsavedChangesReturn {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  showConfirmDialog: boolean;
  setShowConfirmDialog: (value: boolean) => void;
}

export function useUnsavedChanges(): UseUnsavedChangesReturn {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  }, []);

  useEffect(() => {
    if (hasUnsavedChanges) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, handleBeforeUnload]);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showConfirmDialog,
    setShowConfirmDialog,
  };
}
