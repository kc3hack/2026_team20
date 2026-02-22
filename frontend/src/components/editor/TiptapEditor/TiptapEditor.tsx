"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AnyExtension, Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import type { Doc } from "yjs";
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
  collaborationField?: string;
  useCollaboration?: boolean;
  onEditorChange?: (editor: Editor | null) => void;
};

export function TiptapEditor({
  content,
  editable = true,
  onChange,
  onDirtyChange,
  className,
  ydoc,
  collaborationField,
  useCollaboration = false,
  onEditorChange,
}: TiptapEditorProps) {
  const isDirtyRef = useRef(false);
  const hasInitializedContentRef = useRef(false);

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      if (isDirtyRef.current !== dirty) {
        isDirtyRef.current = dirty;
        onDirtyChange?.(dirty);
      }
    },
    [onDirtyChange],
  );

  const extensions = buildExtensions({
    editable,
    ydoc,
    collaborationField,
    useCollaboration,
  });

  // Collaboration モードでは初期 content を useEditor に直接渡さない。
  // 既存の Y.Doc 状態がある場合、ここで stale な content を渡すと
  // 一瞬で上書きされて「文字が消える」原因になる。
  const initialContent = useCollaboration ? undefined : content;

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
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
    [editable, ydoc, collaborationField, useCollaboration],
  );

  useEffect(() => {
    onEditorChange?.(editor);
  }, [editor, onEditorChange]);

  useEffect(() => {
    if (!editor || !ydoc || !useCollaboration) {
      hasInitializedContentRef.current = false;
      return;
    }
    if (hasInitializedContentRef.current) return;

    if (!editable) {
      hasInitializedContentRef.current = true;
      return;
    }

    if (!content) {
      return;
    }

    // 既に Y.Doc 側に内容がある場合は、props.content で上書きしない。
    // これを行うと他クライアントの最新編集を古い API content で消してしまう。
    const field = collaborationField ?? "default";
    const fragment = ydoc.getXmlFragment(field);
    if (fragment.length > 0) {
      hasInitializedContentRef.current = true;
      return;
    }

    editor.commands.setContent(content, {
      emitUpdate: false,
    });

    hasInitializedContentRef.current = true;
  }, [editor, ydoc, content, useCollaboration, editable, collaborationField]);

  useEffect(() => {
    if (!editor || editable) return;
    if (useCollaboration) return;
    if (!content) return;

    editor.commands.setContent(content, {
      emitUpdate: false,
    });
  }, [editor, editable, useCollaboration, content]);

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
  collaborationField,
  useCollaboration,
}: {
  editable: boolean;
  ydoc?: Doc;
  collaborationField?: string;
  useCollaboration: boolean;
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

  if (ydoc && useCollaboration) {
    baseExtensions.push(
      Collaboration.configure({
        document: ydoc,
        field: collaborationField,
      }),
    );

    // CollaborationCursor は使用しない。
    // ロック機構により同一セクションの同時編集を防いでいるため
    // カーソル表示は不要。また @tiptap/extension-collaboration (v3.20)
    // と @tiptap/extension-collaboration-cursor (v3.0) は内部で
    // 異なる ySyncPluginKey を使うため、PluginKey 不一致でエラーになる。
  }

  return baseExtensions;
}
