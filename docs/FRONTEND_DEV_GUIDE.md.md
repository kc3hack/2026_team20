# フロントエンド開発計画書

> **プロダクト:** Plot Platform — 「架空の欲しいもの」をみんなで作り上げる Wiki 共同編集プラットフォーム
> **期間:** 1 週間（7 日間）
> **フロントエンド開発者:** 2 名（Dev A / Dev B）
> **フレームワーク:** Next.js (App Router) + TypeScript

---

## ⚠️ ハッカソン鉄則（全員必読）

> **この計画書は「理想の完成形」です。ハッカソンでは時間が命。以下の 3 つのルールを常に意識してください。**

| # | ルール | 具体的な行動 |
|---|-------|-------------|
| 1 | **テストは Unit のみ。E2E は後回し** | E2E (Playwright) は時間が溶ける。**機能実装を最優先**し、テストは `lib/api/client.test.ts` 等のロジック Unit Test だけ書く。E2E は全機能完成後に余裕があれば。 |
| 2 | **Tiptap エディタは MVP で止める** | 最初は `StarterKit` だけで「文字が打てて保存できる」を実現する。ツールバー装飾・色パレット・画像挿入は **後まわし**。沼にハマると 1 日消える。 |
| 3 | **Mock ファーストで開発する** | バックエンド API を待たない。`NEXT_PUBLIC_USE_MOCK=true` でモックデータを返し、UIを先に完成させる。最後に API を繋ぎ込む。**ただし認証（Supabase Auth）だけは最初から実物を使う**（→ [付録E](#e-api-が未完成の場合の暫定対応mock-ファースト開発) 参照） |

---

## 目次

1. [A. 推奨技術スタック最終決定リスト](#a-推奨技術スタック最終決定リスト)
2. [B. 詳細ディレクトリ構造](#b-詳細ディレクトリ構造)
3. [C. 共通設計方針](#c-共通設計方針)
   - [C.1 API 抽象化戦略](#c1-api-抽象化戦略)
   - [C.2 スタイリング戦略](#c2-スタイリング戦略)
   - [C.3 テスト戦略](#c3-テスト戦略)
4. [D. 開発ステップとタスク割り当て](#d-開発ステップとタスク割り当て)

---

## A. 推奨技術スタック最終決定リスト

### コアフレームワーク（確定済み）

| カテゴリ | ライブラリ | バージョン | 用途 |
|---------|-----------|-----------|------|
| Framework | Next.js (App Router) | 16.x | SSR/RSC/ルーティング |
| Language | TypeScript | 5.x | 型安全 |
| UI Library | shadcn/ui (New York) | latest | 基盤 UI コンポーネント |
| Styling (primary) | Tailwind CSS | 4.x | ユーティリティファーストCSS |
| Styling (secondary) | SCSS Modules | sass 1.x | 複雑なカスタムスタイル |
| Editor | Tiptap | 2.x | リッチテキストエディタ |
| Realtime | Y.js + y-prosemirror | 13.x | CRDT 共同編集 |
| Auth | Supabase Auth (@supabase/ssr) | latest | OAuth / セッション管理 |
| Icons | Lucide React | latest | SVG アイコン |
| Linter/Formatter | Biome | 2.x | ESLint + Prettier 代替 |
| Test (Unit) | Vitest + Testing Library | latest | コンポーネント / ロジックテスト |
| Test (E2E) | Playwright | latest | ブラウザ統合テスト |

### 追加選定ライブラリ

| ライブラリ | 採用理由 |
|-----------|---------|
| **@tanstack/react-query v5** | サーバー状態管理のデファクト。キャッシュ・再取得・楽観的更新・ローディング/エラー状態を宣言的に管理。API 層と UI コンポーネントを疎結合にできる。 |
| **@tanstack/react-query-devtools** | 開発中のキャッシュ状態/クエリ状態の可視化。デバッグ効率が劇的に向上。 |
| **react-hook-form + @hookform/resolvers** | 非制御コンポーネントベースの高パフォーマンスフォームライブラリ。shadcn/ui の `<Form>` と統合済み。 |
| **zod** | TypeScript ファーストのスキーマバリデーション。react-hook-form のリゾルバーとして使用し、フォームバリデーションを型安全に実現。 |
| **sonner** | shadcn/ui 公式推奨のトースト通知ライブラリ。成功/エラー通知用。 |
| **date-fns** | 軽量な日付フォーマットライブラリ。`formatDistanceToNow` で「3 時間前」表示等。 |

### インストールコマンド

```bash
# 追加ライブラリ
pnpm add @tanstack/react-query @tanstack/react-query-devtools
pnpm add react-hook-form @hookform/resolvers zod
pnpm add sonner date-fns
pnpm add @supabase/ssr

# shadcn/ui コンポーネント (必要に応じて追加)
pnpm dlx shadcn@latest add button card input textarea badge avatar
pnpm dlx shadcn@latest add dropdown-menu dialog sheet separator skeleton
pnpm dlx shadcn@latest add tabs tooltip form sonner
```

---

## B. 詳細ディレクトリ構造

```
frontend/
├── public/                              # 静的ファイル
│   └── favicon.ico
│
├── src/
│   ├── app/                             # ===== Next.js App Router =====
│   │   ├── globals.css                  #   Tailwind v4 ディレクティブ + CSS 変数 (shadcn テーマ)
│   │   ├── layout.tsx                   #   ルートレイアウト (Providers, Header, Footer)
│   │   ├── page.tsx                     #   トップページ (/) — ランキング3セクション
│   │   ├── page.module.scss             #   トップページ用 SCSS
│   │   ├── loading.tsx                  #   グローバルローディング UI
│   │   ├── not-found.tsx                #   404 ページ
│   │   ├── error.tsx                    #   グローバルエラーバウンダリ
│   │   │
│   │   ├── auth/                        # --- 認証 ---
│   │   │   ├── login/
│   │   │   │   └── page.tsx             #     ログインページ (GitHub / Google ボタン)
│   │   │   └── callback/
│   │   │       └── route.ts             #     OAuth コールバック (Route Handler)
│   │   │
│   │   ├── plots/                       # --- Plot (Wiki) ---
│   │   │   ├── page.tsx                 #     Plot 一覧ページ (/plots?tag=xxx)
│   │   │   ├── new/
│   │   │   │   └── page.tsx             #     Plot 新規作成 (認証必須)
│   │   │   └── [id]/
│   │   │       ├── page.tsx             #     Plot 詳細ページ
│   │   │       ├── page.module.scss     #     Plot 詳細用 SCSS
│   │   │       ├── edit/
│   │   │       │   └── page.tsx         #     Plot 編集ページ (認証必须)
│   │   │       └── history/
│   │   │           └── page.tsx         #     履歴・復元ページ
│   │   │
│   │   ├── search/                      # --- 検索 ---
│   │   │   └── page.tsx                 #     検索結果ページ (/search?q=xxx)
│   │   │
│   │   └── profile/                     # --- プロフィール ---
│   │       └── [username]/
│   │           └── page.tsx             #     ユーザープロフィールページ
│   │
│   ├── components/                      # ===== React コンポーネント =====
│   │   ├── ui/                          #   shadcn/ui 自動生成 (触らない)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── form.tsx
│   │   │   ├── sonner.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                      #   レイアウト系
│   │   │   ├── Header/
│   │   │   │   ├── Header.tsx           #     ヘッダー (ロゴ, 検索, ユーザーメニュー)
│   │   │   │   └── Header.module.scss
│   │   │   ├── Footer/
│   │   │   │   ├── Footer.tsx           #     フッター
│   │   │   │   └── Footer.module.scss
│   │   │   └── MobileNav/
│   │   │       ├── MobileNav.tsx        #     モバイルナビゲーション (Sheet)
│   │   │       └── MobileNav.module.scss
│   │   │
│   │   ├── plot/                        #   Plot 関連
│   │   │   ├── PlotCard/
│   │   │   │   ├── PlotCard.tsx         #     一覧用カード
│   │   │   │   ├── PlotCard.module.scss
│   │   │   │   └── PlotCard.test.tsx
│   │   │   ├── PlotList/
│   │   │   │   └── PlotList.tsx         #     PlotCard のリスト表示
│   │   │   ├── PlotForm/
│   │   │   │   ├── PlotForm.tsx         #     作成/編集フォーム
│   │   │   │   └── PlotForm.test.tsx
│   │   │   └── PlotDetail/
│   │   │       ├── PlotDetail.tsx       #     詳細表示 (メタ情報 + セクション一覧)
│   │   │       └── PlotDetail.module.scss
│   │   │
│   │   ├── section/                     #   セクション関連
│   │   │   ├── SectionViewer/
│   │   │   │   ├── SectionViewer.tsx    #     セクション閲覧コンポーネント
│   │   │   │   └── SectionViewer.module.scss
│   │   │   ├── SectionEditor/
│   │   │   │   ├── SectionEditor.tsx    #     Tiptap によるセクション編集
│   │   │   │   └── SectionEditor.module.scss
│   │   │   └── SectionList/
│   │   │       └── SectionList.tsx      #     セクションの一覧 (並び替え対応)
│   │   │
│   │   ├── editor/                      #   Tiptap エディタ関連
│   │   │   ├── TiptapEditor/
│   │   │   │   ├── TiptapEditor.tsx     #     Tiptap コアラッパー
│   │   │   │   └── TiptapEditor.module.scss
│   │   │   └── EditorToolbar/
│   │   │       ├── EditorToolbar.tsx    #     ツールバー (Bold, Italic, Color, etc.)
│   │   │       └── EditorToolbar.module.scss
│   │   │
│   │   ├── auth/                        #   認証関連
│   │   │   ├── LoginButton/
│   │   │   │   └── LoginButton.tsx      #     OAuth ログインボタン
│   │   │   ├── UserMenu/
│   │   │   │   └── UserMenu.tsx         #     ログイン済ユーザードロップダウン
│   │   │   └── AuthGuard/
│   │   │       └── AuthGuard.tsx        #     認証必須ラッパー
│   │   │
│   │   ├── sns/                         #   SNS 機能
│   │   │   ├── StarButton/
│   │   │   │   ├── StarButton.tsx       #     スターボタン (トグル)
│   │   │   │   └── StarButton.test.tsx
│   │   │   ├── ForkButton/
│   │   │   │   └── ForkButton.tsx       #     フォークボタン
│   │   │   ├── CommentThread/
│   │   │   │   ├── CommentThread.tsx    #     コメント一覧
│   │   │   │   └── CommentThread.module.scss
│   │   │   └── CommentForm/
│   │   │       └── CommentForm.tsx      #     コメント投稿フォーム
│   │   │
│   │   ├── search/                      #   検索
│   │   │   └── SearchBar/
│   │   │       ├── SearchBar.tsx        #     検索入力 (ヘッダー内)
│   │   │       └── SearchBar.module.scss
│   │   │
│   │   ├── history/                     #   履歴
│   │   │   ├── HistoryList/
│   │   │   │   ├── HistoryList.tsx      #     バージョン履歴一覧
│   │   │   │   └── HistoryList.module.scss
│   │   │   └── DiffViewer/
│   │   │       ├── DiffViewer.tsx       #     差分表示
│   │   │       └── DiffViewer.module.scss
│   │   │
│   │   ├── user/                        #   ユーザー
│   │   │   ├── UserCard/
│   │   │   │   └── UserCard.tsx         #     ユーザー情報カード
│   │   │   └── UserProfile/
│   │   │       ├── UserProfile.tsx      #     プロフィール詳細
│   │   │       └── UserProfile.module.scss
│   │   │
│   │   └── shared/                      #   汎用コンポーネント
│   │       ├── TagBadge/
│   │       │   └── TagBadge.tsx         #     タグ表示バッジ
│   │       ├── Pagination/
│   │       │   └── Pagination.tsx       #     ページネーション
│   │       ├── EmptyState/
│   │       │   └── EmptyState.tsx       #     データなし表示
│   │       └── ErrorMessage/
│   │           └── ErrorMessage.tsx     #     エラー表示
│   │
│   ├── hooks/                           # ===== カスタム Hooks =====
│   │   ├── useAuth.ts                   #   認証状態 & ログイン/ログアウト
│   │   ├── usePlots.ts                  #   Plot 一覧/詳細/CRUD クエリ
│   │   ├── useSections.ts              #   Section CRUD クエリ
│   │   ├── useStar.ts                   #   スター toggle
│   │   ├── useSearch.ts                 #   検索クエリ
│   │   ├── useHistory.ts               #   履歴取得/ロールバック
│   │   ├── useComments.ts              #   コメント取得/投稿
│   │   └── useUser.ts                   #   ユーザープロフィール取得
│   │
│   ├── lib/                             # ===== ユーティリティ & インフラ =====
│   │   ├── api/                         #   --- API 抽象化レイヤー ---
│   │   │   ├── client.ts               #     HTTP クライアント (fetch ラッパー + エラー処理)
│   │   │   ├── types.ts                #     全 API リクエスト/レスポンス型定義
│   │   │   ├── plots.ts                #     Plot リポジトリ
│   │   │   ├── sections.ts             #     Section リポジトリ
│   │   │   ├── auth.ts                 #     Auth リポジトリ
│   │   │   ├── sns.ts                  #     Star / Fork / Comment / Thread リポジトリ
│   │   │   ├── search.ts              #     Search リポジトリ
│   │   │   ├── images.ts              #     Image リポジトリ
│   │   │   ├── history.ts             #     History リポジトリ
│   │   │   └── index.ts               #     一括 re-export
│   │   │
│   │   ├── supabase/                    #   --- Supabase クライアント ---
│   │   │   ├── client.ts               #     ブラウザ用クライアント (createBrowserClient)
│   │   │   ├── server.ts               #     Server Component 用クライアント
│   │   │   └── middleware.ts           #     Middleware 用クライアント
│   │   │
│   │   ├── utils.ts                     #   cn() ユーティリティ等 (shadcn 生成)
│   │   ├── constants.ts                 #   定数 (ページサイズ, 制限値)
│   │   └── query-keys.ts               #   TanStack Query キー定義 (一元管理)
│   │
│   ├── providers/                       # ===== Context Providers =====
│   │   ├── QueryProvider.tsx            #   TanStack Query Provider
│   │   ├── AuthProvider.tsx             #   Supabase Auth Context
│   │   └── Providers.tsx                #   全 Provider を統合するラッパー
│   │
│   ├── styles/                          # ===== グローバル SCSS =====
│   │   ├── _variables.scss              #   SCSS 変数 (ブレイクポイント, z-index, 独自値)
│   │   ├── _mixins.scss                 #   SCSS Mixins (レスポンシブ, テキスト省略, etc.)
│   │   ├── _animations.scss             #   カスタムアニメーション定義
│   │   └── _typography.scss             #   タイポグラフィユーティリティ (Tiptap 用)
│   │
│   ├── types/                           # ===== 共通 TypeScript 型 =====
│   │   └── index.ts                     #   ドメイン横断の共通型
│   │
│   └── middleware.ts                    # Next.js ミドルウェア (認証ガード)
│
├── e2e/                                 # Playwright E2E テスト
│   ├── auth.spec.ts
│   ├── top-page.spec.ts
│   ├── plot-detail.spec.ts
│   └── full-journey.spec.ts
│
├── biome.json                           # Biome 設定
├── components.json                      # shadcn/ui 設定
├── next.config.ts                       # Next.js 設定
├── package.json
├── playwright.config.ts                 # Playwright 設定
├── tsconfig.json                        # TypeScript 設定
└── vitest.config.ts                     # Vitest 設定
```

### ディレクトリ設計原則

| ディレクトリ | 原則 |
|-------------|------|
| `app/` | **ルーティングのみ**に責任を持つ。ページコンポーネントは薄く保ち、ロジックは `hooks/`、表示は `components/` に委譲する。 |
| `components/ui/` | shadcn/ui が自動生成するファイル。**手動で編集しない**。 |
| `components/{feature}/` | 機能ドメインごとにグルーピング。1 コンポーネント = 1 フォルダ（`.tsx` + `.module.scss` + `.test.tsx`）。 |
| `components/shared/` | 2 つ以上の機能ドメインで使われる汎用コンポーネント。 |
| `hooks/` | TanStack Query ベースのカスタム Hook。ページコンポーネントから API を直接呼ばない。 |
| `lib/api/` | **API 変更の影響を吸収する唯一のレイヤー**。Repository パターンでリクエスト関数を分離。 |
| `providers/` | Client Component 限定の Context Provider。`"use client"` 境界をここに集約。 |
| `styles/` | SCSS パーシャル。`@use` で各 `.module.scss` から参照。 |

---

## C. 共通設計方針

### C.1 API 抽象化戦略

#### 設計思想

バックエンド API は未確定で変動する可能性が高いため、**3 層のレイヤー分離**で変更の影響を局所化する。

```
┌──────────────────────────────────────────────────────────────┐
│  Component (page.tsx / *.tsx)                                 │
│    └─ hooks (usePlots, useSections, ...)を呼ぶだけ           │
├──────────────────────────────────────────────────────────────┤
│  Hooks Layer (hooks/*.ts)                                    │
│    └─ TanStack Query でキャッシュ/ローディング管理           │
│    └─ Repository の関数を queryFn / mutationFn に渡す        │
├──────────────────────────────────────────────────────────────┤
│  Repository Layer (lib/api/*.ts)                             │
│    └─ 薄い関数群。HTTP リクエスト ⇄ 型変換のみ              │
│    └─ API 仕様が変わったらここだけ修正                       │
├──────────────────────────────────────────────────────────────┤
│  HTTP Client (lib/api/client.ts)                             │
│    └─ fetch ラッパー。Base URL, Authorization, エラー変換    │
└──────────────────────────────────────────────────────────────┘
```

**API が変わったとき:**
- エンドポイント URL 変更 → `lib/api/{resource}.ts` のみ修正
- レスポンス形式変更 → `lib/api/types.ts` + `lib/api/{resource}.ts` のみ修正
- フィールド名変更（camelCase ⇄ snake_case）→ `lib/api/{resource}.ts` 内でマッピング
- hooks 層・コンポーネント層は **一切変更不要**

#### コード例

**1. HTTP クライアント — `lib/api/client.ts`**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
};

export async function apiClient<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, token, headers: customHeaders, ...init } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail ?? "Unknown error");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** multipart/form-data 用（画像アップロード等） */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail ?? "Upload failed");
  }

  return res.json() as Promise<T>;
}
```

**2. 型定義 — `lib/api/types.ts`**（API レスポンスの正規化型）

```typescript
// ---- 共通 ----
export interface UserBrief {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

// ---- Plot ----
export interface PlotItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  ownerId: string;
  starCount: number;
  isStarred: boolean;
  isPaused: boolean;
  editingUsers: { id: string; displayName: string; avatarUrl: string; sectionId: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PlotListResponse {
  items: PlotItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlotDetailResponse extends PlotItem {
  sections: SectionItem[];
  owner: UserBrief;
}

export interface CreatePlotRequest {
  title: string;
  description?: string;
  tags?: string[];
}

export interface UpdatePlotRequest {
  title?: string;
  description?: string;
  tags?: string[];
}

// ---- Section ----
export interface SectionItem {
  id: string;
  plotId: string;
  title: string;
  content: Record<string, unknown> | null;
  orderIndex: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionListResponse {
  items: SectionItem[];
  total: number;
}

// ---- History ----
export interface HistoryEntry {
  id: string;
  sectionId: string;
  operationType: string;
  payload: Record<string, unknown> | null;
  user: UserBrief;
  version: number;
  createdAt: string;
}

export interface HistoryListResponse {
  items: HistoryEntry[];
  total: number;
}

export interface DiffResponse {
  fromVersion: number;
  toVersion: number;
  additions: { start: number; end: number; text: string }[];
  deletions: { start: number; end: number; text: string }[];
}

// ---- Image ----
export interface ImageUploadResponse {
  url: string;
  filename: string;
  width: number;
  height: number;
}

// ---- SNS ----
export interface StarListResponse {
  items: { user: UserBrief; createdAt: string }[];
  total: number;
}

export interface ThreadResponse {
  id: string;
  plotId: string;
  sectionId: string | null;
  commentCount: number;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  threadId: string;
  content: string;
  parentCommentId: string | null;
  user: UserBrief;
  createdAt: string;
}

export interface CommentListResponse {
  items: CommentItem[];
  total: number;
}

// ---- Search ----
export interface SearchResponse {
  items: PlotItem[];
  total: number;
  query: string;
}

// ---- User ----
export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  plotCount: number;
  contributionCount: number;
  createdAt: string;
}
```

**3. リポジトリ例 — `lib/api/plots.ts`**

```typescript
import { apiClient } from "./client";
import type {
  PlotListResponse,
  PlotDetailResponse,
  PlotItem,
  CreatePlotRequest,
  UpdatePlotRequest,
} from "./types";

export const plotRepository = {
  /** Plot 一覧取得 */
  list(params?: { tag?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.tag) query.set("tag", params.tag);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    return apiClient<PlotListResponse>(`/plots${qs ? `?${qs}` : ""}`);
  },

  /** Plot 詳細取得 */
  get(id: string) {
    return apiClient<PlotDetailResponse>(`/plots/${id}`);
  },

  /** Plot 作成 */
  create(data: CreatePlotRequest, token: string) {
    return apiClient<PlotItem>("/plots", { method: "POST", body: data, token });
  },

  /** Plot 更新 */
  update(id: string, data: UpdatePlotRequest, token: string) {
    return apiClient<PlotItem>(`/plots/${id}`, { method: "PUT", body: data, token });
  },

  /** Plot 削除 */
  delete(id: string, token: string) {
    return apiClient<void>(`/plots/${id}`, { method: "DELETE", token });
  },

  /** 急上昇 */
  trending(limit = 5) {
    return apiClient<PlotListResponse>(`/plots/trending?limit=${limit}`);
  },

  /** 人気 */
  popular(limit = 5) {
    return apiClient<PlotListResponse>(`/plots/popular?limit=${limit}`);
  },

  /** 新規 */
  latest(limit = 5) {
    return apiClient<PlotListResponse>(`/plots/new?limit=${limit}`);
  },
};
```

**4. TanStack Query Hook — `hooks/usePlots.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plotRepository } from "@/lib/api/plots";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "./useAuth";

// ---- クエリ ----
export function usePlotList(params?: { tag?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.plots.list(params),
    queryFn: () => plotRepository.list(params),
  });
}

export function usePlotDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.plots.detail(id),
    queryFn: () => plotRepository.get(id),
    enabled: !!id,
  });
}

