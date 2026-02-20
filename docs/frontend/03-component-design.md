# コンポーネント設計戦略

> ⚠️ **スタイリング重要ルール:** 自前のコンポーネントスタイルは **SCSS Module** で書いてください。Tailwind は shadcn/ui の `className` カスタマイズのみに使用します。詳細は [スタイリング戦略](./05-styling-guide.md) を参照。

## shadcn/ui ファーストの原則

**ゼロからコンポーネントを作らない。99% は shadcn/ui で解決できる。**

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

## shadcn/ui コンポーネント一覧（優先使用）

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

## カスタマイズ方法

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
