import type { PlotDetailResponse, PlotListResponse, PlotResponse } from "@/lib/api/types";
import { mockSections } from "./sections";
import { mockUsers } from "./users";

export const mockPlots: PlotResponse[] = [
  {
    id: "plot-001",
    title: "空飛ぶ自動販売機",
    description:
      "ドローン搭載の自販機。どこでも好きな場所に飲み物を届けてくれる。山頂でも砂浜でもOK。",
    tags: ["テクノロジー", "飲料", "ドローン"],
    ownerId: mockUsers.owner.id,
    starCount: 42,
    isStarred: false,
    isPaused: false,
    thumbnailUrl: null,
    version: 3,
    createdAt: "2026-02-10T00:00:00Z",
    updatedAt: "2026-02-18T12:00:00Z",
  },
  {
    id: "plot-002",
    title: "猫語翻訳イヤホン",
    description: "猫の鳴き声をリアルタイムで人間語に翻訳する魔法のイヤホン。猫の気持ちがわかる。",
    tags: ["動物", "ガジェット"],
    ownerId: mockUsers.contributor.id,
    starCount: 128,
    isStarred: true,
    isPaused: false,
    thumbnailUrl: null,
    version: 7,
    createdAt: "2026-01-28T09:00:00Z",
    updatedAt: "2026-02-19T15:00:00Z",
  },
  {
    id: "plot-003",
    title: "夢を録画できる枕",
    description: "睡眠中の夢を映像として録画・再生できる不思議な枕。朝起きたら夢日記が自動完成。",
    tags: ["睡眠", "ファンタジー"],
    ownerId: mockUsers.owner.id,
    starCount: 89,
    isStarred: false,
    isPaused: false,
    thumbnailUrl: null,
    version: 2,
    createdAt: "2026-02-05T14:00:00Z",
    updatedAt: "2026-02-17T10:00:00Z",
  },
  {
    id: "plot-004",
    title: "透明マント",
    description: "着るだけで光学迷彩が発動する次世代ステルスウェア。通学や通勤のストレスから解放。",
    tags: ["ファッション", "テクノロジー"],
    ownerId: mockUsers.viewer.id,
    starCount: 256,
    isStarred: true,
    isPaused: false,
    thumbnailUrl: null,
    version: 12,
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-02-20T09:00:00Z",
  },
  {
    id: "plot-005",
    title: "時間停止リモコン",
    description: "ボタン一つで周囲の時間を5分間停止できるリモコン。テスト前の最終確認に最適。",
    tags: ["ファンタジー", "ガジェット"],
    ownerId: mockUsers.newcomer.id,
    starCount: 15,
    isStarred: false,
    isPaused: false,
    thumbnailUrl: null,
    version: 1,
    createdAt: "2026-02-18T20:00:00Z",
    updatedAt: "2026-02-19T08:00:00Z",
  },
  {
    id: "plot-006",
    title: "無限収納ポケット",
    description:
      "ポケットの中がどこかの倉庫につながっている不思議なジャケット。手ぶらで旅行が可能に。",
    tags: ["ファッション", "ファンタジー"],
    ownerId: mockUsers.contributor.id,
    starCount: 67,
    isStarred: false,
    isPaused: false,
    thumbnailUrl: null,
    version: 4,
    createdAt: "2026-02-01T11:00:00Z",
    updatedAt: "2026-02-16T14:00:00Z",
  },
  {
    id: "plot-007",
    title: "味覚シェアリングアプリ",
    description:
      "食べている料理の味をSNSでリアルタイムにシェアできるアプリ。舌のセンサーデバイス付き。",
    tags: ["フード", "テクノロジー", "SNS"],
    ownerId: mockUsers.owner.id,
    starCount: 33,
    isStarred: false,
    isPaused: true,
    thumbnailUrl: null,
    version: 5,
    createdAt: "2026-02-08T16:00:00Z",
    updatedAt: "2026-02-15T22:00:00Z",
  },
  {
    id: "plot-008",
    title: "植物と会話できるスピーカー",
    description: "植物の電気信号を解析し、感情や要望を音声に変換するスマートスピーカー。",
    tags: ["植物", "ガジェット", "エコ"],
    ownerId: mockUsers.viewer.id,
    starCount: 21,
    isStarred: false,
    isPaused: false,
    thumbnailUrl: null,
    version: 2,
    createdAt: "2026-02-12T13:00:00Z",
    updatedAt: "2026-02-18T17:00:00Z",
  },
];

export function getMockPlotList(params?: {
  tag?: string;
  limit?: number;
  offset?: number;
}): PlotListResponse {
  let filtered = mockPlots;
  if (params?.tag) {
    filtered = filtered.filter((p) => p.tags.includes(params.tag as string));
  }
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  };
}

export function getMockPlotDetail(id: string): PlotDetailResponse {
  const plot = mockPlots.find((p) => p.id === id) ?? mockPlots[0];
  return {
    ...plot,
    sections: [],
    owner: {
      id: mockUsers.owner.id,
      displayName: mockUsers.owner.displayName,
      avatarUrl: mockUsers.owner.avatarUrl,
    },
  };
}

export function getMockPlotDetailWithSections(id: string): PlotDetailResponse {
  const plot = mockPlots.find((p) => p.id === id);
  if (!plot) {
    throw new Error(`Plot not found: ${id}`);
  }

  const sections = mockSections
    .filter((s) => s.plotId === id)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return {
    ...plot,
    sections,
    owner: {
      id: mockUsers.owner.id,
      displayName: mockUsers.owner.displayName,
      avatarUrl: mockUsers.owner.avatarUrl,
    },
  };
}

export function getMockTrendingPlots(limit = 5): PlotListResponse {
  const sorted = [...mockPlots].sort((a, b) => b.starCount - a.starCount);
  const items = sorted.slice(0, limit);
  return { items, total: items.length, limit, offset: 0 };
}

export function getMockPopularPlots(limit = 5): PlotListResponse {
  const sorted = [...mockPlots].sort((a, b) => b.starCount - a.starCount);
  const items = sorted.slice(0, limit);
  return { items, total: items.length, limit, offset: 0 };
}

export function getMockLatestPlots(limit = 5): PlotListResponse {
  const sorted = [...mockPlots].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const items = sorted.slice(0, limit);
  return { items, total: items.length, limit, offset: 0 };
}
