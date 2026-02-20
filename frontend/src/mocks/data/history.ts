import type { DiffResponse, HistoryEntry, HistoryListResponse } from "@/lib/api/types";
import { mockUsers } from "./users";

export const mockHistoryEntries: HistoryEntry[] = [
  {
    id: "history-001",
    sectionId: "section-001",
    operationType: "insert",
    payload: { position: 0, content: "空飛ぶ自動販売機の概要を追加", length: 14 },
    user: {
      id: mockUsers.owner.id,
      displayName: mockUsers.owner.displayName,
      avatarUrl: mockUsers.owner.avatarUrl,
    },
    version: 1,
    createdAt: "2026-02-20T01:00:00Z",
  },
  {
    id: "history-002",
    sectionId: "section-001",
    operationType: "update",
    payload: { position: 5, content: "改良版の仕様を反映", length: 9 },
    user: {
      id: mockUsers.contributor.id,
      displayName: mockUsers.contributor.displayName,
      avatarUrl: mockUsers.contributor.avatarUrl,
    },
    version: 2,
    createdAt: "2026-02-20T02:00:00Z",
  },
  {
    id: "history-003",
    sectionId: "section-001",
    operationType: "delete",
    payload: { position: 20, content: null, length: 5 },
    user: {
      id: mockUsers.owner.id,
      displayName: mockUsers.owner.displayName,
      avatarUrl: mockUsers.owner.avatarUrl,
    },
    version: 3,
    createdAt: "2026-02-20T03:00:00Z",
  },
  {
    id: "history-004",
    sectionId: "section-002",
    operationType: "insert",
    payload: { position: 0, content: "ドローンの飛行仕様を記述", length: 12 },
    user: {
      id: mockUsers.contributor.id,
      displayName: mockUsers.contributor.displayName,
      avatarUrl: mockUsers.contributor.avatarUrl,
    },
    version: 1,
    createdAt: "2026-02-20T04:00:00Z",
  },
  {
    id: "history-005",
    sectionId: "section-002",
    operationType: "update",
    payload: { position: 10, content: "最大高度を50mに修正", length: 10 },
    user: {
      id: mockUsers.owner.id,
      displayName: mockUsers.owner.displayName,
      avatarUrl: mockUsers.owner.avatarUrl,
    },
    version: 2,
    createdAt: "2026-02-20T05:00:00Z",
  },
];

export const mockHistoryList: HistoryListResponse = {
  items: mockHistoryEntries,
  total: mockHistoryEntries.length,
};

export const mockDiffResponse: DiffResponse = {
  fromVersion: 1,
  toVersion: 3,
  additions: [
    { start: 0, end: 14, text: "空飛ぶ自動販売機の概要を追加" },
    { start: 5, end: 14, text: "改良版の仕様を反映" },
  ],
  deletions: [{ start: 20, end: 25, text: "古い仕様の記述" }],
};
