# フロントエンド開発計画書

> **プロダクト:** Plot Platform — 「架空の欲しいもの」をみんなで作り上げる Wiki 共同編集プラットフォーム
> **期間:** 1 週間（7 日間）
> **フロントエンド開発者:** 2 名（Dev A / Dev B）
> **フレームワーク:** Next.js (App Router) + TypeScript

---

## ⚠️ ハッカソン鉄則（全員必読）

> **この計画書は「理想の完成形」です。ハッカソンでは時間が命。以下のルールを常に意識してください。**

| # | ルール | 具体的な行動 |
|---|-------|-------------|
| 1 | **テストは Unit のみ。E2E は後回し** | E2E (Playwright) は時間が溶ける。**機能実装を最優先**し、テストは `lib/api/client.test.ts` 等のロジック Unit Test だけ書く。E2E は全機能完成後に余裕があれば。 |
| 2 | **Tiptap エディタは MVP で止める** | 最初は `StarterKit` だけで「文字が打てて保存できる」を実現する。ツールバー装飾・色パレット・画像挿入は **後まわし**。沼にハマると 1 日消える。 |
| 3 | **Mock ファーストで開発する** | バックエンド API を待たない。`NEXT_PUBLIC_USE_MOCK=true` でモックデータを返し、UIを先に完成させる。最後に API を繋ぎ込む。**ただし認証（Supabase Auth）だけは最初から実物を使う**（→ [付録E](#e-api-が未完成の場合の暫定対応mock-ファースト開発) 参照） |
| 4 | **shadcn/ui を最優先で使う** | UI コンポーネントは **まず shadcn/ui のカタログを確認**。Button, Card, Input, Dialog, Sheet, Tabs 等、95% のケースは shadcn/ui で解決できる。ゼロから実装するのは時間の無駄。`pnpm dlx shadcn@latest add <component>` で即座に追加。カスタマイズは `className` での Tailwind 追加のみ（内部を直接編集しない）。 |
| 5 | **ロジックは TDD、UI はプレビュー駆動** | **複雑な計算・通信（API client, Repository, Hook）はテストを先に書いてから実装**（TDD）。バグを防ぎ、リファクタリングしやすい。**見た目（コンポーネント、スタイル）はブラウザで確認しながら臨機応変に実装**。デザイン調整は目で見て判断する方が速い。UI テストは後回し。 |
| 6 | **Taskfile でコマンド実行を統一** | 開発サーバー起動、ビルド、テスト実行は必ず `task` コマンドを使う（例: `task frontend:dev`, `task frontend:build`）。直接 `pnpm` や `npm` を叩かない。環境差異を防ぎ、チーム全体で同じ手順を共有する。 |
| 7 | **コミットは細かく、こまめに行う** | 1 機能実装 = 1 コミット以上。ファイル追加、機能実装、テスト追加を分けてコミット。コミットメッセージは具体的に（例: `feat: PlotCard コンポーネント実装`, `test: PlotCard の表示テスト追加`）。大きな変更を一度にコミットしない。 |
| 8 | **レスポンシブデザインを考慮** | すべてのコンポーネントは **レスポンシブデザイン** に対応する。スマートフォン（320px〜）、タブレット（768px〜）、デスクトップ（1024px〜）の各画面サイズで動作確認。SCSS Mixin (`@include respond-to(md)`) を活用し、ブレイクポイントを統一する。 |

---

## 目次

1. [A. 推奨技術スタック最終決定リスト](#a-推奨技術スタック最終決定リスト)
2. [B. 詳細ディレクトリ構造](#b-詳細ディレクトリ構造)
3. [C. 共通設計方針](#c-共通設計方針)
   - [C.1 API 抽象化戦略](#c1-api-抽象化戦略)
   - [C.2 スタイリング戦略](#c2-スタイリング戦略)
   - [C.3 テスト戦略](#c3-テスト戦略)
4. [D. 開発ステップとタスク割り当て](#d-開発ステップとタスク割り当て)
5. [E. API が未完成の場合の暫定対応（Mock ファースト開発）](#e-api-が未完成の場合の暫定対応mock-ファースト開発)
   - [E.1 環境変数設定](#e1-環境変数設定)
   - [E.2 Mock データ実装パターン](#e2-mock-データ実装パターン)
   - [E.3 認証フロー実装パターン（Supabase Auth）](#e3-認証フロー実装パターンsupabase-auth)
   - [E.4 Mock ⇄ 実API 切り替えフロー](#e4-mock--実api-切り替えフロー)
   - [E.5 Mock データの追加ルール](#e5-mock-データの追加ルール)

---

## A. 推奨技術スタック最終決定リスト

### コアフレームワーク（確定済み）

| カテゴリ | ライブラリ | バージョン | 用途 |
|---------|-----------|-----------|------|
| Framework | Next.js (App Router) | 16.x | SSR/RSC/ルーティング |
| Language | TypeScript | 5.x | 型安全 |
| UI Library | shadcn/ui (New York) | latest | 基盤 UI コンポーネント |
| Styling (primary) | SCSS Modules | sass 1.x | **自前スタイルのメイン実装** |
| Styling (secondary) | Tailwind CSS | 4.x | **shadcn/ui のため & 簡単なユーティリティ** |
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
│   │   │   ├── client.test.ts          #     HTTP クライアントのテスト
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
│   │   ├── mock/                        #   --- Mock データ (開発初期用) ---
│   │   │   ├── data.ts                 #     Mock データ定義 (plots, users, sections 等)
│   │   │   ├── storage.ts              #     ブラウザストレージ Mock (localStorage 使用)
│   │   │   ├── storage.test.ts         #     ストレージ Mock テスト
│   │   │   └── migration.ts            #     Mock データバージョン管理・マイグレーション
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
│   │   └── index.ts                     #   ドメイン横断の共通型 (ユーティリティ型、定数型等)
│   │
│   ├── test/                            # ===== テストユーティリティ =====
│   │   ├── setup.ts                     #   Vitest グローバルセットアップ (Testing Library 設定)
│   │   └── smoke.test.ts                #   スモークテスト (環境正常性確認)
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
| `components/ui/` | **shadcn/ui が自動生成するファイル。絶対に手動で編集しない。** カスタマイズは呼び出し側で `className` prop を使って Tailwind クラスを追加する。新しいコンポーネントが必要になったら、まず [shadcn/ui のドキュメント](https://ui.shadcn.com/) で該当コンポーネントがあるか確認する。 |
| `components/{feature}/` | 機能ドメインごとにグルーピング。1 コンポーネント = 1 フォルダ（`.tsx` + `.module.scss` + `.test.tsx`）。**内部では shadcn/ui コンポーネントを組み合わせて実装する。** |
| `components/shared/` | 2 つ以上の機能ドメインで使われる汎用コンポーネント。shadcn/ui の薄いラッパーとして実装することが多い（例: `TagBadge` は内部で `<Badge>` を使う）。 |
| `hooks/` | TanStack Query ベースのカスタム Hook。ページコンポーネントから API を直接呼ばない。 |
| `lib/api/` | **API 変更の影響を吸収する唯一のレイヤー**。Repository パターンでリクエスト関数を分離。`client.ts` は必ずテスト（`client.test.ts`）を書く。 |
| `lib/supabase/` | Supabase クライアント生成関数。ブラウザ用・サーバー用・Middleware 用の 3 種類を用意。 |
| `lib/mock/` | **Mock ファースト開発用**。`data.ts` で偽データ定義、`storage.ts` で永続化、`migration.ts` でバージョン管理。`NEXT_PUBLIC_USE_MOCK=true` 時に使用。付録E参照。 |
| `providers/` | Client Component 限定の Context Provider。`"use client"` 境界をここに集約。 |
| `styles/` | SCSS パーシャル。`@use` で各 `.module.scss` から参照。 |
| `types/` | **ドメイン横断の共通型定義**。API 型（`lib/api/types.ts`）とは別に、ユーティリティ型や定数型をここに配置。 |
| `test/` | Vitest セットアップファイル。`setup.ts` で Testing Library のグローバル設定、`smoke.test.ts` で基本動作確認。 |

---

### 型定義ファイルの使い分け

プロジェクト内で型定義を管理するファイルは以下の 2 つがあり、**明確に責務を分けて使用する**：

| ファイル | 用途 | 具体例 |
|---------|------|--------|
| **`lib/api/types.ts`** | **API リクエスト/レスポンスの型定義** | `PlotItem`, `UserBrief`, `PlotListResponse`, `CreatePlotRequest` 等。バックエンド API とやり取りする際の型をすべてここに集約。 |
| **`types/index.ts`** | **ドメイン横断の共通型・ユーティリティ型** | `Nullable<T>`, `DeepPartial<T>`, アプリ固有の定数型、列挙型など。複数のドメインで使われる汎用的な型。 |

**使い分けの判断基準：**

```typescript
// ✅ lib/api/types.ts に配置すべき型
export interface PlotItem { /* API レスポンス */ }
export interface CreatePlotRequest { /* API リクエスト */ }

// ✅ types/index.ts に配置すべき型
export type Nullable<T> = T | null;
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
export type SortOrder = "asc" | "desc";
export type Theme = "light" | "dark" | "system";
```

**原則:** API と直接関係する型は `lib/api/types.ts`、それ以外の汎用型は `types/index.ts`。

---

## C. 共通設計方針

### C.0 コンポーネント設計戦略

#### shadcn/ui ファーストの原則

**🎯 ゼロからコンポーネントを作らない。99% は shadcn/ui で解決できる。**

コンポーネント実装が必要になったら、以下の順序で検討する：

```
1. shadcn/ui にそのままのコンポーネントがある？
   ├─ YES → `pnpm dlx shadcn@latest add <component>` して使う
   └─ NO → 2 へ

2. shadcn/ui の複数コンポーネントを組み合わせれば実現できる？
   ├─ YES → 組み合わせて使う（例: Card + Badge + Button で PlotCard を作る）
   └─ NO → 3 へ

3. 既存の shadcn/ui コンポーネントをラップしてカスタマイズすれば実現できる？
   ├─ YES → ラッパーコンポーネントを作る（components/{feature}/ に配置）
   └─ NO → 本当に shadcn/ui にない？もう一度探す。それでもなければゼロから実装。
```

#### shadcn/ui コンポーネント一覧（優先使用）

本プロジェクトで使用する shadcn/ui コンポーネント：

| カテゴリ | コンポーネント | 用途 |
|---------|--------------|------|
| **基本** | `Button` | すべてのボタン（ログイン、送信、キャンセル等） |
| | `Input` | テキスト入力（検索バー、フォーム入力） |
| | `Textarea` | 複数行入力（コメント、説明文） |
| | `Badge` | タグ表示、ステータス表示 |
| | `Avatar` | ユーザーアイコン表示 |
| | `Card` | Plot カード、セクションカード等 |
| **ナビゲーション** | `Dropdown Menu` | ユーザーメニュー、アクションメニュー |
| | `Tabs` | セクション切り替え、プロフィールページのタブ |
| | `Sheet` | モバイルナビゲーション |
| **フィードバック** | `Dialog` | 確認ダイアログ（削除確認等） |
| | `Skeleton` | ローディング中のプレースホルダー |
| | `Sonner` | トースト通知（成功/エラーメッセージ） |
| | `Tooltip` | ツールチップ（ボタンの説明等） |
| **フォーム** | `Form` | react-hook-form 統合フォーム |
| **レイアウト** | `Separator` | 区切り線 |

**インストールコマンド（Issue #2 で実行）:**

```bash
pnpm dlx shadcn@latest add button card input textarea badge avatar
pnpm dlx shadcn@latest add dropdown-menu dialog sheet separator skeleton
pnpm dlx shadcn@latest add tabs tooltip form sonner
```

#### カスタマイズ方法

shadcn/ui コンポーネントは `className` prop で Tailwind カスタマイズ、自前スタイルは SCSS Module で書く：

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import styles from "./LoginButton.module.scss";
import { cn } from "@/lib/utils";

// ❌ 悪い例: components/ui/button.tsx を直接編集
// → shadcn/ui のファイルは触らない！

// ✅ 良い例 1: className で Tailwind クラスを追加（shadcn/ui のカスタマイズ）
<Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500">
  ログイン
</Button>

// ✅ 良い例 2: ラッパーコンポーネント + SCSS Module（自前スタイルが必要な場合）
// components/auth/LoginButton/LoginButton.tsx
export function LoginButton({ provider }: { provider: string }) {
  return (
    <Button 
      className={cn("w-full", styles.loginButton)}  // Tailwind + SCSS 併用
      variant="outline"
    >
      <span className={styles.icon}>{/* アイコン */}</span>
      {provider} でログイン
    </Button>
  );
}

// components/auth/LoginButton/LoginButton.module.scss
// 複雑なスタイルは SCSS で書く
.loginButton {
  position: relative;
  
  &:hover .icon {
    animation: bounce 0.5s ease;
  }
}

.icon {
  @include mixins.focus-ring;
  /* Tailwind では書きにくいスタイルを SCSS で */
}
```

**まとめ:**
- **Tailwind の使用場所：** shadcn/ui の `className` prop でのカスタマイズのみ（`w-full`, `bg-primary` 等）
- **SCSS の使用場所：** 自前のコンポーネント固有スタイル、アニメーション、疑似要素、ネストセレクタ
- **併用:** `cn()` ユーティリティで Tailwind と SCSS のクラスを合成可能

---

### C.1 API 抽象化戦略

> **📘 API仕様の詳細:** バックエンドAPIのエンドポイント仕様、リクエスト/レスポンス形式、認証方法等の詳細は [docs/api.md](../api.md) を参照してください。

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

export const plotRepository = {
  list(params) { return apiClient<PlotListResponse>(`/plots?${query}`) },
  get(id) { return apiClient<PlotDetailResponse>(`/plots/${id}`) },
  create(data, token) { return apiClient<PlotItem>("/plots", { method: "POST", body: data, token }) },
  trending(limit = 5) { return apiClient<PlotListResponse>(`/plots/trending?limit=${limit}`) },
  // ... popular, latest など同様
};
```

**4. TanStack Query Hook — `hooks/usePlots.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plotRepository } from "@/lib/api/plots";

// クエリ例
export function usePlotDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.plots.detail(id),
    queryFn: () => plotRepository.get(id),
    enabled: !!id,
  });
}

// ミューテーション例 (楽観的更新 + invalidateQueries)
export function useCreatePlot() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (data) => plotRepository.create(data, session?.access_token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.plots.all }),
  });
}
```

**5. Query Key 定義 — `lib/query-keys.ts`** (階層構造で管理)

```typescript
export const queryKeys = {
  plots: {
    all: ["plots"] as const,
    detail: (id: string) => ["plots", "detail", id] as const,
    // ... trending, list など
  },
  sections: { ... },
  // 他のリソースも同様
} as const;
```

**6. コンポーネントでの使用例** (Client Component で hook 呼び出すだけ)

```tsx
"use client";
function TrendingSection() {
  const { data, isLoading } = useTrendingPlots(5);
  if (isLoading) return <Skeleton />;
  return <PlotList items={data?.items ?? []} />;
}
```

---

### C.2 スタイリング戦略

#### 基本方針：SCSS ファースト、Tailwind は shadcn/ui のため

**🎯 Tailwind CSS は shadcn/ui のために導入しているだけ。自前のスタイルは SCSS Module で書く。**

shadcn/ui は Tailwind CSS に依存しているため、導入は必須だが、以下の方針で使い分ける：

```
┌─────────────────────────────────────────────────────────────┐
│  Tailwind CSS の使用は以下の 2 つに限定する：               │
│                                                               │
│  1. shadcn/ui コンポーネントのカスタマイズ（className prop）│
│  2. 簡単なユーティリティクラス（p-4, flex, gap-2 等）      │
│                                                               │
│  それ以外の自前スタイル実装は SCSS Module を使う。          │
└─────────────────────────────────────────────────────────────┘
```

**理由:**
- Tailwind の長いクラス名の羅列は可読性が低く、メンテナンスしづらい
- 複雑なアニメーション、疑似要素、ネストセレクタは SCSS の方が圧倒的に書きやすい
- チームメンバーが CSS/SCSS に慣れている場合、学習コストが低い
- SCSS 変数・Mixin による再利用性が高い

#### Tailwind と SCSS の使い分けルール

| 用途 | 使用技術 | 例 | 備考 |
|------|---------|-----|------|
| **shadcn/ui コンポーネントのカスタマイズ** | **Tailwind** | `<Button className="w-full">` | **Tailwind の主用途。これがあるから導入している** |
| スペーシング・マージン・パディング | Tailwind | `className="p-4 mt-2 mb-6"` | 簡単なユーティリティのみ。3〜4個以上なら SCSS へ |
| Flexbox / Grid レイアウト（シンプル） | Tailwind | `className="flex items-center gap-3"` | シンプルなものだけ |
| 基本的な色・背景（shadcn 変数） | Tailwind | `className="text-primary bg-muted"` | shadcn のテーマ変数を使う場合のみ |
| シンプルなレスポンシブ切り替え | Tailwind | `className="grid-cols-1 md:grid-cols-2"` | ブレイクポイント 1〜2 個程度 |
| **コンポーネント固有のスタイル** | **SCSS Module** | `.card { ... }` | **自前実装のメインスタイル** |
| **複雑なアニメーション・トランジション** | **SCSS Module** | `@keyframes`, 複数プロパティ transition | Tailwind では表現困難 |
| **疑似要素 (::before, ::after)** | **SCSS Module** | デコレーションライン、バッジ装飾 | Tailwind では書きにくい |
| **ネストされた複雑なセレクタ** | **SCSS Module** | `.card:hover .title { ... }` | 可読性が段違い |
| **Tiptap エディタの内部スタイル** | **SCSS Module** | `.ProseMirror` のスタイルオーバーライド | Editor 固有の複雑なスタイル |
| **複雑なレイアウト** | **SCSS Module** | Tailwind 5 個以上必要な場合 | SCSS で名前をつけて管理 |
| **メディアクエリ + 複雑なロジック** | **SCSS Mixin** | カスタムブレイクポイント、条件分岐 | Mixin で再利用 |

**原則:** Tailwind は「shadcn/ui のカスタマイズ」と「p-4, flex 等の簡単なユーティリティ」だけ。それ以外は SCSS Module。

#### 判断基準フローチャート

```
コンポーネントを実装する必要がある
  ├─ 1. shadcn/ui にそのままのコンポーネントがある？
  │     → YES: そのまま使う（最優先）+ className で Tailwind カスタマイズ
  │     → NO: 2 へ
  │
  ├─ 2. shadcn/ui の複数コンポーネントを組み合わせれば実現できる？
  │     → YES: Button + Card + Badge 等を組み合わせる + className で Tailwind カスタマイズ
  │     → NO: 3 へ（ここから自前実装）
  │
  └─ 3. 自前実装：スタイルはどう書く？
        ├─ 簡単なユーティリティ（p-4, flex 等）だけで済む？ → Tailwind（稀）
        ├─ コンポーネント固有のスタイルが必要？ → SCSS Module（通常はこれ）
        │   - アニメーション、疑似要素、ネストセレクタ → 必ず SCSS
        │   - 複雑なレイアウト（Tailwind 5 個以上） → 必ず SCSS
        │   - 再利用可能なスタイル → 必ず SCSS（変数・Mixin 活用）
        └─ 迷ったら → SCSS Module で書く（Tailwind は後から追加できる）
```

**重要:** 
1. **まず shadcn/ui で解決できないか考える**（ゼロから作るのは最後の手段）
2. **自前実装の場合、基本は SCSS Module**（Tailwind はあくまで補助）
3. **Tailwind は shadcn/ui のカスタマイズと簡単なユーティリティのみ**

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

#### レスポンシブデザイン戦略

##### ブレイクポイント定義

本プロジェクトでは以下の3段階のブレイクポイントを使用する：

| デバイス | ブレイクポイント | 用途 |
|---------|----------------|------|
| **モバイル** | `〜767px` | スマートフォン |
| **タブレット** | `768px〜1023px` | タブレット |
| **デスクトップ** | `1024px〜` | PC・大画面 |

##### レスポンシブ実装パターン

**1. SCSS Mixin を使ったレスポンシブ対応（推奨）**

```scss
// components/plot/PlotCard/PlotCard.module.scss
@use "mixins" as *;

.card {
  padding: 1rem;
  grid-template-columns: 1fr;
  
  @include respond-to(md) {
    padding: 1.5rem;
    grid-template-columns: repeat(2, 1fr);
  }
  
  @include respond-to(lg) {
    padding: 2rem;
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**2. Tailwind でのシンプルなレスポンシブ（shadcn/ui カスタマイズ時）**

```tsx
<Card className="p-4 md:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* ... */}
</Card>
```

##### レスポンシブデザインチェックリスト

各コンポーネント実装時、以下を確認する：

- [ ] **タッチターゲットサイズ:** ボタン・リンクは最小 44×44px
- [ ] **フォントサイズ:** 本文は最小 16px
- [ ] **余白:** 小さい画面では左右に十分な余白を確保
- [ ] **ナビゲーション:** 狭い画面ではハンバーガーメニューに折りたたむ
- [ ] **画像:** `max-width: 100%` で親要素からはみ出さないようにする
- [ ] **テーブル:** 狭い画面では横スクロールまたはカード表示に切り替え
- [ ] **フォーム:** 入力欄は画面幅に応じて適切なサイズに調整

##### 動作確認方法

**開発中の確認:**
```bash
# 開発サーバー起動
task frontend:dev

# ブラウザの DevTools でデバイスエミュレーション
# - iPhone SE (375px)
# - iPad (768px)
# - Desktop (1280px)
```

**実機確認:**
- 実機での動作確認が望ましい場合は、同一ネットワーク内で `http://localhost:3000` にアクセス

##### よくあるレスポンシブ対応パターン

| 要素 | モバイル | タブレット | デスクトップ |
|------|---------|-----------|-------------|
| **ヘッダー** | ロゴ + ハンバーガーメニュー | ロゴ + 横並びメニュー | 同左 + 検索バー拡張 |
| **Plot一覧** | 1カラム | 2カラム | 3カラム |
| **Plot詳細** | 縦積み（メタ情報 → 本文） | 同左 | 横並び（サイドバー + 本文） |
| **エディタ** | 全画面 | 最大幅 800px 中央寄せ | 同左 |
| **フォーム** | 縦積み | 2カラム（ラベル左、入力右） | 同左 |

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

#### 実装順番とテスト戦略

開発時は**機能の性質に応じてアプローチを使い分ける**：

| 機能の性質 | 開発アプローチ | 理由 |
|-----------|--------------|------|
| **ロジック層（複雑な計算・通信）** | **TDD（テスト駆動開発）** | `lib/api/client.ts`, Repository, カスタム Hook 等は**先にテストを書いてから実装**する。ロジックの正確性を保証し、リファクタリングしやすくなる。API 仕様変更時の影響範囲も明確になる。 |
| **UI層（見た目・インタラクション）** | **プレビュー駆動開発** | コンポーネントは**実際にブラウザで表示を確認しながら実装**する。デザイン調整・レスポンシブ対応・アニメーションは目で見て判断する方が速い。テストは後から追加（または省略）。 |

**具体例：**

```
✅ TDD を使う（テスト → 実装）：
  - lib/api/client.ts の apiClient 関数
  - lib/api/plots.ts の plotRepository
  - hooks/usePlots.ts の楽観的更新ロジック
  - lib/utils.ts のヘルパー関数

✅ プレビュー駆動（実装 → プレビュー確認 → 調整）：
  - components/plot/PlotCard/PlotCard.tsx のレイアウト
  - components/layout/Header/Header.tsx のレスポンシブ対応
  - PlotCard.module.scss のホバーアニメーション
  - 色・余白・フォントサイズ等の調整
```

**ワークフロー例（PlotCard 実装の場合）：**

1. **ロジック層を TDD で実装**
   ```bash
   # 1. テストを書く
   touch src/hooks/usePlots.test.ts
   # 2. テストを実行（Red）
   task frontend:test
   # 3. 実装する（Green）
   # 4. リファクタリング
   ```

2. **UI層をプレビュー駆動で実装**
   ```bash
   # 1. コンポーネントを作る
   touch src/components/plot/PlotCard/PlotCard.tsx
   # 2. 開発サーバーで確認しながら実装
   task frontend:dev
   # 3. ブラウザで見た目を確認・調整
   # 4. 動作確認できたらコミット
   ```

**重要:** UI テストは時間がかかるため、ハッカソンでは優先度を下げる。ロジックテストに集中し、UI は目視確認で十分。

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
| **コミット粒度** | **必ず細かく、頻繁にコミットする。** 1 機能 = 1 コミット以上。大きな Issue は機能単位で分割コミット（例: ファイル作成 → ロジック実装 → スタイル追加 → テスト追加で 4 コミット）。動作確認できる単位でコミットし、問題発生時のロールバックを容易にする。 |
| **Taskfile の使用** | 開発サーバー起動・ビルド・テスト等は必ず Taskfile のコマンドを使う（`task frontend:dev`, `task frontend:test` 等）。環境変数や実行オプションが統一され、トラブルシューティングが容易になる。 |

---

### 🔄 開発フローの重要な注意点

**Issue #2 で作る「仮トップページ」について:**

Issue #2 では、プロジェクトが起動することを確認するため、**シンプルな仮トップページ** (`src/app/page.tsx`) を作成します。この時点では以下のみ実装：
- タイトル「Plot Platform」表示
- shadcn/ui の `<Button>` と `<Card>` を使った動作確認用UI
- 「プロジェクト基盤構築中...」というメッセージ

**Issue #6 で本実装に置き換え:**

Day 2 の Issue #6 で、この仮ページを**完全に書き直し**、以下の本実装に置き換えます：
- 「急上昇」「人気」「新着」の3セクション表示
- PlotCard コンポーネントによるランキング表示
- SearchBar の注入

このアプローチにより、Day 1 終了時点で**必ずブラウザで動作確認できる状態**を維持しつつ、段階的に機能を実装できます。

---

### Step 1: プロジェクト基盤構築（Day 1）

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
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=（Issue #4 で追加）
  SUPABASE_SECRET_KEY=（Issue #4 で追加）
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
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=（Infisical で設定）
# SUPABASE_SECRET_KEY=（Infisical で設定）
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
- **🔴 Mock 設定（必須）:** `authRepository` **以外の**各リポジトリに `NEXT_PUBLIC_USE_MOCK=true` 時にモックデータを返す分岐を実装する（付録E 参照）
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

---

### Step 2: トップページ / Plot 詳細ページ（Day 2）

---

#### Issue #6

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
- **`src/app/page.tsx` — トップページ（本実装）** ← Issue #2 で作成した仮ページを置き換える
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
- Issue #2 / #3 (API 基盤, hooks)
- Issue #5 (Header, TagBadge, Skeleton)

---

#### Issue #7

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
- Issue #2 / #3 (API 基盤, hooks)
- Issue #5 (Header/Footer レイアウト, TagBadge, Avatar)

---

### Step 3: 認証フロー / Tiptap エディタ（Day 3）

---

#### Issue #8

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
- Issue #4 (AuthProvider, Supabase クライアント)
- Issue #5 (Header の slot 構造)

---

#### Issue #9

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
- Issue #2 / #3 (API 基盤)
- Issue #5 (_typography.scss)
- Issue #7 (SectionViewer を参考に、editable 版を構築)

---

### Step 4: 検索・Plot 作成 / SNS 機能（Day 4）

---

#### Issue #10

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
- Issue #3 (searchRepository, plotRepository)
- Issue #5 (Pagination, EmptyState)
- Issue #6 (PlotCard, PlotList, SearchBar)

---

#### Issue #11

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
- Issue #3 (snsRepository)
- Issue #7 (PlotDetail に StarButton/ForkButton を配置)
- Issue #8 (useAuth — ログイン状態判定)

---

### Step 5: プロフィール / 履歴・復元（Day 5）

---

#### Issue #12

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
- Issue #3 (authRepository)
- Issue #6 (PlotList コンポーネント)

---

#### Issue #13

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
- Issue #3 (historyRepository)
- Issue #7 (Plot 詳細ページから「履歴」リンク)

---

### Step 6: 画像対応・モバイル仕上げ / エラー・ローディング改善（Day 6）

---

#### Issue #14

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
- Issue #9 (EditorToolbar の画像ダイアログ)
- Issue #3 (imageRepository)

---

#### Issue #15

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
- Issue #2 〜 #14 の全コンポーネントが対象
- sonner の `<Toaster />` が layout.tsx に配置済みであること

---

### Step 7: API 繋ぎ込み・バグ修正・最終調整（Day 7）

---

#### Issue #16

**タイトル:** [Infra] Mock → 実 API 繋ぎ込み + バグ修正 + 最終調整

**担当:** Dev A & Dev B（共同作業）

**内容:**

> **⚠️ このIssueが最重要。** Day 1〜6 はモックで動くUIを完成させる。Day 7 で実 API に切り替えて動作確認し、バグを潰す。

##### やること（優先順位順）

**1. API 繋ぎ込み（最優先・午前中に完了）:**
- Infisical で `NEXT_PUBLIC_USE_MOCK=true` → `false` に変更 (Dev A)
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
- 'playwright.config.ts' - 設定ファイル
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
- 全 Issue (#1 〜 #15)

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

> **環境変数は Infisical で管理します。** 以下は設定すべき変数の一覧です。

```env
# Infisical で設定する環境変数
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ...
NEXT_PUBLIC_USE_MOCK=true  # Day 1〜6: true / Day 7（API繋ぎ込み）: false
```

### C. Issue 依存関係図

```
Issue #1 (環境構築・設定) ──▶ Issue #2 (HTTP Client/型) ──▶ Issue #3 (リポジトリ/Mock) ──┬──▶ Issue #6 (トップページ) ──▶ Issue #10 (検索・作成)
         │                          │                                                        │                                      │
         └──────────────────────────┴──▶ Issue #4 (Auth/Supabase) ─────────────────────┐    │
                                                                                         │    │
Issue #5 (デザイン基盤) ──────────────────────────────────────────────────────────────┼────┼──▶ Issue #7 (Plot詳細) ──────▶ Issue #13 (履歴)
                                                                                         │    │                                      │
                                                                                         └────┼──▶ Issue #8 (認証) ──────────▶ Issue #12 (プロフィール)
                                                                                              │                                      │
                                                                                              └──▶ Issue #9 (エディタ) ──────▶ Issue #11 (SNS)
                                                                                                          │
                                                                                                          └──────────────────▶ Issue #14 (画像・モバイル)

Issue #15 (エラー/ローディング) は全 Issue の改善として並行可能
Issue #16 (API繋ぎ込み) は全 Issue 完了後の Day 7

Day 1 の並行作業:
  Dev A: #1(確認) → #2(午前) → #3(午後)
  Dev B: #5 + #4(#2 merge 後に着手)
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

#### E.1 環境変数設定

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

#### E.2 Mock データ実装パターン

**パターン1: Repository 層で直接分岐（推奨）**

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
      editingUsers: ["user-3"],
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
          username: "taro",
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
    return apiClient<PlotItem>("/plots", { method: "POST", body: data });
  },
};
```

##### パターン2: 共通 Mock データファイル（オプション）

複数のリポジトリで同じデータを使いたい場合、`lib/mock/data.ts` に一元化する。

```typescript
// lib/mock/data.ts
import type { PlotItem, UserBrief } from "@/lib/api/types";

export const mockUsers: Record<string, UserBrief> = {
  "user-1": {
    id: "user-1",
    username: "taro",
    displayName: "太郎",
    avatarUrl: null,
  },
  "user-2": {
    id: "user-2",
    username: "hanako",
    displayName: "花子",
    avatarUrl: "https://i.pravatar.cc/150?u=hanako",
  },
};

export const mockPlots: PlotItem[] = [
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

#### E.3 認証フロー実装パターン（Supabase Auth）

認証は **Mock を使わず、最初から実物の Supabase Auth を使う**。

**必要なファイル:**
- `lib/supabase/client.ts` — `createBrowserClient` でブラウザ用クライアント作成
- `app/auth/callback/route.ts` — OAuth コールバック処理 (`exchangeCodeForSession`)
- `hooks/useAuth.ts` — `useAuth()` hook (セッション取得, `onAuthStateChange` 監視, `signIn`, `signOut`)
- `app/auth/login/page.tsx` — ログインページ (GitHub/Google ボタン)

詳細は Issue #4, #8 を参照。

#### E.4 Mock ⇄ 実API 切り替えフロー

**Day 1-6: Mock モードで開発**

```bash
# .env.local
NEXT_PUBLIC_USE_MOCK=true

# この状態で開発サーバー起動
task frontend:dev
```

すべての Repository が Mock データを返す → UI をサクサク実装できる

**Day 7: 実 API に切り替え**

```bash
# .env.local
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1  # バックエンドのURL

# 開発サーバー再起動
task frontend:dev
```

すべての Repository が実 API を呼ぶ → バックエンドと統合テスト

**トラブルシューティング:**

- **API エラーが出る:** バックエンドが起動しているか確認 (`http://localhost:8000/docs` で Swagger UI が開くか)
- **CORS エラー:** バックエンドの CORS 設定を確認（`http://localhost:3000` を許可する）
- **型が合わない:** `lib/api/types.ts` と実際のレスポンスを比較、必要に応じて型を修正

#### E.5 Mock データの追加ルール

**各自が担当するリポジトリのモックデータは各自が追加する。**

| 担当者 | 追加するモックデータ |
|--------|-------------------|
| Dev A | `plotRepository`, `searchRepository` のモックデータ |
| Dev B | `snsRepository`, `sectionRepository` のモックデータ |

**共通ファイル（`lib/mock/data.ts`）の編集:**
- 型定義（`PlotItem`, `UserBrief` 等）は Issue #2 で Dev A が雛形作成
- 以降は各自が **自分の担当データのみ** 追加
- コンフリクト回避のため、配列の末尾に追加する

```typescript
// ✅ 良い例: 配列の末尾に追加
export const mockPlots: PlotItem[] = [
  // ... 既存データ ...
  {
    id: "mock-3", // 新規追加
    title: "あなたの追加データ",
    // ...
  },
];

// ❌ 悪い例: 既存データの間に挿入（コンフリクトの原因）
export const mockPlots: PlotItem[] = [
  { id: "mock-1", /* ... */ },
  { id: "mock-new", /* ... */ }, // ← ここに挿入すると他の人と衝突
  { id: "mock-2", /* ... */ },
];
```

---

*最終更新: 2026-02-16*
