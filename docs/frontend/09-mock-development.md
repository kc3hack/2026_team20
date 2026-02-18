# Mock ファースト開発

> **最重要セクション:** Day 1 の初手で Mock を仕込み、Day 1〜6 は Mock で UI を完成させる。Day 7 で実 API に切り替える。バックエンド API を「待つ」時間は 0 にする。

バックエンド API がまだ動いていない段階でフロントエンド開発を進めるために、リポジトリ関数内で **モックデータを直接返す** 方式を採用する。

> **例外: `authRepository` は Mock しない。** 認証フロー（ログイン→リダイレクト→セッション保持）を Mock で再現するのは困難でバグの温床になるため、**Supabase Auth だけは最初から実物を使う**。こうすると「本物のログイン状態で、モックデータを表示する」開発ができ、本番結合時のトラブルが激減する。

---

## E.1 環境変数設定

プロジェクトルートに `.env.local` を作成し、以下の環境変数を設定する：

```bash
# ===== Mock モード設定 =====
# true: モックデータを使用（開発初期 Day 1-6）
# false: 実際のバックエンドAPIを使用（Day 7〜）
NEXT_PUBLIC_USE_MOCK=true

# ===== バックエンドAPI URL =====
# バックエンドが完成したら設定（Day 7〜）
# 開発環境（ローカル）
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
# または本番・ステージング環境
# NEXT_PUBLIC_API_URL=https://api.plot-platform.example.com/v1

# ===== Supabase 認証設定（最初から必要） =====
# Supabase プロジェクトの Settings > API から取得
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwODAwMDAwMCwiZXhwIjoyMDIzNTc2MDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzA4MDAwMDAwLCJleHAiOjIwMjM1NzYwMDB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**取得手順:**

1. **Supabase プロジェクト作成:**
   - https://supabase.com/ にアクセス
   - "New Project" でプロジェクト作成
   - Project Settings > API から `URL`、`anon public` キー（PUBLISHABLE_KEY）、`service_role` キー（SECRET_KEY）をコピー

2. **OAuth プロバイダ設定（GitHub / Google）:**
   - Supabase Dashboard > Authentication > Providers
   - GitHub / Google を有効化し、OAuth アプリを作成
   - Callback URL: `https://<your-supabase-project>.supabase.co/auth/v1/callback`

3. **`.env.local` に記載後、Git にコミットしない:**
   ```bash
   # .gitignore に .env.local が含まれていることを確認
   git status  # .env.local が表示されないことを確認
   ```

---

## E.2 Mock データ実装パターン

### パターン1: Repository 層で直接分岐（推奨）

```typescript
// lib/api/plots.ts
import { apiClient } from "./client";
import type { PlotListResponse, PlotDetailResponse } from "./types";

// 🎭 モックデータ定義
const MOCK_PLOTS: PlotListResponse = {
  items: [
    {
      id: "mock-1",
      title: "空飛ぶ自動販売機",
      description: "ドローン搭載の自販機。どこでも好きな場所に飲み物を届けてくれる。",
      tags: ["テクノロジー", "飲料"],
      ownerId: "user-1",
      starCount: 42,
      isStarred: false,
      isPaused: false,
      editingUsers: [],
      createdAt: "2026-02-10T00:00:00Z",
      updatedAt: "2026-02-15T00:00:00Z",
    },
    {
      id: "mock-2",
      title: "話せる猫耳",
      description: "猫の言葉が人間語に翻訳される魔法の耳飾り。",
      tags: ["動物", "魔法"],
      ownerId: "user-2",
      starCount: 128,
      isStarred: true,
      isPaused: false,
      editingUsers: [{ id: "user-3", displayName: "次郎", avatarUrl: null, sectionId: "section-1" }],
      createdAt: "2026-01-28T09:00:00Z",
      updatedAt: "2026-02-15T12:00:00Z",
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

// 🔀 環境変数で分岐
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const plotRepository = {
  trending(limit = 5) {
    if (USE_MOCK) {
      return Promise.resolve({ items: MOCK_PLOTS.items.slice(0, limit), ... });
    }
    return apiClient<PlotListResponse>(`/plots/trending?limit=${limit}`);
  },

  /** Plot 詳細取得 */
  detail(id: string) {
    if (USE_MOCK) {
      const item = MOCK_PLOTS.items.find((p) => p.id === id);
      if (!item) throw new Error("Plot not found");
      return Promise.resolve({
        ...item,
        sections: [
          {
            id: "section-1",
            plotId: id,
            title: "概要",
            content: "<p>これは架空のプロダクトです。</p>",
            order: 0,
            createdBy: "user-1",
            createdAt: "2026-02-10T00:00:00Z",
            updatedAt: "2026-02-10T00:00:00Z",
          },
        ],
        owner: {
          id: "user-1",
          displayName: "太郎",
          avatarUrl: null,
        },
      } as PlotDetailResponse);
    }
    return apiClient<PlotDetailResponse>(`/plots/${id}`);
  },

  /** Plot 作成 */
  create(data: { title: string; description?: string; tags?: string[] }) {
    if (USE_MOCK) {
      const newPlot = {
        id: `mock-${Date.now()}`,
        ...data,
        description: data.description ?? "",
        tags: data.tags ?? [],
        ownerId: "user-1",
        starCount: 0,
        isStarred: false,
        isPaused: false,
        editingUsers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return Promise.resolve(newPlot);
    }
    return apiClient<PlotResponse>("/plots", { method: "POST", body: data });
  },
};
```

