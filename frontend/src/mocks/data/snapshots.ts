import type {
  RollbackLogListResponse,
  RollbackLogResponse,
  SnapshotDetailResponse,
  SnapshotListResponse,
  SnapshotResponse,
} from "@/lib/api/types";
import { mockUsers } from "./users";

export const mockSnapshots: SnapshotResponse[] = [
  {
    id: "snapshot-001",
    plotId: "plot-001",
    version: 1,
    createdAt: "2026-02-10T00:05:00Z",
  },
  {
    id: "snapshot-002",
    plotId: "plot-001",
    version: 2,
    createdAt: "2026-02-12T00:05:00Z",
  },
  {
    id: "snapshot-003",
    plotId: "plot-001",
    version: 3,
    createdAt: "2026-02-15T00:05:00Z",
  },
  {
    id: "snapshot-004",
    plotId: "plot-001",
    version: 4,
    createdAt: "2026-02-18T00:05:00Z",
  },
  {
    id: "snapshot-005",
    plotId: "plot-001",
    version: 5,
    createdAt: "2026-02-20T00:05:00Z",
  },
];

export const mockSnapshotList: SnapshotListResponse = {
  items: mockSnapshots,
  total: mockSnapshots.length,
};

export const mockSnapshotDetail: SnapshotDetailResponse = {
  id: "snapshot-003",
  plotId: "plot-001",
  version: 3,
  content: {
    plot: {
      title: "空飛ぶ自動販売機",
      description: "ドローン搭載の自販機。どこでも好きな場所に飲み物を届けてくれる。",
      tags: ["テクノロジー", "飲料", "ドローン"],
    },
    sections: [
      {
        id: "snap-section-001",
        title: "概要",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "スナップショット時点の概要テキスト。" }],
            },
          ],
        },
        orderIndex: 0,
        version: 2,
      },
      {
        id: "snap-section-002",
        title: "仕様",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "スナップショット時点の仕様テキスト。" }],
            },
          ],
        },
        orderIndex: 1,
        version: 3,
      },
    ],
  },
  createdAt: "2026-02-15T00:05:00Z",
};

export const mockRollbackLogs: RollbackLogResponse[] = [
  {
    id: "rollback-log-001",
    plotId: "plot-001",
    snapshotId: "snapshot-001",
    snapshotVersion: 1,
    user: {
      id: mockUsers.owner.id,
      displayName: mockUsers.owner.displayName,
      avatarUrl: mockUsers.owner.avatarUrl,
    },
    reason: "荒らし行為の復旧",
    createdAt: "2026-02-19T10:00:00Z",
  },
  {
    id: "rollback-log-002",
    plotId: "plot-001",
    snapshotId: "snapshot-003",
    snapshotVersion: 3,
    user: {
      id: mockUsers.admin.id,
      displayName: mockUsers.admin.displayName,
      avatarUrl: mockUsers.admin.avatarUrl,
    },
    reason: null,
    createdAt: "2026-02-19T14:00:00Z",
  },
  {
    id: "rollback-log-003",
    plotId: "plot-001",
    snapshotId: null,
    snapshotVersion: 2,
    user: {
      id: mockUsers.contributor.id,
      displayName: mockUsers.contributor.displayName,
      avatarUrl: mockUsers.contributor.avatarUrl,
    },
    reason: "誤って削除したセクションの復旧",
    createdAt: "2026-02-20T08:00:00Z",
  },
];

export const mockRollbackLogList: RollbackLogListResponse = {
  items: mockRollbackLogs,
  total: mockRollbackLogs.length,
};
