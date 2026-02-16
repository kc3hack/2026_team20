"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type HistoryEntry,
  type PlotDetailResponse,
  type SectionItem,
  api,
} from "@/lib/api";

const MAX_SECTIONS = 255;

interface UseSectionResult {
  plot: PlotDetailResponse | null;
  sections: SectionItem[];
  isLoading: boolean;
  error: string | null;
  activeSection: SectionItem | null;
  setActiveSection: (section: SectionItem | null) => void;
  history: HistoryEntry[];
  isHistoryLoading: boolean;
  fetchHistory: (sectionId: string) => Promise<void>;
  rollback: (sectionId: string, version: number) => Promise<void>;
  updateSectionContent: (
    sectionId: string,
    content: Record<string, unknown>,
  ) => Promise<void>;
  createSection: (title: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  canAddSection: boolean;
  uploadImage: (file: File) => Promise<string | null>;
}

export function useSection(plotId: string): UseSectionResult {
  const [plot, setPlot] = useState<PlotDetailResponse | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionItem | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.plots.get(plotId);
        if (cancelled) return;
        setPlot(data);
        const sorted = [...data.sections].sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );
        setSections(sorted);
        if (sorted.length > 0 && !activeSection) {
          setActiveSection(sorted[0]);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "データの取得に失敗しました";
        setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [plotId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = useCallback(async (sectionId: string) => {
    setIsHistoryLoading(true);
    try {
      const res = await api.sections.history(sectionId, 10);
      setHistory(res.items);
    } catch {
      setHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const rollback = useCallback(
    async (sectionId: string, version: number) => {
      try {
        const updated = await api.sections.rollback(sectionId, version);
        setSections((prev) =>
          prev.map((s) => (s.id === sectionId ? updated : s)),
        );
        if (activeSection?.id === sectionId) {
          setActiveSection(updated);
        }
        await fetchHistory(sectionId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "復元に失敗しました";
        setError(message);
      }
    },
    [activeSection, fetchHistory],
  );

  const updateSectionContent = useCallback(
    async (sectionId: string, content: Record<string, unknown>) => {
      try {
        const updated = await api.sections.update(sectionId, { content });
        setSections((prev) =>
          prev.map((s) => (s.id === sectionId ? updated : s)),
        );
      } catch {
        // Silently fail — will retry on next update
      }
    },
    [],
  );

  const createSection = useCallback(
    async (title: string) => {
      if (sections.length >= MAX_SECTIONS) {
        setError(`セクション数の上限（${MAX_SECTIONS}個）に達しています`);
        return;
      }
      try {
        const created = await api.sections.create(plotId, { title });
        setSections((prev) => [...prev, created]);
        setActiveSection(created);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "セクションの作成に失敗しました";
        setError(message);
      }
    },
    [plotId, sections.length],
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      try {
        await api.sections.delete(sectionId);
        setSections((prev) => {
          const next = prev.filter((s) => s.id !== sectionId);
          if (activeSection?.id === sectionId) {
            setActiveSection(next[0] ?? null);
          }
          return next;
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "セクションの削除に失敗しました";
        setError(message);
      }
    },
    [activeSection],
  );

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const res = await api.images.upload(file);
      return res.url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "画像のアップロードに失敗しました";
      setError(message);
      return null;
    }
  }, []);

  return {
    plot,
    sections,
    isLoading,
    error,
    activeSection,
    setActiveSection,
    history,
    isHistoryLoading,
    fetchHistory,
    rollback,
    updateSectionContent,
    createSection,
    deleteSection,
    canAddSection: sections.length < MAX_SECTIONS,
    uploadImage,
  };
}
