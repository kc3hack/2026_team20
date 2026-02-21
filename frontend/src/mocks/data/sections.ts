import type { SectionResponse } from "@/lib/api/types";

export const mockSections: SectionResponse[] = [
  {
    id: "section-001",
    plotId: "plot-001",
    title: "概要",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "空飛ぶ自動販売機の概要です。" }],
        },
      ],
    },
    orderIndex: 0,
    version: 3,
    createdAt: "2026-02-10T00:00:00Z",
    updatedAt: "2026-02-18T12:00:00Z",
  },
  {
    id: "section-002",
    plotId: "plot-001",
    title: "仕様",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "ドローンの飛行高度は最大50m。" }],
        },
      ],
    },
    orderIndex: 1,
    version: 5,
    createdAt: "2026-02-11T10:00:00Z",
    updatedAt: "2026-02-17T15:00:00Z",
  },
  {
    id: "section-003",
    plotId: "plot-001",
    title: "デザイン案",
    content: null,
    orderIndex: 2,
    version: 1,
    createdAt: "2026-02-15T08:00:00Z",
    updatedAt: "2026-02-15T08:00:00Z",
  },
  {
    id: "section-004",
    plotId: "plot-002",
    title: "翻訳アルゴリズム",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "猫の鳴き声パターンを機械学習で解析する仕組み。",
            },
          ],
        },
      ],
    },
    orderIndex: 0,
    version: 4,
    createdAt: "2026-01-28T09:00:00Z",
    updatedAt: "2026-02-19T15:00:00Z",
  },
  {
    id: "section-005",
    plotId: "plot-002",
    title: "ハードウェア設計",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "イヤホンに内蔵するマイクとスピーカーの設計。" }],
        },
      ],
    },
    orderIndex: 1,
    version: 2,
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  {
    id: "section-006",
    plotId: "plot-002",
    title: "ユーザーテスト結果",
    content: null,
    orderIndex: 2,
    version: 1,
    createdAt: "2026-02-10T14:00:00Z",
    updatedAt: "2026-02-10T14:00:00Z",
  },
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: `section-test-scroll-${i + 1}`,
    plotId: "plot-test-scroll",
    title: `第 ${i + 1} 章：テストセクション ${i + 1}`,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: `第 ${i + 1} 章の概要` }],
        },
        ...Array.from({ length: 10 }).map((_, j) => ({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `これはテスト用の長文テキストです。スクロール量を稼ぐために段落を複数生成しています。第 ${i + 1} 章の ${j + 1} 番目の段落です。目次をクリックした際の Intersection Observer の挙動確認や、スムーズスクロール時の動作テストとして利用してください。画面が十分に長くないとスクロールのテストにならないため、このように適当な文章を大量に並べて長さを稼ぎます。`,
            },
          ],
        })),
      ],
    },
    orderIndex: i,
    version: 1,
    createdAt: "2026-02-21T00:00:00Z",
    updatedAt: "2026-02-21T00:00:00Z",
  })),
];