export function useTrendingPlots(limit = 5) {
  return useQuery({
    queryKey: queryKeys.plots.trending(limit),
    queryFn: () => plotRepository.trending(limit),
  });
}

export function usePopularPlots(limit = 5) {
  return useQuery({
    queryKey: queryKeys.plots.popular(limit),
    queryFn: () => plotRepository.popular(limit),
  });
}

export function useLatestPlots(limit = 5) {
  return useQuery({
    queryKey: queryKeys.plots.latest(limit),
    queryFn: () => plotRepository.latest(limit),
  });
}

// ---- ミューテーション ----
export function useCreatePlot() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (data: Parameters<typeof plotRepository.create>[0]) =>
      plotRepository.create(data, session?.access_token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plots.all });
    },
  });
}

export function useDeletePlot() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (id: string) =>
      plotRepository.delete(id, session?.access_token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plots.all });
    },
  });
}
```

**5. Query Key 定義 — `lib/query-keys.ts`**

```typescript
export const queryKeys = {
  plots: {
    all: ["plots"] as const,
    list: (params?: Record<string, unknown>) => ["plots", "list", params] as const,
    detail: (id: string) => ["plots", "detail", id] as const,
    trending: (limit?: number) => ["plots", "trending", limit] as const,
    popular: (limit?: number) => ["plots", "popular", limit] as const,
    latest: (limit?: number) => ["plots", "latest", limit] as const,
  },
  sections: {
    all: ["sections"] as const,
    list: (plotId: string) => ["sections", "list", plotId] as const,
    detail: (id: string) => ["sections", "detail", id] as const,
  },
  history: {
    list: (sectionId: string) => ["history", sectionId] as const,
    diff: (sectionId: string, from: number, to: number) =>
      ["history", "diff", sectionId, from, to] as const,
  },
  search: {
    results: (q: string, limit?: number, offset?: number) =>
      ["search", q, limit, offset] as const,
  },
  stars: {
    list: (plotId: string) => ["stars", plotId] as const,
  },
  comments: {
    list: (threadId: string) => ["comments", threadId] as const,
  },
  users: {
    profile: (username: string) => ["users", username] as const,
    plots: (username: string) => ["users", username, "plots"] as const,
    contributions: (username: string) => ["users", username, "contributions"] as const,
  },
} as const;
```

**6. コンポーネントでの使用例**

```tsx
// app/page.tsx (トップページ)
import { PlotList } from "@/components/plot/PlotList/PlotList";
import { useTrendingPlots, usePopularPlots, useLatestPlots } from "@/hooks/usePlots";

