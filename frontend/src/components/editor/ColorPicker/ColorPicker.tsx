"use client";

import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import styles from "./ColorPicker.module.scss";

export const PALETTE_COLORS = [
  { value: "#000000", label: "黒" },
  { value: "#e03131", label: "赤" },
  { value: "#2f9e44", label: "緑" },
  { value: "#1971c2", label: "青" },
  { value: "#f08c00", label: "オレンジ" },
  { value: "#9c36b5", label: "紫" },
  { value: "#0c8599", label: "ティール" },
  { value: "#868e96", label: "グレー" },
] as const;

type ColorPickerProps = {
  color: string | undefined;
  onChange: (color: string) => void;
};

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  return (
    <div className={styles.palette}>
      {PALETTE_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-label={`色を選択: ${c.label}`}
          className={styles.swatch}
          style={{ backgroundColor: c.value }}
          onClick={() => onChange(c.value)}
        >
          {color === c.value && <Check className={styles.check} />}
        </button>
      ))}
    </div>
  );
}

type ColorPickerPopoverProps = ColorPickerProps & {
  children: React.ReactNode;
};

export function ColorPickerPopover({
  color,
  onChange,
  children,
}: ColorPickerPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <ColorPicker color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
