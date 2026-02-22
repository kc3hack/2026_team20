"use client";

import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Italic, Link, Palette } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { ColorPickerPopover } from "@/components/editor/ColorPicker";
import styles from "./EditorBubbleMenu.module.scss";

type EditorBubbleMenuProps = {
  editor: Editor | null;
};

export function BubbleMenuContent({ editor }: { editor: Editor }) {
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
    <div className={styles.menu}>
      <Toggle
        size="sm"
        aria-label="太字"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="斜体"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </Toggle>
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
        onChange={(color) => editor.chain().focus().setColor(color).run()}
      >
        <Toggle size="sm" aria-label="文字色" pressed={false}>
          <Palette />
        </Toggle>
      </ColorPickerPopover>
    </div>
  );
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e }) => {
        return e.isActive("image") ? false : !e.state.selection.empty;
      }}
    >
      <BubbleMenuContent editor={editor} />
    </BubbleMenu>
  );
}