export default function TopPage() {
  // Server Component なので直接リポジトリを呼ぶか、
  // Client Component にデータフェッチを委譲する
  return (
    <main>
      <TrendingSection />
      <PopularSection />
      <LatestSection />
    </main>
  );
}

// Client Component
"use client";
function TrendingSection() {
  const { data, isLoading, error } = useTrendingPlots(5);

  if (isLoading) return <PlotListSkeleton />;
  if (error) return <ErrorMessage message="読み込みに失敗しました" />;

  return (
    <section>
      <h2>🔥 急上昇</h2>
      <PlotList items={data?.items ?? []} />
    </section>
  );
}
```

---

### C.2 スタイリング戦略

#### Tailwind と SCSS の使い分けルール

| 用途 | 使用技術 | 例 |
|------|---------|-----|
| スペーシング・マージン・パディング | Tailwind | `className="p-4 mt-2 mb-6"` |
| Flexbox / Grid レイアウト | Tailwind | `className="flex items-center gap-3"` |
| 基本的な色・背景 | Tailwind (shadcn CSS 変数) | `className="text-primary bg-muted"` |
| シンプルなレスポンシブ切り替え | Tailwind | `className="grid-cols-1 md:grid-cols-2"` |
| shadcn/ui コンポーネントへの追加 | Tailwind | `<Button className="w-full">` |
| **複雑なアニメーション・トランジション** | **SCSS Module** | `@keyframes`, 複数プロパティ transition |
| **疑似要素 (::before, ::after)** | **SCSS Module** | デコレーションライン、バッジ装飾 |
| **ネストされた複雑なセレクタ** | **SCSS Module** | `.card:hover .title { ... }` |
| **Tiptap エディタの内部スタイル** | **SCSS Module** | `.ProseMirror` のスタイルオーバーライド |
| **コンポーネント固有の複雑なレイアウト** | **SCSS Module** | 5 つ以上の Tailwind クラスが必要になる場合 |
| **メディアクエリ + 複雑なロジック** | **SCSS Mixin** | カスタムブレイクポイント |

#### 判断基準フローチャート

```
スタイルを書く必要がある
  ├─ shadcn/ui のコンポーネントで実現可能？ → そのまま使う
  ├─ Tailwind クラス 3〜4 個以下で表現可能？ → Tailwind
  ├─ 疑似要素・複雑なアニメーション・ネストセレクタが必要？ → SCSS Module
  └─ 迷ったら → Tailwind で書いて、複雑化したら SCSS Module に切り出す
```

#### `cn()` ユーティリティで Tailwind + SCSS を合成

```tsx
import styles from "./PlotCard.module.scss";
import { cn } from "@/lib/utils";

export function PlotCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border p-4", styles.card, className)}>
      <h3 className={cn("text-lg font-semibold", styles.title)}>
        タイトル
      </h3>
    </div>
  );
}
```

#### SCSS ファイル構成ルール

```scss
// styles/_variables.scss — グローバル SCSS 変数
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;

$z-header: 100;
$z-modal: 200;
$z-toast: 300;

$editor-max-width: 800px;
$sidebar-width: 280px;
```

```scss
// styles/_mixins.scss — 共通 Mixin
@use "variables" as *;

