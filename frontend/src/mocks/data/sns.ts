import type {
  CommentListResponse,
  CommentResponse,
  StarListResponse,
  ThreadResponse,
} from "@/lib/api/types";
import { mockUsers } from "./users";

export const mockStarList: StarListResponse = {
  items: [
    {
      user: {
        id: mockUsers.contributor.id,
        displayName: mockUsers.contributor.displayName,
        avatarUrl: mockUsers.contributor.avatarUrl,
      },
      createdAt: "2026-02-18T10:00:00Z",
    },
    {
      user: {
        id: mockUsers.viewer.id,
        displayName: mockUsers.viewer.displayName,
        avatarUrl: mockUsers.viewer.avatarUrl,
      },
      createdAt: "2026-02-19T08:00:00Z",
    },
    {
      user: {
        id: mockUsers.admin.id,
        displayName: mockUsers.admin.displayName,
        avatarUrl: mockUsers.admin.avatarUrl,
      },
      createdAt: "2026-02-19T12:00:00Z",
    },
    {
      user: {
        id: mockUsers.newcomer.id,
        displayName: mockUsers.newcomer.displayName,
        avatarUrl: mockUsers.newcomer.avatarUrl,
      },
      createdAt: "2026-02-20T06:00:00Z",
    },
    {
      user: {
        id: mockUsers.owner.id,
        displayName: mockUsers.owner.displayName,
        avatarUrl: mockUsers.owner.avatarUrl,
      },
      createdAt: "2026-02-20T09:00:00Z",
    },
  ],
  total: 5,
};

export const mockThread: ThreadResponse = {
  id: "thread-001",
  plotId: "plot-001",
  sectionId: "section-001",
  commentCount: 5,
  createdAt: "2026-02-18T10:00:00Z",
};

export const mockComments: CommentResponse[] = [
  {
    id: "comment-001",
    threadId: "thread-001",
    content: "この空飛ぶ自販機のアイデア、面白いですね！実現可能性はどうでしょう？",
    parentCommentId: null,
    user: {
      id: mockUsers.contributor.id,
      displayName: mockUsers.contributor.displayName,
      avatarUrl: mockUsers.contributor.avatarUrl,
    },
    createdAt: "2026-02-18T10:30:00Z",
  },
  {
    id: "comment-002",
    threadId: "thread-001",
    content: "ドローン技術の進歩を考えると、5年以内には試作品ができそうですよ。",
    parentCommentId: "comment-001",
    user: {
      id: mockUsers.owner.id,
      displayName: mockUsers.owner.displayName,
      avatarUrl: mockUsers.owner.avatarUrl,
    },
    createdAt: "2026-02-18T11:00:00Z",
  },
  {
    id: "comment-003",
    threadId: "thread-001",
    content: "重量制限と飛行距離のバランスが課題になりそうです。",
    parentCommentId: "comment-001",
    user: {
      id: mockUsers.viewer.id,
      displayName: mockUsers.viewer.displayName,
      avatarUrl: mockUsers.viewer.avatarUrl,
    },
    createdAt: "2026-02-18T12:00:00Z",
  },
  {
    id: "comment-004",
    threadId: "thread-001",
    content: "バッテリー技術の革新が鍵ですね。固体電池が実用化されれば一気に進みそう。",
    parentCommentId: null,
    user: {
      id: mockUsers.admin.id,
      displayName: mockUsers.admin.displayName,
      avatarUrl: mockUsers.admin.avatarUrl,
    },
    createdAt: "2026-02-19T09:00:00Z",
  },
  {
    id: "comment-005",
    threadId: "thread-001",
    content: "初めてこのプロジェクトを見ました。参加したいです！",
    parentCommentId: null,
    user: {
      id: mockUsers.newcomer.id,
      displayName: mockUsers.newcomer.displayName,
      avatarUrl: mockUsers.newcomer.avatarUrl,
    },
    createdAt: "2026-02-20T07:00:00Z",
  },
];

export const mockCommentList: CommentListResponse = {
  items: mockComments,
  total: mockComments.length,
};
