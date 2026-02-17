# Step 1: プロジェクト基盤構築（Day 1）

> [← 開発タイムライン](../07-development-timeline.md) | [Step 2 →](./step2-day2.md)

> **Day 1 の負荷分散:** プロジェクト基盤は 4 つの Issue に分割する。Issue #1（環境構築）→ Issue #2（API基盤）→ Issue #3（リポジトリ）は直列、Issue #4（Auth）は Dev B が Issue #5（デザイン基盤）と並行して着手する。

---

#### Issue #1

**タイトル:** [Infra] 環境構築・プロジェクト設定

**担当:** Dev A

**内容:**

> **⚠️ 重要:** このIssueは「既にファイルが完璧に実装されている場合はスキップ可能」です。不足しているファイルや、このドキュメントの記載と差異がある場合のみ実装してください。

##### 実装するファイル

**🔴 プロジェクト設定ファイル**
- `package.json` — 依存関係定義 (Next.js, React, TanStack Query, shadcn/ui用, Biome 等)
- `next.config.ts` — Next.js設定 (SCSS パス解決、standalone出力等)
- `tsconfig.json` — TypeScript設定 (paths alias `@/*` 設定)
- `components.json` — shadcn/ui設定 (New York style, TypeScript, Tailwind CSS)
- `biome.json` — Biome設定 (ESLint + Prettier代替)
- `vitest.config.ts` — Vitest設定 (単体テスト用)
- `playwright.config.ts` — Playwright設定 (E2E テスト用)
- `.gitignore` — Git除外設定

**🟡 任意：静的ファイル**
- `public/favicon.ico` — ファビコン（なくてもプロジェクトは動作するが、ブラウザ警告が出る）

##### 満たすべき要件

