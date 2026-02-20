# 🎯 スタイリング戦略

## 基本方針：SCSS ファースト、Tailwind は shadcn/ui のためだけ

**Tailwind CSS は shadcn/ui のために導入しているだけ。自前のスタイルは SCSS Module で書く。**

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

## Tailwind と SCSS の使い分けルール

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

## 判断基準フローチャート

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

## `cn()` ユーティリティで Tailwind + SCSS を合成

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

## SCSS ファイル構成ルール

```scss
// styles/_variables.scss — グローバル SCSS 変数
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;

$z-header: 40;
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

## レスポンシブデザイン戦略

### ブレイクポイント定義

| デバイス | ブレイクポイント | 用途 |
|---------|----------------|------|
| **モバイル** | `〜767px` | スマートフォン |
| **タブレット** | `768px〜1023px` | タブレット |
| **デスクトップ** | `1024px〜` | PC・大画面 |

### レスポンシブ実装パターン

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

### レスポンシブデザインチェックリスト

各コンポーネント実装時、以下を確認する：

- [ ] **タッチターゲットサイズ:** ボタン・リンクは最小 44×44px
- [ ] **フォントサイズ:** 本文は最小 16px
- [ ] **余白:** 小さい画面では左右に十分な余白を確保
- [ ] **ナビゲーション:** 狭い画面ではハンバーガーメニューに折りたたむ
- [ ] **画像:** `max-width: 100%` で親要素からはみ出さないようにする
- [ ] **テーブル:** 狭い画面では横スクロールまたはカード表示に切り替え
- [ ] **フォーム:** 入力欄は画面幅に応じて適切なサイズに調整

### 動作確認方法

```bash
# 開発サーバー起動
task frontend:dev

# ブラウザの DevTools でデバイスエミュレーション
# - iPhone SE (375px)
# - iPad (768px)
# - Desktop (1280px)
```

### よくあるレスポンシブ対応パターン

| 要素 | モバイル | タブレット | デスクトップ |
|------|---------|-----------|-------------|
| **ヘッダー** | ロゴ + ハンバーガーメニュー | ロゴ + 横並びメニュー | 同左 + 検索バー拡張 |
| **Plot一覧** | 1カラム | 2カラム | 3カラム |
| **Plot詳細** | 縦積み（メタ情報 → 本文） | 同左 | 横並び（サイドバー + 本文） |
| **エディタ** | 全画面 | 最大幅 800px 中央寄せ | 同左 |
| **フォーム** | 縦積み | 2カラム（ラベル左、入力右） | 同左 |
