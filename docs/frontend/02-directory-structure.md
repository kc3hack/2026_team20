# ディレクトリ構造・設計原則

## ディレクトリツリー

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
│   │   │       │   └── page.tsx         #     Plot 編集ページ (認証必須)
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

## ディレクトリ設計原則

| ディレクトリ | 原則 |
|-------------|------|
| `app/` | **ルーティングのみ**に責任を持つ。ページコンポーネントは薄く保ち、ロジックは `hooks/`、表示は `components/` に委譲する。 |
| `components/ui/` | **shadcn/ui が自動生成するファイル。絶対に手動で編集しない。** カスタマイズは呼び出し側で `className` prop を使って Tailwind クラスを追加する。新しいコンポーネントが必要になったら、まず [shadcn/ui のドキュメント](https://ui.shadcn.com/) で該当コンポーネントがあるか確認する。 |
| `components/{feature}/` | 機能ドメインごとにグルーピング。1 コンポーネント = 1 フォルダ（`.tsx` + `.module.scss` + `.test.tsx`）。**内部では shadcn/ui コンポーネントを組み合わせて実装する。** ファイル数が多い場合は `.test.tsx` を `__tests__/` に、`.module.scss` を `styles/` サブディレクトリに移動することを推奨する。 |
| `components/shared/` | 2 つ以上の機能ドメインで使われる汎用コンポーネント。shadcn/ui の薄いラッパーとして実装することが多い（例: `TagBadge` は内部で `<Badge>` を使う）。 |
| `hooks/` | TanStack Query ベースのカスタム Hook。ページコンポーネントから API を直接呼ばない。 |
| `lib/api/` | **API 変更の影響を吸収する唯一のレイヤー**。Repository パターンでリクエスト関数を分離。`client.ts` は必ずテスト（`client.test.ts`）を書く。 |
| `lib/supabase/` | Supabase クライアント生成関数。ブラウザ用・サーバー用・Middleware 用の 3 種類を用意。 |
| `lib/mock/` | **Mock ファースト開発用**。`data.ts` で偽データ定義、`storage.ts` で永続化、`migration.ts` でバージョン管理。`NEXT_PUBLIC_USE_MOCK=true` 時に使用。[Mock ファースト開発](./09-mock-development.md)参照。 |
| `providers/` | Client Component 限定の Context Provider。`"use client"` 境界をここに集約。 |
| `styles/` | SCSS パーシャル。`@use` で各 `.module.scss` から参照。 |
| `types/` | **ドメイン横断の共通型定義**。API 型（`lib/api/types.ts`）とは別に、ユーティリティ型や定数型をここに配置。 |
| `test/` | Vitest セットアップファイル。`setup.ts` で Testing Library のグローバル設定、`smoke.test.ts` で基本動作確認。 |

## 型定義ファイルの使い分け

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