@mixin respond-to($bp) {
  @if $bp == sm { @media (min-width: $breakpoint-sm) { @content; } }
  @if $bp == md { @media (min-width: $breakpoint-md) { @content; } }
  @if $bp == lg { @media (min-width: $breakpoint-lg) { @content; } }
  @if $bp == xl { @media (min-width: $breakpoint-xl) { @content; } }
}

@mixin text-ellipsis($lines: 1) {
  overflow: hidden;
  text-overflow: ellipsis;
  @if $lines == 1 {
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
  }
}

@mixin focus-ring {
  &:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
}
```

**`next.config.ts` の SCSS パス解決設定（必須）:**

```typescript
// next.config.ts
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  sassOptions: {
    // SCSS Module 内で @use "variables" のように短い名前でインポート可能にする
    loadPaths: [path.join(process.cwd(), "src/styles")],
  },
};

export default nextConfig;
```

これにより `.module.scss` 内では `@use "variables"` のように短縮パスで参照できる。

```scss
// components/plot/PlotCard/PlotCard.module.scss — コンポーネント例
@use "variables" as *;
@use "mixins" as *;

.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px hsl(var(--foreground) / 0.08);

    .title {
      color: hsl(var(--primary));
    }
  }
}

.title {
  @include text-ellipsis(2);
  transition: color 0.2s ease;
}

.description {
  @include text-ellipsis(3);
}
```

> **重要:** SCSS Module 内でも shadcn の CSS 変数 (`hsl(var(--primary))` 等) を参照することで、テーマの一貫性を保つ。

---

### C.3 テスト戦略

> **⚠️ ハッカソン方針:** テストは「機能を壊さないための最低限」に絞る。E2E は全機能完成後に余裕があれば書く。

#### テストピラミッド（ハッカソン版）

```
       ╱ E2E (Playwright) ╲             ← 余裕があれば（Day 7）
      ╱  Integration (Vitest) ╲         ← 余裕があれば
     ╱  Unit (Vitest + RTL)     ╲       ← ここだけ必須
    ╱────────────────────────────╲
```

| レイヤー | ツール | テスト対象 | 優先度 |
|---------|--------|-----------|--------|
| Unit | Vitest | `lib/api/client.ts` のエラーハンドリング | **必須** |
| Unit | Vitest + RTL | `PlotCard`, `StarButton` 等の表示 / インタラクション | 余裕があれば |
| Integration | Vitest + RTL | カスタムHook のクエリ/ミューテーション動作 | 余裕があれば |
| E2E | Playwright | ログイン → Plot 作成 → 編集 → スター等の全体フロー | **後回し** |

#### テストファイル命名規則

- Unit / Integration: `ComponentName.test.tsx` (`hooks/usePlots.test.ts`)
- E2E: `feature-name.spec.ts`

#### Mock 戦略

- **Unit テスト:** Repository 関数を `vi.mock()` でモック
- **Hook テスト:** `@tanstack/react-query` の `QueryClient` をテスト用に作成、Repository をモック
- **E2E:** 実際の（またはステージング）バックエンドに接続。不安定な場合は API Route による proxy mock を検討

---

## D. 開発ステップとタスク割り当て

### タイムライン概要

```
Step 1 (Day 1)   : プロジェクト基盤構築
Step 2 (Day 2)   : トップページ / Plot 詳細
Step 3 (Day 3)   : 認証フロー / エディタ
Step 4 (Day 4)   : 検索・Plot 作成 / SNS 機能
Step 5 (Day 5)   : プロフィール / 履歴・復元
Step 6 (Day 6)   : 画像対応・モバイル仕上げ / エラー・ローディング改善
Step 7 (Day 7)   : API 繋ぎ込み・バグ修正・最終調整（余裕があれば E2E）
```

### コンフリクト回避ルール

| ルール | 詳細 |
|-------|------|
| **ファイル所有権** | 同一ファイルへの同時編集を避ける。各 Issue で明記されたファイルのみ触る。 |
| **共通ファイル更新のタイミング** | `lib/api/types.ts`, `lib/query-keys.ts` 等は Step 1 で Dev A が雛形を作成し、以降は必要に応じて各自が **自分の担当型のみ** 追加する。 |
| **re-export の追加** | `lib/api/index.ts` 等への行追加は自分が担当するリポジトリのみ。 |
| **コミット粒度** | 1 機能 = 1 コミット以上。大きな Issue は機能単位で分割コミット。 |

---

### Step 1: プロジェクト基盤構築（Day 1）

> **Day 1 の負荷分散:** 旧 Issue #1 は 25 ファイル以上あり 1 人で完遂するのは厳しいため、#1A / #1B / #1C の 3 つに分割する。#1A → #1B は直列、#1C は Dev B が Issue #2 と並行して着手する。

---

#### Issue #1A

**タイトル:** [Infra] HTTP クライアント・型定義基盤・共通設定

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/lib/api/client.ts` — HTTP クライアント (fetch ラッパー, ApiError, apiClient, apiUpload)
- `src/lib/api/types.ts` — 全API型定義（初期版。各 Step で担当者が型を追加）
- `src/lib/api/index.ts` — 全リポジトリの re-export（雛形。#1B で各リポジトリを追加）
- `src/lib/query-keys.ts` — TanStack Query キー定義
- `src/lib/constants.ts` — 定数定義 (PAGE_SIZE, MAX_TITLE_LENGTH, etc.)
- `src/providers/QueryProvider.tsx` — TanStack Query Provider
- `src/providers/Providers.tsx` — 全 Provider を統合するラッパー（AuthProvider のスロットは #1C で注入）
- `src/app/layout.tsx` — ルートレイアウト (Providers 適用, metadata 設定)
- `src/app/globals.css` — Tailwind v4 ディレクティブ + shadcn CSS 変数
- `src/app/loading.tsx` — グローバルローディング UI
- `src/app/not-found.tsx` — 404 ページ
- `src/app/error.tsx` — グローバルエラーバウンダリ
- `src/types/index.ts` — 共通型 (存在すれば)
- `.env.local` — 環境変数テンプレート

##### 満たすべき要件
- `apiClient<T>()` は以下を満たす:
  - `process.env.NEXT_PUBLIC_API_URL` から Base URL を読み取る (デフォルト: `/api/v1`)
  - 401 / 403 / 404 / 409 等のステータスを `ApiError` に変換
  - `Authorization: Bearer <token>` ヘッダーを任意で付与
  - 204 レスポンスを正しくハンドリング
- `types.ts` は Section C.1 に記載の全型を定義
- `query-keys.ts` は Section C.1 に記載の構造
- `Providers.tsx` は `QueryProvider` をラップ（AuthProvider は #1C 完了後に追加）
- `layout.tsx` はルートに `<Providers>` を適用。`<html lang="ja">` を設定
- pnpm install で追加ライブラリを導入（TanStack Query, zod, sonner, date-fns, @supabase/ssr, react-hook-form）

##### テスト観点
- `apiClient` の正常系/異常系テスト (`lib/api/client.test.ts`)
  - 200 → JSON パース
  - 204 → undefined 返却
  - 4xx → ApiError throw

##### 依存関係
- なし（最初のタスク）
- **ブロック:** Issue #1B, #1C

---

#### Issue #1B

**タイトル:** [Infra] リポジトリ実装 + Mock データ

**担当:** Dev A（#1A 完了後に着手）

**内容:**

##### 実装するファイル
- `src/lib/api/plots.ts` — plotRepository
- `src/lib/api/sections.ts` — sectionRepository
- `src/lib/api/auth.ts` — authRepository（**認証は Mock 対象外**。Supabase SDK を直接呼ぶ薄いラッパーのみ）
- `src/lib/api/sns.ts` — snsRepository (Star, Fork, Thread, Comment)
- `src/lib/api/search.ts` — searchRepository
- `src/lib/api/images.ts` — imageRepository
- `src/lib/api/history.ts` — historyRepository
- `src/lib/api/index.ts` — 全リポジトリの re-export を追記

##### 満たすべき要件
- 各リポジトリは `docs/api.md` のエンドポイントに対応する関数を持つ
- **🔴 Mock 設定（必須）:** `authRepository` **以外の**各リポジトリに `NEXT_PUBLIC_USE_MOCK=true` 時にモックデータを返す分岐を実装する（付録E 参照）
- **🟢 認証は Mock しない:** `authRepository` は最初から Supabase SDK（`@supabase/ssr`）の実 API を呼ぶ。認証フロー（ログイン→リダイレクト→セッション保持）を Mock で再現するのは困難でバグの温床になるため。「本物のログイン状態で、モックデータを表示する」開発スタイルにする
- `.env.local` に `NEXT_PUBLIC_USE_MOCK=true` を設定した状態でコミット
- `plotRepository.list` のクエリパラメータ生成テスト

##### テスト観点
- `plotRepository.list` のクエリパラメータ生成テスト
- Mock モードで各リポジトリが正しくモックデータを返すこと

##### 依存関係
- Issue #1A (HTTP クライアント, 型定義)
- **ブロック:** Issue #3, #7, #8, #9, #10, #11

---

#### Issue #1C

**タイトル:** [Infra] Auth Provider・Supabase クライアント・Middleware

**担当:** Dev B（Issue #2 と並行して着手。#1A の `types.ts` / `client.ts` が merge されたら開始）

**内容:**

##### 実装するファイル
- `src/lib/supabase/client.ts` — ブラウザ用 Supabase クライアント (createBrowserClient)
- `src/lib/supabase/server.ts` — Server Component 用 Supabase クライアント
- `src/lib/supabase/middleware.ts` — Middleware 用ヘルパー
- `src/providers/AuthProvider.tsx` — Auth Context Provider (useAuth フック含む)
- `src/hooks/useAuth.ts` — AuthProvider の useAuth を re-export
- `src/middleware.ts` — Next.js ミドルウェア (認証ガード)
- `src/providers/Providers.tsx` に `AuthProvider` を追加

