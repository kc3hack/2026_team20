"use client";

import { notFound, useParams } from "next/navigation";
import { PlotDetail } from "@/components/plot/PlotDetail/PlotDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlotDetail } from "@/hooks/usePlots";
import { ApiError } from "@/lib/api/client";
import styles from "./page.module.scss";

export default function PlotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: plot, isLoading, error } = usePlotDetail(id);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <PlotDetailSkeleton />
      </div>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
      return null;
    }
    // その他のエラーは Error Boundary または適当なエラー画面で処理される想定だが、
    // ここでは単純に 404 扱いにするかメッセージを出す。
    // Issue #15 でグローバルハンドリングが予定されているため、最低限の対応。
    notFound();
    return null;
  }

  if (!plot) {
    notFound();
    return null;
  }

  return (
    <div className={styles.page}>
      <PlotDetail {...{ plot }} />
    </div>
  );
}

function PlotDetailSkeleton() {
  return (
    <div data-testid="plot-detail-skeleton">
      <Skeleton style={{ height: "2.5rem", width: "60%", marginBottom: "1rem" }} />
      <Skeleton style={{ height: "1rem", width: "80%", marginBottom: "0.5rem" }} />
      <Skeleton style={{ height: "1rem", width: "40%", marginBottom: "2rem" }} />
      <Skeleton style={{ height: "12rem", width: "100%" }} />
    </div>
  );
}
