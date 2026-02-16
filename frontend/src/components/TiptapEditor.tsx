"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import { useCallback, useEffect, useRef } from "react";
import styles from "./TiptapEditor.module.scss";

const COLORS = [
  "#c44d2b", // terracotta (accent)
  "#2563eb", // blue
  "#16a34a", // green
  "#ca8a04", // yellow
  "#9333ea", // purple
  "#dc2626", // red
  "#0891b2", // cyan
  "#4b5563", // gray
] as const;

interface TiptapEditorProps {
  content?: Record<string, unknown>;
  onUpdate?: (json: Record<string, unknown>) => void;
  editable?: boolean;
  onImageUpload?: (file: File) => Promise<string | null>;
}

export default function TiptapEditor({
  content,
  onUpdate,
  editable = true,
  onImageUpload,
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
    ],
    editable,
    content: content ?? undefined,
    onUpdate: ({ editor: e }) => {
      onUpdate?.(e.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class: styles.prose,
      },
    },
  });

  // Sync editable prop
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  const setColor = useCallback(
    (color: string) => {
      editor?.chain().focus().setColor(color).run();
    },
    [editor],
  );

  const unsetColor = useCallback(() => {
    editor?.chain().focus().unsetColor().run();
  }, [editor]);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor || !onImageUpload) return;

      const url = await onImageUpload(file);
      if (url) {
        editor
          .chain()
          .focus()
          .insertContent(`<img src="${url}" alt="" />`)
          .run();
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [editor, onImageUpload],
  );

  if (!editor) return null;

  return (
    <div className={styles.editor}>
      {editable && (
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <button
              type="button"
              className={`${styles.toolBtn} ${editor.isActive("bold") ? styles.active : ""}`}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="太字"
            >
              B
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${editor.isActive("italic") ? styles.active : ""}`}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="斜体"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${editor.isActive("strike") ? styles.active : ""}`}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="取り消し"
            >
              <s>S</s>
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.toolGroup}>
            <button
              type="button"
              className={`${styles.toolBtn} ${editor.isActive("heading", { level: 2 }) ? styles.active : ""}`}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              title="見出し2"
            >
              H2
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${editor.isActive("heading", { level: 3 }) ? styles.active : ""}`}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              title="見出し3"
            >
              H3
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.toolGroup}>
            <button
              type="button"
              className={`${styles.toolBtn} ${editor.isActive("bulletList") ? styles.active : ""}`}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="箇条書き"
            >
              &bull;
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${editor.isActive("orderedList") ? styles.active : ""}`}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="番号付きリスト"
            >
              1.
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.colorPalette}>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.colorBtn} ${editor.isActive("textStyle", { color }) ? styles.activeColor : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => setColor(color)}
                title={`文字色: ${color}`}
              />
            ))}
            <button
              type="button"
              className={styles.colorResetBtn}
              onClick={unsetColor}
              title="色をリセット"
            >
              &times;
            </button>
          </div>

          {onImageUpload && (
            <>
              <div className={styles.divider} />
              <div className={styles.toolGroup}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={handleImageClick}
                  title="画像を挿入"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  className={styles.fileInput}
                  onChange={handleImageChange}
                />
              </div>
            </>
          )}
        </div>
      )}

      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}
