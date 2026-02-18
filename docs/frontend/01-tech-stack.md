# 推奨技術スタック

## コアフレームワーク（確定済み）

| カテゴリ | ライブラリ | バージョン | 用途 |
|---------|-----------|-----------|------|
| Framework | Next.js (App Router) | 16.x | SSR/RSC/ルーティング |
| Language | TypeScript | 5.x | 型安全 |
| UI Library | shadcn/ui (New York) | latest | 基盤 UI コンポーネント |
| Styling (primary) | SCSS Modules | sass 1.x | **自前スタイルのメイン実装** |
| Styling (secondary) | Tailwind CSS | 4.x | **shadcn/ui のため & 簡単なユーティリティ** |
| Editor | Tiptap | 2.x | リッチテキストエディタ |
| Realtime (CRDT) | Y.js + y-prosemirror | 13.x | エディタ内容のリアルタイム同期（CRDT ベース） |
| Realtime (通信) | Supabase Realtime (WebSocket) | latest | Y.js 差分配信 (Broadcast) + セクションロック状態共有 (Y.js Awareness) |
| Collaboration | @tiptap/extension-collaboration | 2.x | Tiptap ↔ Y.js 統合 (ProseMirror binding) |
| Auth | Supabase Auth (@supabase/ssr) | latest | OAuth / セッション管理 |
| Icons | Lucide React | latest | SVG アイコン |
| Linter/Formatter | Biome | 2.x | ESLint + Prettier 代替 |
| Test (Unit) | Vitest + Testing Library | latest | コンポーネント / ロジックテスト |
| Test (E2E) | Playwright | latest | ブラウザ統合テスト |

> **📘 セクション単位ロック + リアルタイム同期**: 詳細は [リアルタイム編集仕様](./10-realtime-editing.md) を参照。1 セクション = 1 編集者の排他ロック。他ユーザーには編集内容がリアルタイムで閲覧表示される。

## 追加選定ライブラリ

| ライブラリ | 採用理由 |
|-----------|---------|
| **@tanstack/react-query v5** | サーバー状態管理のデファクト。キャッシュ・再取得・楽観的更新・ローディング/エラー状態を宣言的に管理。API 層と UI コンポーネントを疎結合にできる。 |
| **@tanstack/react-query-devtools** | 開発中のキャッシュ状態/クエリ状態の可視化。デバッグ効率が劇的に向上。 |
| **react-hook-form + @hookform/resolvers** | 非制御コンポーネントベースの高パフォーマンスフォームライブラリ。shadcn/ui の `<Form>` と統合済み。 |
| **zod** | TypeScript ファーストのスキーマバリデーション。react-hook-form のリゾルバーとして使用し、フォームバリデーションを型安全に実現。 |
| **sonner** | shadcn/ui 公式推奨のトースト通知ライブラリ。成功/エラー通知用。 |
| **date-fns** | 軽量な日付フォーマットライブラリ。`formatDistanceToNow` で「3 時間前」表示等。 |

## インストールコマンド

```bash
# 追加ライブラリ
pnpm add @tanstack/react-query @tanstack/react-query-devtools
pnpm add react-hook-form @hookform/resolvers zod
pnpm add sonner date-fns
pnpm add @supabase/ssr
pnpm add @tiptap/extension-collaboration   # Y.js ↔ Tiptap 統合

# shadcn/ui コンポーネント (必要に応じて追加)
pnpm dlx shadcn@latest add button card input textarea badge avatar
pnpm dlx shadcn@latest add dropdown-menu dialog sheet separator skeleton
pnpm dlx shadcn@latest add tabs tooltip form sonner
```