##### 満たすべき要件
- Supabase クライアントは `@supabase/ssr` の `createBrowserClient` / `createServerClient` を使用
- `AuthProvider` は Supabase セッションを監視し、`user`, `session`, `isLoading`, `signInWithGitHub`, `signInWithGoogle`, `signOut` を提供
- `Providers.tsx` に `AuthProvider` をネストして追加
- `middleware.ts` は `/plots/new`, `/plots/[id]/edit` を保護ルートとする
- **認証は実動作する状態**にすること（Mock ではなく実際の Supabase プロジェクトに接続）

##### テスト観点
- `AuthProvider`: `onAuthStateChange` でセッション変更を検知
- `middleware.ts`: 保護ルートへの未認証アクセスでリダイレクト

##### 依存関係
- Issue #1A (Providers.tsx の雛形)
- **ブロック:** Issue #5 (認証フロー UI)

---

#### Issue #2

**タイトル:** [UI] デザインシステム基盤・共通レイアウト・共有コンポーネント構築

**担当:** Dev B

**内容:**

##### 実装するファイル
- `src/styles/_variables.scss` — SCSS 変数 (ブレイクポイント, z-index, etc.)
- `src/styles/_mixins.scss` — SCSS Mixin (respond-to, text-ellipsis, focus-ring)
- `src/styles/_animations.scss` — 共通アニメーション (fadeIn, slideUp, skeleton-pulse)
- `src/styles/_typography.scss` — Tiptap ProseMirror 用タイポグラフィスタイル
- `src/components/layout/Header/Header.tsx` — ヘッダー (ロゴ, SearchBar 配置枠, UserMenu 配置枠)
- `src/components/layout/Header/Header.module.scss` — ヘッダー SCSS
- `src/components/layout/Footer/Footer.tsx` — フッター
- `src/components/layout/Footer/Footer.module.scss` — フッター SCSS
- `src/components/layout/MobileNav/MobileNav.tsx` — モバイルナビゲーション (Sheet)
- `src/components/layout/MobileNav/MobileNav.module.scss`
- `src/components/shared/TagBadge/TagBadge.tsx` — タグバッジ (クリッカブル)
- `src/components/shared/Pagination/Pagination.tsx` — ページネーション
- `src/components/shared/EmptyState/EmptyState.tsx` — データなし時の表示
- `src/components/shared/ErrorMessage/ErrorMessage.tsx` — エラー表示
- shadcn/ui コンポーネントの追加:
  ```
  button, card, input, textarea, badge, avatar, skeleton,
  dropdown-menu, dialog, sheet, separator, tabs, tooltip, form, sonner
  ```

##### 満たすべき要件
- **Header:**
  - PC: ロゴ（左）、検索バー（中央）、ログインボタン or UserMenu（右）
  - モバイル: ロゴ（左）、ハンバーガーメニュー（右）→ `<Sheet>` でナビゲーション表示
  - SearchBar と UserMenu は **スロット（children / props）で受け取る**。Step 2 以降で実体を注入。Step 1 時点ではプレースホルダーを表示。
  - `position: sticky; top: 0; z-index: $z-header`
- **Footer:**
  - コピーライト、GitHub リンク
- **MobileNav:**
  - `<Sheet>` を使用。ナビゲーションリンク (ホーム, 検索, ログイン) を表示
- **TagBadge:**
  - Props: `tag: string`, `onClick?: (tag: string) => void`
  - クリック時にタグフィルタページへ遷移 or コールバック
- **Pagination:**
  - Props: `total: number`, `limit: number`, `offset: number`, `onPageChange: (offset: number) => void`
- **EmptyState:**
  - Props: `title: string`, `description?: string`, `icon?: ReactNode`, `action?: ReactNode`
- **ErrorMessage:**
  - Props: `message: string`, `onRetry?: () => void`
- SCSS パーシャルは `@use` で各 `.module.scss` からインポート可能であること
- `globals.css` の CSS 変数 (`--primary`, `--background`, etc.) と SCSS 変数は役割分担する：
  - CSS 変数 = 色・テーマ関連 (shadcn が管理)
  - SCSS 変数 = レイアウト・ブレイクポイント・z-index 等

##### テスト観点
- `TagBadge` の表示テスト（タグ名が表示される）
- `Pagination` のページ計算テスト（total=100, limit=20 で 5 ページ）
- `ErrorMessage` の onRetry コールバックテスト

##### 依存関係
- なし（最初のタスク。Dev A と並行作業）
- **ブロック:** Issue #3, #4, #8, #10

---

### Step 2: トップページ / Plot 詳細ページ（Day 2）

---

#### Issue #3

**タイトル:** [UI] トップページ — ランキング 3 セクション + PlotCard + SearchBar

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/components/plot/PlotCard/PlotCard.tsx` — Plot カードコンポーネント
- `src/components/plot/PlotCard/PlotCard.module.scss` — PlotCard SCSS
- `src/components/plot/PlotCard/PlotCard.test.tsx` — PlotCard テスト
- `src/components/plot/PlotList/PlotList.tsx` — PlotCard のリスト表示 (1 列)
- `src/components/search/SearchBar/SearchBar.tsx` — 検索バー
- `src/components/search/SearchBar/SearchBar.module.scss` — SearchBar SCSS
- `src/hooks/usePlots.ts` — useTrendingPlots, usePopularPlots, useLatestPlots, usePlotList
- `src/app/page.tsx` — トップページ
- `src/app/page.module.scss` — トップページ SCSS
- Header への SearchBar 注入（渡し方を Dev B と合意）

##### 満たすべき要件
- **PlotCard:**
  - Props: `plot: PlotItem`
  - 表示項目: タイトル、説明文 (2 行で省略)、タグ (TagBadge)、スター数、作成日 (date-fns `formatDistanceToNow`)
  - カード全体がクリッカブル → `/plots/{id}` へ遷移 (Next.js `<Link>`)
  - ホバー時に浮き上がりアニメーション (SCSS Module)
- **PlotList:**
  - Props: `items: PlotItem[]`, `isLoading?: boolean`
  - 1 列のリスト表示
  - `isLoading` 時は `<Skeleton>` を 3 つ表示
- **SearchBar:**
  - `<Input>` + 検索アイコン (Lucide `Search`)
  - Enter キー or 検索ボタンで `/search?q={入力値}` へ遷移 (`useRouter`)
  - `placeholder="Plotを検索..."` 
- **トップページ:**
  - 3 セクション: 「🔥 急上昇」「⭐ 人気」「🆕 新着」
  - 各セクション: `<PlotList items={data.items} />` + 「もっと見る →」リンク (`/plots?sort=trending` 等)
  - 各セクションは Client Component でラップ (`"use client"` + `useTrendingPlots()` 等)
  - 初回アクセスでも表示が速くなるよう、Skeleton でのフォールバック

##### テスト観点
- `PlotCard`: タイトル・タグ・スター数が正しく表示される
- `PlotCard`: クリック時のリンク先が正しい
- `PlotList`: `isLoading=true` で Skeleton が表示される
- `SearchBar`: Enter キーで onSearch コールバックが呼ばれる

##### 使用する API（仮）
- `GET /plots/trending?limit=5`
- `GET /plots/popular?limit=5`
- `GET /plots/new?limit=5`

##### 依存関係
- Issue #1A / #1B (API 基盤, hooks)
- Issue #2 (Header, TagBadge, Skeleton)

---

#### Issue #4

**タイトル:** [UI] Plot 詳細ページ — セクション閲覧 + メタ情報表示

**担当:** Dev B

**内容:**

##### 実装するファイル
- `src/components/plot/PlotDetail/PlotDetail.tsx` — Plot 詳細表示 (メタ情報 + オーナー + タグ)
- `src/components/plot/PlotDetail/PlotDetail.module.scss`
- `src/components/section/SectionViewer/SectionViewer.tsx` — セクション閲覧 (Tiptap content を HTML 描画)
- `src/components/section/SectionViewer/SectionViewer.module.scss`
- `src/components/section/SectionList/SectionList.tsx` — セクション一覧
- `src/hooks/usePlots.ts` に `usePlotDetail` を追加 (Dev A が雛形を作成済み。型と hook を追記)
- `src/app/plots/[id]/page.tsx` — Plot 詳細ページ
- `src/app/plots/[id]/page.module.scss`

##### 満たすべき要件
- **PlotDetail:**
  - Props: `plot: PlotDetailResponse`
  - 表示: タイトル (h1)、説明文、タグ一覧 (TagBadge)、オーナー情報 (Avatar + 名前)、スター数、作成日
  - 「編集する」ボタン（ログイン中 → `/plots/{id}/edit` へリンク。未ログイン → ログインページ）
  - `isPaused === true` の場合、「⚠️ 編集一時停止中」バナーを表示
- **SectionViewer:**
  - Props: `section: SectionItem`
  - Tiptap の content (JSON) を読み取り専用で描画
  - Tiptap エディタを `editable: false` で初期化し、content を `setContent()` で注入
  - タイポグラフィは `_typography.scss` を適用 (見出し, リスト, リンク等が正しくスタイルされる)
- **SectionList:**
  - Props: `sections: SectionItem[]`
  - `orderIndex` 順にソートして表示
  - 各セクションのタイトルをクリックでそのセクションまでスクロール (id アンカー)
- **Plot 詳細ページ (`/plots/[id]`):**
  - `usePlotDetail(id)` でデータ取得
  - ローディング中は Skeleton 表示
  - 左カラム: セクション一覧 (目次)、右/メイン: セクション本文
  - モバイル: 1 カラム（目次は折りたたみ or 上部に配置）

##### テスト観点
- `PlotDetail`: `isPaused=true` で一時停止バナーが表示される
- `SectionViewer`: Tiptap content が正しく描画される (基本的な heading, paragraph)
- `SectionList`: `orderIndex` 順にソートされる

##### 使用する API（仮）
- `GET /plots/{plotId}` → `PlotDetailResponse`

##### 依存関係
- Issue #1A / #1B (API 基盤, hooks)
- Issue #2 (Header/Footer レイアウト, TagBadge, Avatar)

---

### Step 3: 認証フロー / Tiptap エディタ（Day 3）

---

#### Issue #5

**タイトル:** [Logic/UI] 認証フロー — OAuth ログイン・コールバック・ユーザーメニュー

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/app/auth/login/page.tsx` — ログインページ
- `src/app/auth/callback/route.ts` — OAuth コールバック Route Handler
- `src/components/auth/LoginButton/LoginButton.tsx` — OAuth ログインボタン (GitHub / Google)
- `src/components/auth/UserMenu/UserMenu.tsx` — ログイン済みユーザーメニュー (DropdownMenu)
- `src/components/auth/AuthGuard/AuthGuard.tsx` — 認証必須ラッパー
- `src/providers/AuthProvider.tsx` の仕上げ（Step 1 で骨格作成済み。セッション変更の `onAuthStateChange` 監視を追加）
- Header.tsx に UserMenu / LoginButton の条件分岐表示を追加（Dev B の Header に slots で注入）

