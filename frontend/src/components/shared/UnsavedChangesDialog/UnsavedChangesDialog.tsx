"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import styles from "./UnsavedChangesDialog.module.scss";

type UnsavedChangesDialogProps = {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function UnsavedChangesDialog({
  open,
  onSave,
  onDiscard,
  onCancel,
  isSaving,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent showCloseButton={false} className={styles.content}>
        <DialogHeader>
          <DialogTitle>未保存の変更があります</DialogTitle>
          <DialogDescription>
            変更を保存せずに移動しますか？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={styles.footer}>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={onDiscard} disabled={isSaving}>
            破棄する
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