### パターン2: 共通 Mock データファイル（オプション）

複数のリポジトリで同じデータを使いたい場合、`lib/mock/data.ts` に一元化する。

```typescript
// lib/mock/data.ts
import type { PlotResponse, UserBrief } from "@/lib/api/types";

export const mockUsers: Record<string, UserBrief> = {
  "user-1": {
    id: "user-1",
    displayName: "太郎",
    avatarUrl: null,
  },
  "user-2": {
    id: "user-2",
    displayName: "花子",
    avatarUrl: "https://i.pravatar.cc/150?u=hanako",
  },
};

export const mockPlots: PlotResponse[] = [
  {
    id: "mock-1",
    title: "空飛ぶ自動販売機",
    description: "ドローン搭載の自販機。どこでも好きな場所に飲み物を届けてくれる。",
    tags: ["テクノロジー", "飲料"],
    ownerId: "user-1",
    starCount: 42,
    isStarred: false,
    isPaused: false,
    editingUsers: [],
    createdAt: "2026-02-10T00:00:00Z",
    updatedAt: "2026-02-15T00:00:00Z",
  },
  // ... 他のモックデータ
];
```

```typescript
// lib/api/plots.ts での使用例
import { mockPlots } from "@/lib/mock/data";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const plotRepository = {
  trending(limit = 5) {
    if (USE_MOCK) {
      return Promise.resolve({
        items: mockPlots.slice(0, limit),
        total: mockPlots.length,
        limit,
        offset: 0,
      });
    }
    return apiClient<PlotListResponse>(`/plots/trending?limit=${limit}`);
  },
};
```

---

## E.3 認証フロー実装パターン（Supabase Auth）

認証は **Mock を使わず、最初から実物の Supabase Auth を使う**。

**必要なファイル:**
- `lib/supabase/client.ts` — `createBrowserClient` でブラウザ用クライアント作成
- `app/auth/callback/route.ts` — OAuth コールバック処理 (`exchangeCodeForSession`)
- `hooks/useAuth.ts` — `useAuth()` hook (セッション取得, `onAuthStateChange` 監視, `signIn`, `signOut`)
- `app/auth/login/page.tsx` — ログインページ (GitHub/Google ボタン)

