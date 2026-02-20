import type {
  PlotListResponse,
  PlotResponse,
  UserProfileResponse,
  UserResponse,
} from "@/lib/api/types";

export const mockUsers = {
  owner: {
    id: "user-owner-001",
    displayName: "田中太郎",
    avatarUrl: "https://i.pravatar.cc/150?u=tanaka",
    email: "tanaka@example.com",
  },
  contributor: {
    id: "user-contrib-002",
    displayName: "佐藤花子",
    avatarUrl: "https://i.pravatar.cc/150?u=sato",
    email: "sato@example.com",
  },
  viewer: {
    id: "user-viewer-003",
    displayName: "鈴木一郎",
    avatarUrl: null,
    email: "suzuki@example.com",
  },
  admin: {
    id: "user-admin-004",
    displayName: "管理者山田",
    avatarUrl: "https://i.pravatar.cc/150?u=yamada",
    email: "yamada@example.com",
  },
  newcomer: {
    id: "user-new-005",
    displayName: "新人木村",
    avatarUrl: null,
    email: "kimura@example.com",
  },
} as const;

export const mockCurrentUser: UserResponse = {
  id: mockUsers.owner.id,
  email: mockUsers.owner.email,
  displayName: mockUsers.owner.displayName,
  avatarUrl: mockUsers.owner.avatarUrl,
  createdAt: "2026-01-15T09:00:00Z",
};

export const mockUserProfile: UserProfileResponse = {
  id: mockUsers.owner.id,
  displayName: mockUsers.owner.displayName,
  avatarUrl: mockUsers.owner.avatarUrl,
  plotCount: 10,
  contributionCount: 50,
  createdAt: "2026-01-15T09:00:00Z",
};

const userPlotItems: PlotResponse[] = [
  {
    id: "plot-user-001",
    title: "空飛ぶ自動販売機",
    description: "ドローン搭載の自販機。どこでも好きな場所に飲み物を届けてくれる。",
    tags: ["テクノロジー", "飲料"],
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
    id: "plot-user-002",
    title: "夢を録画できる枕",
    description: "睡眠中の夢を映像として録画・再生できる不思議な枕。",
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
];

export const mockUserPlots: PlotListResponse = {
  items: userPlotItems,
  total: userPlotItems.length,
  limit: 20,
  offset: 0,
};

const userContributionItems: PlotResponse[] = [
  {
    id: "plot-contrib-001",
    title: "猫語翻訳イヤホン",
    description: "猫の鳴き声をリアルタイムで人間語に翻訳する魔法のイヤホン。",
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
];

export const mockUserContributions: PlotListResponse = {
  items: userContributionItems,
  total: userContributionItems.length,
  limit: 20,
  offset: 0,
};