##### 満たすべき要件
- **ログインページ:**
  - GitHub ログインボタン、Google ログインボタン
  - 各ボタンは `supabase.auth.signInWithOAuth({ provider })` を呼ぶ
  - `redirectTo` クエリパラメータがあれば、ログイン後にそのページへリダイレクト
- **コールバック Route Handler:**
  - Supabase の `exchangeCodeForSession` を実行
  - 成功後、`/` または `redirectTo` にリダイレクト
- **LoginButton:**
  - Props: `provider: "github" | "google"`, `className?: string`
  - ボタンテキスト: 「GitHub でログイン」/「Google でログイン」
  - 各プロバイダーのアイコン表示
- **UserMenu:**
  - アバター画像を表示。クリックで `<DropdownMenu>` を開く
  - メニュー項目: 「プロフィール」(→ `/profile/{username}`)、「ログアウト」
  - ログアウトは `supabase.auth.signOut()` → `/` へリダイレクト
- **AuthGuard:**
  - Props: `children: ReactNode`, `fallback?: ReactNode`
  - `useAuth()` の `isLoading` 中は `fallback` (デフォルト: Skeleton) 表示
  - 未認証時は `/auth/login?redirectTo={currentPath}` へリダイレクト
- **middleware.ts の更新:**
  - `@supabase/ssr` の `createServerClient` を使用
  - 保護ルート: `/plots/new`, `/plots/*/edit`

##### テスト観点
- `LoginButton`: クリックで `signInWithOAuth` が呼ばれる（モック）
- `UserMenu`: ログアウトクリックで `signOut` が呼ばれる
- `AuthGuard`: 未認証時にリダイレクトされる

##### 依存関係
- Issue #1C (AuthProvider, Supabase クライアント)
- Issue #2 (Header の slot 構造)

---

#### Issue #6

**タイトル:** [UI] Tiptap エディタ統合 — セクション編集・ツールバー・Y.js 準備

**担当:** Dev B

**内容:**

##### 実装するファイル
- `src/components/editor/TiptapEditor/TiptapEditor.tsx` — Tiptap エディタコアラッパー
- `src/components/editor/TiptapEditor/TiptapEditor.module.scss` — エディタ SCSS (ProseMirror スタイル)
- `src/components/editor/EditorToolbar/EditorToolbar.tsx` — ツールバー
- `src/components/editor/EditorToolbar/EditorToolbar.module.scss`
- `src/components/section/SectionEditor/SectionEditor.tsx` — セクション編集コンポーネント (タイトル + TiptapEditor)
- `src/components/section/SectionEditor/SectionEditor.module.scss`
- `src/hooks/useSections.ts` — useSectionList, useUpdateSection, useCreateSection, useDeleteSection
- `src/app/plots/[id]/edit/page.tsx` — Plot 編集ページ
- `src/styles/_typography.scss` の拡充（Tiptap コンテンツのスタイル: h1-h3, p, ul, ol, a, blockquote, code 等）

> **⚠️ ハッカソン注意: エディタは沼。** まず「文字が打てて保存できる」だけを実現する。ツールバー装飾は後。

##### 満たすべき要件

**Phase 1 — MVP（このIssueで必ず完了させる）:**
- **TiptapEditor:**
  - Props:
    ```typescript
    interface TiptapEditorProps {
      content?: Record<string, unknown>;  // 初期コンテンツ (Tiptap JSON)
      editable?: boolean;                 // デフォルト true
      onChange?: (json: Record<string, unknown>) => void;
      className?: string;
    }
    ```
  - 使用する Tiptap 拡張 (**MVP は StarterKit + Placeholder のみ**):
    - `StarterKit` (Bold, Italic, Strike, Heading, BulletList, OrderedList, Blockquote, Code, HorizontalRule)
    - `Placeholder` (`@tiptap/extension-placeholder`) — プレースホルダーテキスト
  - `onChange` は `onUpdate` イベントで `editor.getJSON()` を返す
  - Y.js 対応は **このIssueでは骨格のみ（コメントアウトで準備）**。実際の接続は後続 Issue
- **EditorToolbar（MVP版）:**
  - **最低限のボタンのみ:** Bold, Italic, H1, H2, H3, BulletList, OrderedList, Undo, Redo
  - 各ボタンはアクティブ状態を `editor.isActive()` で判定し、ハイライト表示
- **SectionEditor:**
  - Props:
    ```typescript
    interface SectionEditorProps {
      section: SectionItem;
      onSave: (title: string, content: Record<string, unknown>) => void;
    }
    ```
  - セクションタイトル（`<Input>`）+ TiptapEditor
  - 「保存」ボタンで `onSave` を呼ぶ
  - デバウンスによる自動保存は将来実装（今は手動保存のみ）
- **Plot 編集ページ (`/plots/[id]/edit`):**
  - `usePlotDetail(id)` でデータ取得
  - 各セクションを `SectionEditor` で表示
  - 「セクション追加」ボタン
  - 認証必須（AuthGuard or middleware で保護）
  - `isPaused === true` の場合、編集不可のメッセージを表示

**Phase 2 — 余裕があれば追加（別 Issue or 同 Issue 内で後から）:**
- Underline (`@tiptap/extension-underline`)
- Link (`@tiptap/extension-link`)
- Color + TextStyle（8 色パレット、`<DropdownMenu>` で選択）
- Image (`@tiptap/extension-image`) — 画像挿入（Step 6 の画像アップロードと連携）
- Strikethrough ボタン

##### テスト観点
- `TiptapEditor`: content を渡して editable=false で描画される
- `SectionEditor`: 保存ボタンクリックで onSave が呼ばれる

##### 追加パッケージ
```bash
# MVP
pnpm add @tiptap/extension-placeholder

# Phase 2（余裕があれば）
# pnpm add @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-image
```

##### 使用する API（仮）
- `PUT /sections/{sectionId}` — セクション更新
- `POST /plots/{plotId}/sections` — セクション追加
- `DELETE /sections/{sectionId}` — セクション削除

##### 依存関係
- Issue #1A / #1B (API 基盤)
- Issue #2 (_typography.scss)
- Issue #4 (SectionViewer を参考に、editable 版を構築)

---

### Step 4: 検索・Plot 作成 / SNS 機能（Day 4）

---

#### Issue #7

