"use client";

import { ChevronDown, ChevronLeft, Clock, Database, FileText, History } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DiffViewer } from "@/components/history/DiffViewer/DiffViewer";
import { HistoryList } from "@/components/history/HistoryList/HistoryList";
import { RollbackLogList } from "@/components/history/RollbackLogList/RollbackLogList";
import { SnapshotList } from "@/components/history/SnapshotList/SnapshotList";
import { useDiff, useRollback } from "@/hooks/useHistory";
import { usePlotDetail } from "@/hooks/usePlots";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./page.module.scss";

/**
 * 履歴ページ（/plots/[id]/history）
 *
 * 子コンポーネント: HistoryList / DiffViewer / SnapshotList / RollbackLogList
 */
export default function PlotHistoryPage() {
  const params = useParams<{ id: string }>();
  const plotId = params.id;
  const { user } = useAuth();

  const { data: plot, isLoading, isError, error } = usePlotDetail(plotId);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([null, null]);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  /** Wave4 のロールバック実行で使用するスナップショット ID */
  const [rollbackTargetSnapshotId, setRollbackTargetSnapshotId] = useState<string | null>(null);
  /** ロールバック時の楽観的ロック用 Plot バージョン */
  const [rollbackPlotVersion, setRollbackPlotVersion] = useState<number | undefined>(undefined);
  /** Wave3 の DiffViewer モーダル表示フラグ */
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  // ── 差分取得（DiffViewer 用） ───────────────────────
  const {
    data: diffData,
    isLoading: isDiffLoading,
  } = useDiff(
    selectedSectionId ?? "",
    selectedVersions[0] ?? 0,
    selectedVersions[1] ?? 0,
  );

  // ── ロールバックミューテーション（Wave4） ──────────────────
  const rollbackMutation = useRollback(plotId, rollbackTargetSnapshotId ?? "");

  const isOwner = !!user && !!plot && plot.ownerId === user.id;

  const selectedSection = plot?.sections.find((s) => s.id === selectedSectionId);
  const sectionLabel = selectedSection?.title ?? "セクションを選択";
  const canCompare = selectedVersions[0] != null && selectedVersions[1] != null;

  const handleOpenRollbackDialog = (snapshotId: string, _snapshotVersion: number, plotVersion?: number) => {
    setRollbackTargetSnapshotId(snapshotId);
    setRollbackPlotVersion(plotVersion);
    setRollbackReason("");
    setRollbackDialogOpen(true);
  };

  const handleCloseRollbackDialog = () => {
    setRollbackDialogOpen(false);
    setRollbackReason("");
    setRollbackTargetSnapshotId(null);
    setRollbackPlotVersion(undefined);
  };

  const handleConfirmRollback = () => {
    if (!rollbackTargetSnapshotId) return;
    rollbackMutation.mutate(
      {
        expectedVersion: rollbackPlotVersion ?? plot?.version,
        reason: rollbackReason || undefined,
      },
      {
        onSuccess: () => {
          handleCloseRollbackDialog();
        },
      },
    );
  };

  const handleVersionSelect = (version: number) => {
    setSelectedVersions((prev) => {
      if (prev[0] == null) return [version, null];
      if (prev[1] == null) return [prev[0], version];
      return [version, null];
    });
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHeader}>
          <Skeleton className="h-9 w-9 rounded" />
          <div>
            <Skeleton className="h-6 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-64 mb-6" />
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonPanel}>
            <Skeleton className="h-5 w-24 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className={styles.skeletonPanel}>
            <Skeleton className="h-5 w-24 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ── エラー表示 ─────────────────────────────────────
  if (isError || !plot) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>
            {error?.message ?? "Plot の取得に失敗しました"}
          </p>
          <Button asChild variant="outline">
            <Link href={`/plots/${plotId}`}>Plot に戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Button asChild variant="ghost" size="icon" className={styles.backButton}>
          <Link href={`/plots/${plotId}`} aria-label="Plot に戻る">
            <ChevronLeft size={20} />
          </Link>
        </Button>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>履歴</h1>
          <p className={styles.plotTitle}>{plot.title}</p>
        </div>
      </header>

      <div className={styles.sectionSelector}>
        <span className={styles.sectionLabel}>セクション:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="section-selector">
              {sectionLabel}
              <ChevronDown size={16} className="ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {plot.sections.map((section) => (
              <DropdownMenuItem
                key={section.id}
                onSelect={() => {
                  setSelectedSectionId(section.id);
                  setSelectedVersions([null, null]);
                }}
              >
                {section.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="mb-6" />

      <div className={styles.content}>
        <section className={styles.panel} aria-label="編集履歴">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              <History size={16} className="inline mr-1" />
              編集履歴
            </h2>
            {canCompare && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDiffModalOpen(true)}
                aria-label="差分を表示"
              >
                差分を表示
              </Button>
            )}
          </div>
          {selectedSectionId ? (
            <HistoryList
              sectionId={selectedSectionId}
              onVersionSelect={handleVersionSelect}
              selectedVersions={selectedVersions}
            />
          ) : (
            <div className={styles.panelPlaceholder}>
              <p>セクションを選択してください</p>
            </div>
          )}
        </section>

        <section className={styles.panel} aria-label="スナップショット">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              <Database size={16} className="inline mr-1" />
              スナップショット
            </h2>
          </div>
          <SnapshotList
            plotId={plotId}
            plotVersion={plot.version}
            onRollback={handleOpenRollbackDialog}
          />
        </section>
      </div>

      {isOwner && (
        <div className={styles.auditSection}>
          <Separator className="mb-6" />
          <section className={styles.auditPanel} aria-label="ロールバック監査ログ">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <FileText size={16} className="inline mr-1" />
                ロールバック監査ログ
              </h2>
            </div>
            <RollbackLogList plotId={plotId} />
          </section>
        </div>
      )}

      <Dialog open={diffModalOpen} onOpenChange={setDiffModalOpen}>
        <DialogContent aria-label="差分表示">
          <DialogHeader>
            <DialogTitle>
              <Clock size={16} className="inline mr-1" />
              バージョン差分
            </DialogTitle>
            <DialogDescription>
              {canCompare
                ? `v${selectedVersions[0]} → v${selectedVersions[1]}`
                : "2つのバージョンを選択してください"}
            </DialogDescription>
          </DialogHeader>
          {isDiffLoading ? (
            <div className={styles.panelPlaceholder}>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : diffData ? (
            <DiffViewer diff={diffData} />
          ) : (
            <div className={styles.panelPlaceholder}>
              <p>差分データを取得できませんでした</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent aria-label="ロールバック確認">
          <DialogHeader>
            <DialogTitle>このバージョンに戻しますか？</DialogTitle>
            <DialogDescription>
              ロールバックを実行すると、現在の内容は上書きされます。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <div className={styles.dialogContent}>
            <div className={styles.reasonField}>
              <label htmlFor="rollback-reason" className={styles.reasonLabel}>
                ロールバック理由
              </label>
              <Textarea
                id="rollback-reason"
                placeholder="ロールバックの理由を入力してください（任意）"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className={styles.dialogActions}>
            <Button variant="outline" onClick={handleCloseRollbackDialog}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRollback}
              disabled={rollbackMutation.isPending}
            >
              ロールバック実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
