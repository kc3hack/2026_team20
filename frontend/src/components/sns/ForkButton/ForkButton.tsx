"use client";

import { useMutation } from "@tanstack/react-query";
import { GitFork } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { snsRepository } from "@/lib/api/repositories";

type ForkButtonProps = {
  plotId: string;
};

export function ForkButton({ plotId }: ForkButtonProps) {
  const { isAuthenticated, session } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => snsRepository.fork(plotId, undefined, session?.access_token),
    onSuccess: (data) => {
      toast.success("フォークしました");
      setOpen(false);
      router.push(`/plots/${data.id}`);
    },
    onError: () => {
      toast.error("フォークに失敗しました");
    },
  });

  const handleOpenDialog = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirectTo=/plots/${plotId}`);
      return;
    }
    setOpen(true);
  };

  const handleFork = () => {
    mutation.mutate();
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleOpenDialog}>
        <GitFork size={16} />
        <span>フォーク</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>フォーク</DialogTitle>
            <DialogDescription>このPlotをフォークしますか？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleFork} disabled={mutation.isPending}>
              フォーク
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