**プロジェクト設定:**
- `package.json`:
  - 必要なライブラリをすべて含む: 
    - **Core:** `next@16.x`, `react@19.x`, `react-dom@19.x`, `typescript@5.x`
    - **State Management:** `@tanstack/react-query@5.x`, `@tanstack/react-query-devtools@5.x`
    - **Form & Validation:** `react-hook-form`, `@hookform/resolvers`, `zod`
    - **UI & Style:** `clsx`, `tailwind-merge`, `tailwindcss@4.x`, `sass@1.x`, `lucide-react`, `sonner`, `date-fns`
    - **Auth:** `@supabase/ssr`, `@supabase/supabase-js`
    - **Editor:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`
    - **Linter & Test:** `@biomejs/biome@2.x`, `vitest`, `@testing-library/react`, `@vitejs/plugin-react`, `@playwright/test`
  - scripts: `"dev"`, `"build"`, `"start"`, `"lint"`, `"test"`, `"test:e2e"`
- `next.config.ts`:
  - `output: "standalone"` 設定
  - SCSS パス解決: `sassOptions.loadPaths: [path.join(process.cwd(), "src/styles")]`
- `tsconfig.json`:
  - `paths` で `@/*` を `./src/*` にマッピング
  - `strict: true`, `esModuleInterop: true`
- `components.json`:
  - shadcn/ui 設定: `style: "new-york"`, `tailwind.css`, `typescript: true`
- `biome.json`:
  - linter, formatter 有効化、React ルール設定
- `vitest.config.ts`:
  - `@testing-library/react` との統合設定
- `playwright.config.ts`:
  - ブラウザ設定 (chromium, firefox, webkit)
  - baseURL 設定
  - スクリーンショット・動画記録設定

**ライブラリインストール:**
```bash
# プロジェクトルートで実行（frontendディレクトリ内で）
cd frontend
pnpm install  # package.json の依存関係をインストール
```

##### テスト観点
- `package.json` の依存関係が全て正しくインストールされる
- `task frontend:dev` でエラーが出ない（ただしページはまだ表示されない）
- 設定ファイルに構文エラーがない

##### 依存関係
- なし（最初のタスク）
- **ブロック:** Issue #2（この Issue が完了しないと次に進めない）

##### 備考
- このIssueは「環境準備」のみ。実際にブラウザでページが表示されるのは Issue #2 完了後
- 既に完璧に実装されている場合は、このIssueをスキップして Issue #2 から着手してOK

---

#### Issue #2

**タイトル:** [Infra] HTTP クライアント・型定義基盤・最低限のページ・Provider

**担当:** Dev A

**内容:**

##### 実装するファイル

**🔴 必須：最低限のページ（これがないとWebページが表示されない）**
- `src/app/page.tsx` — **仮トップページ**（"Plot Platform - Coming Soon"的なシンプルなページ。Issue #6で本実装）
- `src/app/layout.tsx` — ルートレイアウト (Providers 適用, metadata 設定)
- `src/app/globals.css` — Tailwind v4 ディレクティブ + shadcn CSS 変数
- `src/app/loading.tsx` — グローバルローディング UI
- `src/app/not-found.tsx` — 404 ページ
- `src/app/error.tsx` — グローバルエラーバウンダリ

**🟢 ライブラリ基盤**
- `src/lib/utils.ts` — **shadcn/ui の `cn()` ユーティリティ（必須）**
- `src/lib/api/client.ts` — HTTP クライアント (fetch ラッパー, ApiError, apiClient, apiUpload)
- `src/lib/api/types.ts` — 全API型定義（初期版。各 Step で担当者が型を追加）
- `src/lib/api/index.ts` — 全リポジトリの re-export（雛形。Issue #3 で各リポジトリを追加）
- `src/lib/query-keys.ts` — TanStack Query キー定義
- `src/lib/constants.ts` — 定数定義 (PAGE_SIZE, MAX_TITLE_LENGTH, etc.)

**🟢 Providers**
- `src/providers/QueryProvider.tsx` — TanStack Query Provider
- `src/providers/Providers.tsx` — 全 Provider を統合するラッパー（AuthProvider のスロットは Issue #4 で注入）

**🟢 共通型**
- `src/types/index.ts` — 共通型 (存在すれば)

**🟡 任意：静的ファイル（あると警告が消える）**
- `public/favicon.ico` — ファビコン（なくてもプロジェクトは動作するが、ブラウザ警告が出る）

##### 満たすべき要件

**プロジェクト設定:**
- `package.json`:
  - 必要なライブラリをすべて含む: 
    - **Core:** `next@16.x`, `react@19.x`, `react-dom@19.x`, `typescript@5.x`
    - **State Management:** `@tanstack/react-query@5.x`, `@tanstack/react-query-devtools@5.x`
    - **Form & Validation:** `react-hook-form`, `@hookform/resolvers`, `zod`
    - **UI & Style:** `clsx`, `tailwind-merge`, `tailwindcss@4.x`, `sass@1.x`, `lucide-react`, `sonner`, `date-fns`
    - **Auth:** `@supabase/ssr`, `@supabase/supabase-js`
    - **Linter & Test:** `@biomejs/biome@2.x`, `vitest`, `@testing-library/react`, `@vitejs/plugin-react`
  - scripts: `"dev"`, `"build"`, `"start"`, `"lint"`, `"test"`
- `next.config.ts`:
  - `output: "standalone"` 設定
  - SCSS パス解決: `sassOptions.loadPaths: [path.join(process.cwd(), "src/styles")]`
- `tsconfig.json`:
  - `paths` で `@/*` を `./src/*` にマッピング
  - `strict: true`, `esModuleInterop: true`
- `components.json`:
  - shadcn/ui 設定: `style: "new-york"`, `tailwind.css`, `typescript: true`
- `biome.json`:
  - linter, formatter 有効化、React ルール設定
- `vitest.config.ts`:
  - `@testing-library/react` との統合設定

**必須ページ:**
- `src/app/page.tsx`:
  - **シンプルな仮トップページ** を実装（本実装は Issue #6）
  - 最低限の内容: タイトル「Plot Platform」、サブタイトル「プロジェクト基盤構築中...」、shadcn/ui の `<Card>` と `<Button>` を使って動作確認
  - `"use client"` は不要（Server Component でOK）
  - 目的: `task frontend:dev` で開発サーバーが起動し、ブラウザで表示確認できること
- `src/app/layout.tsx`:
  - `<html lang="ja">` 設定
  - `<Providers>` でラップ
  - `metadata` でタイトル・description 設定

**API 基盤:**
- `src/lib/utils.ts`:
  - shadcn/ui の `cn()` 関数を実装（`clsx` + `tailwind-merge`）
  - これがないと shadcn/ui コンポーネントが動作しない
- `apiClient<T>()` は以下を満たす:
  - `process.env.NEXT_PUBLIC_API_URL` から Base URL を読み取る (デフォルト: `/api/v1`)
  - 401 / 403 / 404 / 409 等のステータスを `ApiError` に変換
  - `Authorization: Bearer <token>` ヘッダーを任意で付与
  - 204 レスポンスを正しくハンドリング
- `types.ts` は Section C.1 に記載の全型を定義
- `query-keys.ts` は Section C.1 に記載の構造
- `Providers.tsx` は `QueryProvider` をラップ（AuthProvider は Issue #4 完了後に追加）

**環境変数:**
- `infisical`:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
  NEXT_PUBLIC_USE_MOCK=true
  NEXT_PUBLIC_SUPABASE_URL=（Issue #4 で追加）
  NEXT_PUBLIC_SUPABASE_ANON_KEY=（Issue #4 で追加）
  ```

**ライブラリインストール:**
```bash
# プロジェクトルートで実行（frontendディレクトリ内で）
cd frontend
pnpm install  # package.json の依存関係をインストール

# shadcn/ui の初期セットアップ
pnpm dlx shadcn@latest init  # components.json があれば自動設定

# 最低限必要な shadcn/ui コンポーネントを追加（動作確認用）
pnpm dlx shadcn@latest add button card
```

##### テスト観点
- **プロジェクト起動確認:**
  - `task frontend:dev` で開発サーバーが起動すること
  - `http://localhost:3000` にアクセスして仮トップページが表示されること
  - コンソールにエラーが出ないこと
- **shadcn/ui 動作確認:**
  - 仮トップページで `<Button>` と `<Card>` が正しく表示されること
  - Tailwind の className が適用されていること
- **API クライアント テスト:**
  - `apiClient` の正常系/異常系テスト (`lib/api/client.test.ts`)
    - 200 → JSON パース
    - 204 → undefined 返却
    - 4xx → ApiError throw
  - `task frontend:test` でテストが通ること

##### 依存関係
- なし（最初のタスク）
- **ブロック:** Issue #3, Issue #4

##### コード例

**仮トップページ — `src/app/page.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-4xl">Plot Platform</CardTitle>
          <CardDescription className="text-xl">
            「架空の欲しいもの」をみんなで作り上げる Wiki 共同編集プラットフォーム
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            🚧 プロジェクト基盤構築中...
          </p>
          <div className="flex gap-2">
            <Button variant="default">開発サーバー起動確認 OK ✓</Button>
            <Button variant="outline">shadcn/ui 動作確認 OK ✓</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Issue #6 でランキング表示等の本実装を行います。
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

**`cn()` ユーティリティ — `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**環境変数（Infisical で設定）**

```bash
# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Mock モード（バックエンド未完成時は true）
NEXT_PUBLIC_USE_MOCK=true

# Supabase（Issue #4 で追加）
# NEXT_PUBLIC_SUPABASE_URL=（Infisical で設定）
# NEXT_PUBLIC_SUPABASE_ANON_KEY=（Infisical で設定）
```

---

#### Issue #3

**タイトル:** [Infra] リポジトリ実装 + Mock データ

**担当:** Dev A（Issue #2 完了後に着手）

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
- **🔴 Mock 設定（必須）:** `authRepository` **以外の**各リポジトリに `NEXT_PUBLIC_USE_MOCK=true` 時にモックデータを返す分岐を実装する（[付録E](../09-mock-development.md) 参照）
- **🟢 認証は Mock しない:** `authRepository` は最初から Supabase SDK（`@supabase/ssr`）の実 API を呼ぶ。認証フロー（ログイン→リダイレクト→セッション保持）を Mock で再現するのは困難でバグの温床になるため。「本物のログイン状態で、モックデータを表示する」開発スタイルにする
- Infisical で `NEXT_PUBLIC_USE_MOCK=true` を設定（Day 1〜6 の開発期間中）
- `plotRepository.list` のクエリパラメータ生成テスト

##### テスト観点
- `plotRepository.list` のクエリパラメータ生成テスト
- Mock モードで各リポジトリが正しくモックデータを返すこと

##### 依存関係
- Issue #2 (HTTP クライアント, 型定義)
- **ブロック:** Issue #6, #10, #11, #12, #13, #14

---

#### Issue #4

**タイトル:** [Infra] Auth Provider・Supabase クライアント・Middleware

**担当:** Dev B（Issue #5 と並行して着手。Issue #2 の `types.ts` / `client.ts` が merge されたら開始）

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
- Issue #2 (Providers.tsx の雛形)
- **ブロック:** Issue #8 (認証フロー UI)

---

#### Issue #5

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
- **ブロック:** Issue #6, #7, #11, #13