詳細は [Issue #4](./issues/step1-day1.md), [Issue #8](./issues/step3-day3.md) を参照。

---

## E.4 Mock ⇄ 実API 切り替えフロー

### Day 1-6: Mock モードで開発

```bash
# .env.local
NEXT_PUBLIC_USE_MOCK=true

# この状態で開発サーバー起動
task frontend:dev
```

すべての Repository が Mock データを返す → UI をサクサク実装できる

### Day 7: 実 API に切り替え

```bash
# .env.local
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1  # バックエンドのURL

# 開発サーバー再起動
task frontend:dev
```

すべての Repository が実 API を呼ぶ → バックエンドと統合テスト

### トラブルシューティング

- **API エラーが出る:** バックエンドが起動しているか確認 (`http://localhost:8000/docs` で Swagger UI が開くか)
- **CORS エラー:** バックエンドの CORS 設定を確認（`http://localhost:3000` を許可する）
- **型が合わない:** `lib/api/types.ts` と実際のレスポンスを比較、必要に応じて型を修正

---

## E.5 Mock データの追加ルール

**各自が担当するリポジトリのモックデータは各自が追加する。**

| 担当者 | 追加するモックデータ |
|--------|-------------------|
| Dev A | `plotRepository`, `searchRepository` のモックデータ |
| Dev B | `snsRepository`, `sectionRepository` のモックデータ |

**共通ファイル（`lib/mock/data.ts`）の編集:**
- 型定義（`PlotResponse`, `UserBrief` 等）は Issue #2 で Dev A が雛形作成
- 以降は各自が **自分の担当データのみ** 追加
- コンフリクト回避のため、配列の末尾に追加する

```typescript
// ✅ 良い例: 配列の末尾に追加
export const mockPlots: PlotResponse[] = [
  // ... 既存データ ...
  {
    id: "mock-3", // 新規追加
    title: "あなたの追加データ",
    // ...
  },
];

// ❌ 悪い例: 既存データの間に挿入（コンフリクトの原因）
export const mockPlots: PlotResponse[] = [
  { id: "mock-1", /* ... */ },
  { id: "mock-new", /* ... */ }, // ← ここに挿入すると他の人と衝突
  { id: "mock-2", /* ... */ },
];
```

---

## E.6 リアルタイム系 Hook の Mock

`NEXT_PUBLIC_USE_MOCK=true` のとき、Supabase Realtime / Y.js への接続は行わない。以下のように各 Hook をローカル state のみで動作させる。

### `useSectionLock` — ローカル state のみ

Mock モードでは Y.js Awareness を使わず、**コンポーネントのローカル state だけでロック状態を管理**する。

```typescript
// hooks/useSectionLock.ts の Mock 分岐例
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useSectionLock(sectionId: string) {
  const [lockState, setLockState] = useState<"unlocked" | "locked-by-me" | "locked-by-other">("unlocked");

  if (USE_MOCK) {
    return {
      lockState,
      lockedBy: null,
      acquireLock: () => {
        setLockState("locked-by-me");
        return true; // Mock では常に成功
      },
      releaseLock: () => {
        setLockState("unlocked");
      },
    };
  }

  // 実装: Y.js Awareness ベースのロジック
  // ...
}
```

**ポイント:**
- 他ユーザーによるロック（`locked-by-other`）は Mock では発生しない
- `acquireLock()` は常に `true` を返す（競合シミュレーションは不要）
- UI の状態遷移（`unlocked` → `locked-by-me` → `unlocked`）は確認できる

### `useRealtimeSection` — no-op

Mock モードではリアルタイム同期を行わない。**何もしない（no-op）フック**を返す。

```typescript
// hooks/useRealtimeSection.ts の Mock 分岐例
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useRealtimeSection(sectionId: string, enabled: boolean) {
  if (USE_MOCK || !enabled) {
    return {
      liveContent: null,        // リアルタイム更新なし
      connectionStatus: "disconnected" as const,
    };
  }

  // 実装: Y.js + Supabase Realtime Broadcast ベースのロジック
  // ...
}
```

**ポイント:**
- `liveContent` は常に `null` → コンポーネントは REST API から取得した初期データのみで表示
- `connectionStatus` は `"disconnected"` → リアルタイム接続の UI 表示がある場合、適切にフォールバック
- Supabase に接続できない環境（CI、オフライン開発）でも安全に動作する

### Mock モード ↔ 実動作の対応表

| Hook | Mock モード | 実動作 |
|------|-----------|--------|
| `useSectionLock` | ローカル state のみ。常に成功 | Y.js Awareness で他ユーザーと同期 |
| `useRealtimeSection` | no-op (`liveContent: null`) | Y.js + Broadcast で差分同期 |

