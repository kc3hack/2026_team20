"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth/AuthGuard/AuthGuard";
import { PlotForm } from "@/components/plot/PlotForm/PlotForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreatePlot } from "@/hooks/usePlots";
import type { CreatePlotRequest } from "@/lib/api/types";
import styles from "./page.module.scss";

export default function NewPlotPage() {
  return (
    <AuthGuard>
      <NewPlotContent />
    </AuthGuard>
  );
}

function NewPlotContent() {
  const router = useRouter();
  const createPlot = useCreatePlot();

  const handleSubmit = (data: CreatePlotRequest) => {
    createPlot.mutate(data, {
      onSuccess: (created) => {
        router.push(`/plots/${created.id}`);
      },
      onError: () => {
        toast.error("Plotの作成に失敗しました");
      },
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>新しいPlotを作成</h1>

      <Card>
        <CardHeader>
          <CardTitle>Plot 情報</CardTitle>
          <CardDescription>タイトルは必須です。その他は後から編集できます。</CardDescription>
        </CardHeader>
        <CardContent>
          <PlotForm mode="create" onSubmit={handleSubmit} isSubmitting={createPlot.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
