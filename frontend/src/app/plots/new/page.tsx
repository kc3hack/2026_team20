"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth/AuthGuard/AuthGuard";
import { PlotForm } from "@/components/plot/PlotForm/PlotForm";
import { useCreatePlot } from "@/hooks/usePlots";
import type { CreatePlotRequest } from "@/lib/api/types";
import styles from "./page.module.scss";

export default function NewPlotPage() {
  const router = useRouter();
  const createPlot = useCreatePlot();

  const handleSubmit = (data: CreatePlotRequest) => {
    createPlot.mutate(data, {
      onSuccess: (created) => {
        toast.success("Plotを作成しました");
        router.push(`/plots/${created.id}`);
      },
    });
  };

  return (
    <AuthGuard>
      <main className={styles.page}>
        <section className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>Plot作成</h1>
            <p className={styles.description}>新しいPlotの基本情報を入力してください。</p>
          </header>
          <PlotForm
            mode="create"
            onSubmit={handleSubmit}
            isSubmitting={createPlot.isPending}
          />
        </section>
      </main>
    </AuthGuard>
  );
}