**タイトル:** [UI/Logic] 検索結果ページ + Plot 一覧ページ + Plot 作成/編集フォーム

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/app/search/page.tsx` — 検索結果ページ
- `src/hooks/useSearch.ts` — useSearchPlots
- `src/app/plots/page.tsx` — Plot 一覧ページ (/plots, タグフィルタ対応)
- `src/app/plots/new/page.tsx` — Plot 新規作成ページ
- `src/components/plot/PlotForm/PlotForm.tsx` — 作成/編集フォーム
- `src/components/plot/PlotForm/PlotForm.test.tsx`
- `src/hooks/usePlots.ts` に `useCreatePlot`, `useUpdatePlot` を追加

##### 満たすべき要件
- **検索結果ページ (`/search?q=xxx`):**
  - URL の `q` パラメータを読み取り `useSearchPlots(q)` でデータ取得
  - 結果を `<PlotList>` で表示
  - 「"xxx" の検索結果: N 件」を表示
  - 結果 0 件では `<EmptyState title="見つかりませんでした" />`
  - ページネーション (offset ベース)
- **Plot 一覧ページ (`/plots?tag=xxx&sort=trending`):**
  - タグフィルタ: URL の `tag` パラメータで `usePlotList({ tag })` を呼ぶ
  - ソート切り替え: Trending / Popular / New (タブ or ドロップダウン)
  - ページネーション
- **Plot 作成ページ (`/plots/new`):**
  - `<PlotForm mode="create" />` を表示
  - 認証必須 (AuthGuard)
- **PlotForm:**
  - Props:
    ```typescript
    interface PlotFormProps {
      mode: "create" | "edit";
      defaultValues?: { title: string; description: string; tags: string[] };
      onSubmit: (data: CreatePlotRequest) => void;
      isSubmitting?: boolean;
    }
    ```
  - フィールド: タイトル (max 200 文字), 説明文 (max 2000 文字), タグ (カンマ区切り入力 or バッジ追加 UI)
  - バリデーション: zod スキーマ + react-hook-form
    ```typescript
    const plotSchema = z.object({
      title: z.string().min(1, "タイトルは必須です").max(200, "200文字以内"),
      description: z.string().max(2000, "2000文字以内").optional(),
      tags: z.array(z.string()).max(10, "タグは10個まで").optional(),
    });
    ```
  - 送信成功後、`sonner` の `toast.success("Plotを作成しました")` を表示
  - 作成成功後、`/plots/{id}` へリダイレクト

##### テスト観点
- `PlotForm`: 空タイトルでバリデーションエラーが表示される
- `PlotForm`: 200 文字超えでバリデーションエラー
- `PlotForm`: 正常入力で onSubmit が呼ばれる

##### 使用する API（仮）
- `GET /search?q=xxx&limit=20&offset=0`
- `GET /plots?tag=xxx&limit=20&offset=0`
- `POST /plots` — Plot 作成
- `PUT /plots/{plotId}` — Plot 更新

##### 依存関係
- Issue #1B (searchRepository, plotRepository)
- Issue #2 (Pagination, EmptyState)
- Issue #3 (PlotCard, PlotList, SearchBar)

---

#### Issue #8

**タイトル:** [UI] SNS 機能 — StarButton / ForkButton / CommentThread

**担当:** Dev B

**内容:**

##### 実装するファイル
- `src/components/sns/StarButton/StarButton.tsx` — スターボタン
- `src/components/sns/StarButton/StarButton.test.tsx`
- `src/components/sns/ForkButton/ForkButton.tsx` — フォークボタン
- `src/components/sns/CommentThread/CommentThread.tsx` — コメント一覧
- `src/components/sns/CommentThread/CommentThread.module.scss`
- `src/components/sns/CommentForm/CommentForm.tsx` — コメント投稿フォーム
- `src/hooks/useStar.ts` — useToggleStar
- `src/hooks/useComments.ts` — useComments, useAddComment

##### 満たすべき要件
- **StarButton:**
  - Props: `plotId: string`, `initialCount: number`, `initialIsStarred: boolean`
  - クリックで star toggle（楽観的更新: UI を即座に反映 → API コール → 失敗時ロールバック）
  - アニメーション: スター追加時にポップエフェクト (SCSS `@keyframes`)
  - 未ログイン時はクリックでログインページへリダイレクト
  - 表示: ⭐ アイコン + カウント数
- **ForkButton:**
  - Props: `plotId: string`
  - クリックで確認ダイアログ → `forkRepository.create(plotId, token)`
  - 成功後、新しい Plot の詳細ページへ遷移
  - `toast.success("フォークしました")`
- **CommentThread:**
  - Props: `threadId: string`
  - `useComments(threadId)` でコメント一覧を取得
  - 各コメント: アバター、表示名、投稿日時、本文
  - `parentCommentId` がある場合、返信先を「@表示名」で表示
  - ローディング中は Skeleton
- **CommentForm:**
  - Props: `threadId: string`, `parentCommentId?: string`
  - `<Textarea>` + 「投稿」ボタン
  - バリデーション: max 5000 文字
  - 投稿成功で `toast.success("コメントを投稿しました")`、コメント一覧を `invalidateQueries`
  - 返信モード: 親コメントの引用表示 + キャンセルボタン
- **Plot 詳細ページとの統合:**
  - `PlotDetail` に `StarButton` と `ForkButton` を配置
  - セクション下部にコメントエリア（Thread がなければ「コメントを開始」ボタンで Thread 作成）

##### テスト観点
- `StarButton`: クリックでカウントが増減する（楽観的更新）
- `StarButton`: 未ログイン時にリダイレクトされる
- `CommentForm`: 空本文で送信不可
- `CommentForm`: 5000 文字超でバリデーションエラー

##### 使用する API（仮）
- `POST /plots/{plotId}/stars` — スター追加
- `DELETE /plots/{plotId}/stars` — スター削除
- `POST /plots/{plotId}/fork` — フォーク
- `POST /threads` — スレッド作成
- `GET /threads/{threadId}/comments` — コメント一覧
- `POST /threads/{threadId}/comments` — コメント投稿

##### 依存関係
- Issue #1B (snsRepository)
- Issue #4 (PlotDetail に StarButton/ForkButton を配置)
- Issue #5 (useAuth — ログイン状態判定)

---

### Step 5: プロフィール / 履歴・復元（Day 5）

---

#### Issue #9

**タイトル:** [UI] ユーザープロフィールページ

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/app/profile/[username]/page.tsx` — プロフィールページ
- `src/components/user/UserProfile/UserProfile.tsx` — プロフィール表示
- `src/components/user/UserProfile/UserProfile.module.scss`
- `src/components/user/UserCard/UserCard.tsx` — ユーザー情報カード (コンパクト版)
- `src/hooks/useUser.ts` — useUserProfile, useUserPlots, useUserContributions

##### 満たすべき要件
- **プロフィールページ (`/profile/[username]`):**
  - ユーザー情報 (アバター, 表示名, 作成日, Plot 数, コントリビューション数)
  - タブ切り替え: 「作成した Plot」/「コントリビューション」
  - 各タブは `<PlotList>` で Plot 一覧を表示
  - ページネーション対応
- **UserProfile:**
  - Props: `profile: UserProfileResponse`
  - アバター (大きめ, `<Avatar>`)、表示名、加入日 (`date-fns format`)
  - 統計: Plot 数、コントリビューション数
- **UserCard:**
  - Props: `user: UserBrief`
  - コンパクトなカード (アバター小 + 表示名)。クリック → プロフィールへ

##### テスト観点
- `UserProfile`: プロフィール情報が正しく表示される
- タブ切り替えで正しいデータが表示される

##### 使用する API（仮）
- `GET /auth/users/{username}` → `UserProfileResponse`
- `GET /auth/users/{username}/plots`
- `GET /auth/users/{username}/contributions`

##### 依存関係
- Issue #1B (authRepository)
- Issue #3 (PlotList コンポーネント)

---

#### Issue #10

**タイトル:** [UI] 履歴一覧 + 差分表示 + ロールバック

**担当:** Dev B

**内容:**

##### 実装するファイル
- `src/app/plots/[id]/history/page.tsx` — 履歴ページ
- `src/components/history/HistoryList/HistoryList.tsx` — バージョン履歴一覧
- `src/components/history/HistoryList/HistoryList.module.scss`
- `src/components/history/DiffViewer/DiffViewer.tsx` — 差分表示
- `src/components/history/DiffViewer/DiffViewer.module.scss`
- `src/hooks/useHistory.ts` — useHistory, useRollback, useDiff

##### 満たすべき要件
- **履歴ページ (`/plots/[id]/history`):**
  - セクション選択ドロップダウン（Plot の全セクション一覧）
  - 選択したセクションの履歴一覧を表示
  - 2 つのバージョンを選択して差分を表示
  - 「このバージョンに戻す」ボタン（確認ダイアログ付き）
- **HistoryList:**
  - Props: `sectionId: string`
  - `useHistory(sectionId)` でデータ取得
  - 各項目: バージョン番号、操作種別 (insert/delete/update)、ユーザー、日時
  - タイムライン風の表示 (SCSS Module で縦線 + ドット装飾)
  - 72 時間以上前のバージョンには「復元不可」バッジ
- **DiffViewer:**
  - Props: `diff: DiffResponse`
  - additions を緑背景、deletions を赤背景で表示
  - GitHub 風の diff 表示スタイル
- **ロールバック:**
  - `useRollback(sectionId, version)` ミューテーション
  - 成功 → `toast.success("バージョンを復元しました")` + Plot 詳細を invalidate
  - 72 時間超のバージョン → `toast.error("72時間以内のバージョンのみ復元可能です")`

##### テスト観点
- `HistoryList`: 履歴項目がバージョン降順で表示される
- `DiffViewer`: additions が緑、deletions が赤で表示される
- ロールバックの確認ダイアログが表示される

##### 使用する API（仮）
- `GET /sections/{sectionId}/history?limit=50`
- `GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}`
- `POST /sections/{sectionId}/rollback/{version}`

##### 依存関係
- Issue #1B (historyRepository)
- Issue #4 (Plot 詳細ページから「履歴」リンク)

---

### Step 6: 画像対応・モバイル仕上げ / エラー・ローディング改善（Day 6）

---

#### Issue #11

