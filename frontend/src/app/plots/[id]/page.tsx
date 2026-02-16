"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import SectionEditor from "@/components/SectionEditor";
import HistorySidebar from "@/components/HistorySidebar";
import { useSection } from "@/hooks/useSection";
import styles from "./page.module.scss";

/**
 * Detect mobile viewport via matchMedia.
 * On mobile, editing is disabled (read-only view).
 */
function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

export default function PlotDetailPage() {
  const params = useParams();
  const plotId = params.id as string;
  const isMobile = useIsMobile();

  const {
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
    canAddSection,
    uploadImage,
  } = useSection(plotId);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySectionId, setHistorySectionId] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [showNewSectionInput, setShowNewSectionInput] = useState(false);

  const handleHistoryOpen = useCallback(
    (sectionId: string) => {
      setHistorySectionId(sectionId);
      setHistoryOpen(true);
      fetchHistory(sectionId);
    },
    [fetchHistory],
  );

  const handleHistoryClose = useCallback(() => {
    setHistoryOpen(false);
    setHistorySectionId(null);
  }, []);

  const handleRollback = useCallback(
    (version: number) => {
      if (!historySectionId) return;
      rollback(historySectionId, version);
    },
    [historySectionId, rollback],
  );

  const handleCreateSection = useCallback(async () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    await createSection(title);
    setNewSectionTitle("");
    setShowNewSectionInput(false);
  }, [newSectionTitle, createSection]);

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      if (!window.confirm("このセクションを削除しますか？")) return;
      deleteSection(sectionId);
    },
    [deleteSection],
  );

  const editable = !isMobile;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.skeleton}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonDesc} />
              <div className={styles.skeletonEditor} />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !plot) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.error}>
              {error ?? "Plotが見つかりませんでした"}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* Plot header */}
          <div className={styles.plotHeader}>
            <h1 className={styles.plotTitle}>{plot.title}</h1>
            {plot.description && (
              <p className={styles.plotDescription}>{plot.description}</p>
            )}
            {plot.tags.length > 0 && (
              <div className={styles.tags}>
                {plot.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className={styles.plotMeta}>
              {plot.owner && (
                <span className={styles.owner}>
                  {plot.owner.avatarUrl && (
                    <img
                      src={plot.owner.avatarUrl}
                      alt=""
                      className={styles.ownerAvatar}
                    />
                  )}
                  {plot.owner.displayName}
                </span>
              )}
              <span className={styles.starCount}>
                <span className={styles.starIcon}>&#9733;</span>
                {plot.starCount}
              </span>
              {plot.isPaused && (
                <span className={styles.pausedBadge}>一時停止中</span>
              )}
            </div>
          </div>

          {/* Section tabs */}
          <nav className={styles.sectionNav}>
            {sections.map((section) => (
              <div key={section.id} className={styles.sectionTabWrapper}>
                <button
                  type="button"
                  className={`${styles.sectionTab} ${activeSection?.id === section.id ? styles.activeTab : ""}`}
                  onClick={() => setActiveSection(section)}
                >
                  {section.title}
                </button>
                {editable && !plot.isPaused && sections.length > 1 && (
                  <button
                    type="button"
                    className={styles.deleteTabBtn}
                    onClick={() => handleDeleteSection(section.id)}
                    aria-label={`${section.title}を削除`}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            {editable && !plot.isPaused && canAddSection && (
              <>
                {showNewSectionInput ? (
                  <div className={styles.newSectionInput}>
                    <input
                      type="text"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateSection();
                        if (e.key === "Escape") {
                          setShowNewSectionInput(false);
                          setNewSectionTitle("");
                        }
                      }}
                      placeholder="セクション名"
                      className={styles.newSectionField}
                      autoFocus
                      maxLength={100}
                    />
                    <button
                      type="button"
                      className={styles.newSectionConfirm}
                      onClick={handleCreateSection}
                      disabled={!newSectionTitle.trim()}
                    >
                      追加
                    </button>
                    <button
                      type="button"
                      className={styles.newSectionCancel}
                      onClick={() => {
                        setShowNewSectionInput(false);
                        setNewSectionTitle("");
                      }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.addSectionBtn}
                    onClick={() => setShowNewSectionInput(true)}
                  >
                    ＋
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Active section editor */}
          {sections.length === 0 ? (
            <p className={styles.empty}>セクションがまだありません</p>
          ) : (
            sections
              .filter(
                (s) =>
                  !activeSection || s.id === activeSection.id,
              )
              .map((section) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  editable={editable && !plot.isPaused}
                  onUpdate={(content) =>
                    updateSectionContent(section.id, content)
                  }
                  onHistoryOpen={
                    editable ? handleHistoryOpen : undefined
                  }
                  onImageUpload={
                    editable ? uploadImage : undefined
                  }
                />
              ))
          )}
        </div>
      </main>

      <Footer />

      {/* History sidebar (PC only) */}
      {!isMobile && (
        <HistorySidebar
          isOpen={historyOpen}
          onClose={handleHistoryClose}
          history={history}
          isLoading={isHistoryLoading}
          onRollback={handleRollback}
        />
      )}
    </div>
  );
}
