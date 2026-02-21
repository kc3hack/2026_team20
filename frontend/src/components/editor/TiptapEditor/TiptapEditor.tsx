"use client";

import { useCallback, useRef } from "react";
import type { AnyExtension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import type { Doc } from "yjs";
import type SupabaseProvider from "y-supabase";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorBubbleMenu } from "@/components/editor/EditorBubbleMenu";
import styles from "./TiptapEditor.module.scss";

type TiptapEditorProps = {
  content?: Record<string, unknown>;
  editable?: boolean;
  onChange?: (json: Record<string, unknown>) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  className?: string;
  ydoc?: Doc;
  provider?: SupabaseProvider;
};

export function TiptapEditor({
  content,
  editable = true,
  onChange,
  onDirtyChange,
  className,
  ydoc,
  provider,
}: TiptapEditorProps) {
  const isDirtyRef = useRef(false);

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      if (isDirtyRef.current !== dirty) {
        isDirtyRef.current = dirty;
        onDirtyChange?.(dirty);
      }
    },
    [onDirtyChange],
  );

  const extensions = buildExtensions({ editable, ydoc, provider });

  const editor = useEditor(
    {
      extensions,
      content,
      editable,
      immediatelyRender: false,
      onUpdate: ({ editor: e }) => {
        const json = e.getJSON() as Record<string, unknown>;
        onChange?.(json);

        if (!isDirtyRef.current) {
          handleDirtyChange(true);
        }
      },
    },
    [editable, ydoc],
  );

  return (
    <div className={cn(styles.editor, className)}>
      {editable && <EditorToolbar editor={editor} />}
      <EditorBubbleMenu editor={editor} />
      <div className={styles.content}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function buildExtensions({
  editable,
  ydoc,
  provider,
}: {
  editable: boolean;
  ydoc?: Doc;
  provider?: SupabaseProvider;
}) {
  const baseExtensions: AnyExtension[] = [
    StarterKit.configure({
      undoRedo: ydoc ? false : undefined,
    }),
    Placeholder.configure({
      placeholder: "ここに本文を入力…",
    }),
    Underline,
    Link.configure({
      openOnClick: !editable,
      autolink: true,
    }),
    Color,
    TextStyle,
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
  ];

  if (ydoc) {
    baseExtensions.push(
      Collaboration.configure({
        document: ydoc,
      }),
    );

    if (provider) {
      baseExtensions.push(
        CollaborationCursor.configure({
          provider,
        }),
      );
    }
  }

  return baseExtensions;
}
