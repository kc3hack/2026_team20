"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
  tagsInput: z.string().optional(),
});

type PlotFormValues = z.infer<typeof plotSchema>;

type PlotFormProps = {
  mode: "create" | "edit";
  defaultValues?: { title: string; description: string; tags: string[] };
  onSubmit: (data: CreatePlotRequest) => void;
  isSubmitting?: boolean;
};

export function PlotForm({
  mode,
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: PlotFormProps) {
  const form = useForm<PlotFormValues>({
    resolver: zodResolver(plotSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      tagsInput: defaultValues?.tags?.join(", ") ?? "",
    },
  });

  const submitLabel = useMemo(
    () => (mode === "create" ? "作成する" : "更新する"),
    [mode],
  );

  const handleSubmit = (values: PlotFormValues) => {
    const tags = (values.tagsInput ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const payload: CreatePlotRequest = {
      title: values.title,
      description: values.description?.trim() || undefined,
      tags: tags.length > 0 ? tags.slice(0, 10) : undefined,
    };

    onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={styles.form}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>タイトル</FormLabel>
              <FormControl>
                <Input placeholder="Plotタイトル" maxLength={200} {...field} />
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
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Plotの説明（任意）"
                  maxLength={2000}
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tagsInput"
          render={({ field }) => (
            <FormItem>
              <FormLabel>タグ</FormLabel>
              <FormControl>
                <Input placeholder="例: SF, 学園, バトル" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
