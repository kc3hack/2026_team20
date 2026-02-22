"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { SectionResponse } from "@/lib/api/types";
import styles from "./SectionReorder.module.scss";

type SectionReorderProps = {
  sections: SectionResponse[];
  onReorder: (sectionId: string, newOrderIndex: number) => void;
  disabled?: boolean;
};

export function SectionReorder({
  sections,
  onReorder,
  disabled = false,
}: SectionReorderProps) {
  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.orderIndex - b.orderIndex),
    [sections],
  );

  const [orderedIds, setOrderedIds] = useState(() =>
    sortedSections.map((s) => s.id),
  );

  const sectionMap = useMemo(() => {
    const map = new Map<string, SectionResponse>();
    for (const section of sortedSections) {
      map.set(section.id, section);
    }
    return map;
  }, [sortedSections]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(newOrder);

    onReorder(active.id as string, newIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedIds}
        strategy={verticalListSortingStrategy}
      >
        <ul className={styles.list}>
          {orderedIds.map((id, index) => {
            const section = sectionMap.get(id);
            if (!section) return null;
            return (
              <SortableItem
                key={id}
                section={section}
                index={index}
                disabled={disabled}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  section,
  index,
  disabled,
}: {
  section: SectionResponse;
  index: number;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.item} ${isDragging ? styles.dragging : ""}`}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={`${section.title} をドラッグして並び替え`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <span className={styles.number}>{index + 1}</span>
      <span className={styles.title}>{section.title}</span>
    </li>
  );
}