**タイトル:** [UI] 画像アップロード + モバイル対応仕上げ

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/hooks/useImageUpload.ts` — 画像アップロード hook
- EditorToolbar の画像ボタンに実装を追加（Issue #6 で作成済みの Dialog を完成させる）
- 各ページのモバイル対応 SCSS 調整:
  - `src/app/page.module.scss` — トップページモバイル最適化
  - `src/app/plots/[id]/page.module.scss` — 詳細ページ 1 カラム化
  - `src/components/layout/Header/Header.module.scss` — ヘッダーレスポンシブ改善
- モバイルでは編集ボタンを非表示にする（閲覧モードのみ）

##### 満たすべき要件
- **画像アップロード:**
  - エディタの画像ボタンクリック → `<Dialog>` が開く
  - 「ファイルを選択」ボタン + ドラッグ & ドロップエリア
  - ファイル制限: 5MB 以下、.jpg / .png / .gif / .webp のみ
  - クライアント側バリデーション: ファイルサイズ・形式チェック
  - アップロード中はプログレス表示（ボタン disabled + Spinner）
  - 成功後、エディタに `<img src="{url}">` を挿入 (`editor.chain().setImage({ src })`)
  - `toast.success("画像をアップロードしました")`
  - エラー時: `toast.error("アップロードに失敗しました")`
- **モバイル対応:**
  - ブレイクポイント: sm (640px), md (768px), lg (1024px)
  - トップページ: 1 列表示
  - 詳細ページ: 目次を非表示 (or アコーディオン)、セクション 1 カラム
  - 編集ボタン: `md` 未満では非表示 (`hidden md:block` or SCSS mixin)
  - ヘッダー: md 未満で検索バー非表示 → ハンバーガーメニュー内に移動

##### テスト観点
- 5MB 超のファイルでバリデーションエラー
- 非対応形式 (.pdf 等) でバリデーションエラー
- レスポンシブ表示テスト (E2E で viewport 切り替え)

##### 使用する API（仮）
- `POST /images` (multipart/form-data)

##### 依存関係
- Issue #6 (EditorToolbar の画像ダイアログ)
- Issue #1B (imageRepository)

---

#### Issue #12

**タイトル:** [UI] エラーハンドリング強化・ローディング状態・トースト通知統合

**担当:** Dev B

**内容:**

##### 実装するファイル
- `src/app/error.tsx` — グローバルエラーバウンダリの仕上げ
- `src/app/not-found.tsx` — 404 ページの仕上げ（イラスト or アイコン）
- `src/app/loading.tsx` — グローバルローディングの仕上げ
- 全ページの Skeleton ローディング見直し・統一
- `src/app/layout.tsx` に `<Toaster />` (sonner) を追加
- 各ミューテーション hook に `onError` でトースト通知を追加
- API エラー時のユーザー向けメッセージマッピング:
  - 401 → 「ログインが必要です」
  - 403 → 「権限がありません」/「編集が一時停止中です」
  - 404 → 「見つかりませんでした」
  - 409 → 「既にスター済みです」等

##### 満たすべき要件
- **エラーバウンダリ (`error.tsx`):**
  - 「エラーが発生しました」メッセージ + 「再試行」ボタン
  - コンソールにエラー詳細をログ
- **404 ページ:**
  - 「ページが見つかりません」+ ホームへ戻るボタン
  - 簡単なイラスト or Lucide アイコン
- **トースト通知統合:**
  - 全ミューテーション系 hook (`useCreatePlot`, `useUpdateSection`, `useToggleStar`, etc.) に成功/失敗トーストを追加
  - `onError: (error) => toast.error(getErrorMessage(error))`
- **Skeleton 統一:**
  - 各リストページで統一されたスケルトン表示
  - PlotCard 用 Skeleton、SectionViewer 用 Skeleton 等

##### テスト観点
- `error.tsx`: 「再試行」ボタンで `reset()` が呼ばれる
- エラーメッセージマッピングが正しい (401 → "ログインが必要です")

##### 依存関係
- Issue #1A 〜 #10 の全コンポーネントが対象
- sonner の `<Toaster />` が layout.tsx に配置済みであること

---

### Step 7: API 繋ぎ込み・バグ修正・最終調整（Day 7）

---

#### Issue #13

**タイトル:** [Infra] Mock → 実 API 繋ぎ込み + バグ修正 + 最終調整

**担当:** Dev A & Dev B（共同作業）

**内容:**

> **⚠️ このIssueが最重要。** Day 1〜6 はモックで動くUIを完成させる。Day 7 で実 API に切り替えて動作確認し、バグを潰す。

##### やること（優先順位順）

**1. API 繋ぎ込み（最優先・午前中に完了）:**
- `.env.local` の `NEXT_PUBLIC_USE_MOCK=true` → `false` に変更 (Dev A)
- 各リポジトリ関数が実 API と通信できることを確認 (Dev A & Dev B で分担)
- レスポンスのフィールド名差異（camelCase / snake_case）を修正 (Dev A)
- 認証トークンが API に正しく渡されることを確認 (Dev A)

**2. バグ修正（午前〜午後）:**
- 実 API 接続で発生するエラーの修正 (Dev A & Dev B)
- ページ遷移・ローディング・エラー表示の動作確認 (Dev B)
- モバイル表示の最終確認 (Dev B)

**3. 最終調整（午後）:**
- `pnpm build` がエラーなく完了することを確認
- Biome lint / format にエラーがないことを確認
- デモシナリオの通し確認: トップ → Plot 詳細 → 編集 → 保存 → スター

**4. 余裕があれば — E2E テスト:**
- `e2e/top-page.spec.ts` — トップページ表示テスト
- `e2e/full-journey.spec.ts` — Plot 作成 → 編集 → スター → コメント

##### 最終チェックリスト
- [ ] 全ページが実 API で動作する（モックなし）
- [ ] `pnpm build` がエラーなく完了する
- [ ] Biome lint / format にエラーがない
- [ ] デモシナリオが通る
- [ ] 全ページのレスポンシブ確認 (Desktop / Mobile)
- [ ] トースト通知が成功/失敗時に表示される

##### 依存関係
- 全 Issue (#1 〜 #12)

---

## 付録

### A. コミットメッセージ規約

```
<type>(<scope>): <summary>

type: feat | fix | chore | refactor | test | docs | style
scope: api | auth | plot | section | editor | sns | search | history | user | layout | infra
```

例:
- `feat(api): add API client layer and repository pattern`
- `feat(plot): add PlotCard component with hover animation`
- `feat(auth): implement OAuth login flow`
- `test(e2e): add top page and auth flow tests`
- `chore(infra): configure TanStack Query provider`

### B. 環境変数

```env
# .env.local
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_USE_MOCK=true  # Day 1〜6: true / Day 7（API繋ぎ込み）: false
```

### C. Issue 依存関係図

```
Issue #1A (HTTP Client/型) ──▶ Issue #1B (リポジトリ/Mock) ──┬──▶ Issue #3 (トップページ) ──▶ Issue #7 (検索・作成)
         │                                                    │                                      │
         └──▶ Issue #1C (Auth/Supabase) ─────────────────┐    │
                                                          │    │
Issue #2 (デザイン基盤) ──────────────────────────────────┼────┼──▶ Issue #4 (Plot詳細) ──────▶ Issue #10 (履歴)
                                                          │    │                                      │
                                                          └────┼──▶ Issue #5 (認証) ──────────▶ Issue #9 (プロフィール)
                                                               │                                      │
                                                               └──▶ Issue #6 (エディタ) ──────▶ Issue #8 (SNS)
                                                                           │
                                                                           └──────────────────▶ Issue #11 (画像・モバイル)

Issue #12 (エラー/ローディング) は全 Issue の改善として並行可能
Issue #13 (API繋ぎ込み) は全 Issue 完了後の Day 7

Day 1 の並行作業:
  Dev A: #1A(午前) → #1B(午後)
  Dev B: #2 + #1C(#1A merge 後に着手)
```

### D. shadcn/ui で最初にインストールすべきコンポーネント一覧

```bash
pnpm dlx shadcn@latest add \
  button card input textarea label \
  badge avatar skeleton separator \
  dropdown-menu dialog sheet \
  tabs tooltip form sonner \
  scroll-area select
```

### E. API が未完成の場合の暫定対応（Mock ファースト開発）

> **🔴 最重要セクション:** Day 1 の初手で Mock を仕込み、Day 1〜6 は Mock で UI を完成させる。Day 7 で実 API に切り替える。バックエンド API を「待つ」時間は 0 にする。

バックエンド API がまだ動いていない段階でフロントエンド開発を進めるために、リポジトリ関数内で **モックデータを直接返す** 方式を採用する。

> **🟢 例外: `authRepository` は Mock しない。** 認証フロー（ログイン→リダイレクト→セッション保持）を Mock で再現するのは困難でバグの温床になるため、**Supabase Auth だけは最初から実物を使う**。こうすると「本物のログイン状態で、モックデータを表示する」開発ができ、本番結合時のトラブルが激減する。

| リポジトリ | Mock 対象？ | 理由 |
|-----------|:-----------:|------|
| `plotRepository` | ✅ Mock | データ系。バックエンド API を待たない |
| `sectionRepository` | ✅ Mock | 同上 |
| `searchRepository` | ✅ Mock | 同上 |
| `snsRepository` | ✅ Mock | 同上 |
| `imageRepository` | ✅ Mock | 同上 |
| `historyRepository` | ✅ Mock | 同上 |
| **`authRepository`** | **❌ 実物** | **認証フローの Mock は危険。Supabase SDK を直接呼ぶ** |

```typescript
// lib/api/plots.ts — API 未完成時の暫定実装例

import { apiClient } from "./client";
import type { PlotListResponse } from "./types";

// モックデータ
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
    // ... 追加のモックデータ
  ],
  total: 1,
  limit: 20,
  offset: 0,
};

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const plotRepository = {
  trending(limit = 5) {
    if (USE_MOCK) return Promise.resolve(MOCK_PLOTS);
    return apiClient<PlotListResponse>(`/plots/trending?limit=${limit}`);
  },
  // ...
};
```

`.env.local` に `NEXT_PUBLIC_USE_MOCK=true` を設定すれば、API なしで開発可能。API が完成したら `false` に切り替える。

---

*最終更新: 2026-02-16*
