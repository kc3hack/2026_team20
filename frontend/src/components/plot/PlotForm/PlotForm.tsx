"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CreatePlotRequest } from "@/lib/api/types";
import styles from "./PlotForm.module.scss";

const plotSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(200, "200文字以内"),
  description: z.string().max(2000, "2000文字以内").optional(),
  tags: z.array(z.string()).max(10, "タグは10個まで").optional(),
});

type PlotFormValues = z.infer<typeof plotSchema>;

type PlotFormProps = {
  mode: "create" | "edit";
  defaultValues?: { title: string; description: string; tags: string[] };
  onSubmit: (data: CreatePlotRequest) => void;
  isSubmitting?: boolean;
};

export function PlotForm({ mode, defaultValues, onSubmit, isSubmitting = false }: PlotFormProps) {
  const form = useForm<PlotFormValues>({
    resolver: zodResolver(plotSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      tags: defaultValues?.tags ?? [],
    },
  });

  const [tagInput, setTagInput] = useState("");
  const currentTags = form.watch("tags") ?? [];

  const addTags = (raw: string) => {
    const newTags = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (newTags.length === 0) return;

    const merged = [...currentTags];
    for (const tag of newTags) {
      if (!merged.includes(tag) && merged.length < 10) {
        merged.push(tag);
      }
    }

    form.setValue("tags", merged, { shouldValidate: true });
    setTagInput("");
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTags(tagInput);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updated = currentTags.filter((t) => t !== tagToRemove);
    form.setValue("tags", updated, { shouldValidate: true });
  };

  const handleFormSubmit = (values: PlotFormValues) => {
    const payload: CreatePlotRequest = {
      title: values.title,
    };

    if (values.description?.trim()) {
      payload.description = values.description.trim();
    }

    if (values.tags && values.tags.length > 0) {
      payload.tags = values.tags;
    }

    onSubmit(payload);

    if (mode === "create") {
      toast.success("Plotを作成しました");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className={styles.form}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>タイトル</FormLabel>
              <FormControl>
                <Input
                  placeholder="Plotのタイトルを入力"
                  maxLength={200}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明（任意）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Plotの説明を入力"
                  maxLength={2000}
                  rows={4}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>タグ（任意・カンマ区切り）</FormLabel>
              <FormControl>
                <Input
                  placeholder="例: TypeScript, React, デザイン"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  disabled={isSubmitting || currentTags.length >= 10}
                />
              </FormControl>
              <FormMessage />

              {currentTags.length > 0 && (
                <div className={styles.tagList}>
                  {currentTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className={styles.tag}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className={styles.tagRemove}
                        disabled={isSubmitting}
                        aria-label={`タグ「${tag}」を削除`}
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </FormItem>
          )}
        />

        <div className={styles.actions}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === "create"
                ? "作成中..."
                : "更新中..."
              : mode === "create"
                ? "Plotを作成"
                : "Plotを更新"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
