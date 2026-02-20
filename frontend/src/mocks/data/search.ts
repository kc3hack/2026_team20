import type { SearchResponse } from "@/lib/api/types";
import { mockUsers } from "./users";

export const mockSearchResults: SearchResponse = {
  items: [
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
      description:
        "着るだけで光学迷彩が発動する次世代ステルスウェア。通学や通勤のストレスから解放。",
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
  ],
  total: 3,
  query: "架空",
};
