"use client";

import type { Editor } from "@tiptap/core";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Palette,
  Redo,
  Strikethrough,
  Underline,
  Undo,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { ColorPickerPopover } from "@/components/editor/ColorPicker";
import styles from "./EditorToolbar.module.scss";

type EditorToolbarProps = {
  editor: Editor | null;
};

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL を入力してください", previousUrl ?? "");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="テキスト書式">
      <div className={styles.group}>
        <Toggle
          size="sm"
          aria-label="太字"
          pressed={editor.isActive("bold")}
          onPressedChange={() =>
            editor.chain().focus().toggleBold().run()
          }
        >
          <Bold />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="斜体"
          pressed={editor.isActive("italic")}
          onPressedChange={() =>
            editor.chain().focus().toggleItalic().run()
          }
        >
          <Italic />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="下線"
          pressed={editor.isActive("underline")}
          onPressedChange={() =>
            editor.chain().focus().toggleUnderline().run()
          }
        >
          <Underline />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="取消線"
          pressed={editor.isActive("strike")}
          onPressedChange={() =>
            editor.chain().focus().toggleStrike().run()
          }
        >
          <Strikethrough />
        </Toggle>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <Toggle
          size="sm"
          aria-label="H1"
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="H2"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="H3"
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 />
        </Toggle>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <Toggle
          size="sm"
          aria-label="箇条書き"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          <List />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="番号付きリスト"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          <ListOrdered />
        </Toggle>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <Toggle
          size="sm"
          aria-label="リンク"
          pressed={editor.isActive("link")}
          onPressedChange={setLink}
        >
          <Link />
        </Toggle>

        <ColorPickerPopover
          color={
            (editor.getAttributes("textStyle").color as string) ?? undefined
          }
          onChange={(color) =>
            editor.chain().focus().setColor(color).run()
          }
        >
          <Toggle size="sm" aria-label="文字色" pressed={false}>
            <Palette />
          </Toggle>
        </ColorPickerPopover>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <Toggle
          size="sm"
          aria-label="元に戻す"
          pressed={false}
          onPressedChange={() => editor.chain().focus().undo().run()}
        >
          <Undo />
        </Toggle>
        <Toggle
          size="sm"
          aria-label="やり直し"
          pressed={false}
          onPressedChange={() => editor.chain().focus().redo().run()}
        >
          <Redo />
        </Toggle>
      </div>
    </div>
  );
}
