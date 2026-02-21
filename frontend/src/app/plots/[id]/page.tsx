"use client";

import { notFound, useParams } from "next/navigation";
import { PlotDetail } from "@/components/plot/PlotDetail/PlotDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlotDetail } from "@/hooks/usePlots";
import { ApiError } from "@/lib/api/client";
import * as plotRepository from "@/lib/api/repositories/plotRepository";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.scss";

export default function PlotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: plot, isLoading, error } = usePlotDetail(id);

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const plot = await plotRepository.get(id, session?.access_token);
    return (
      <div className={styles.page}>
        <PlotDetailSkeleton />
      </div>
    );
  }

  if (error || !plot) {
    notFound();
    return null;
  }

  return (
    <div className={styles.page}>
      <PlotDetail plot={plot} />
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
