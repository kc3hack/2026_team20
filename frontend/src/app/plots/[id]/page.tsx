import { notFound } from "next/navigation";
import { PlotDetail } from "@/components/plot/PlotDetail/PlotDetail";
import { ApiError } from "@/lib/api/client";
import * as plotRepository from "@/lib/api/repositories/plotRepository";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.scss";

export default async function PlotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const plot = await plotRepository.get(id, session?.access_token);
    return (
      <div className={styles.page}>
        <PlotDetail plot={plot} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
      return;
    }
    throw error;
  }
}
