# Step 3: 認証フロー / Tiptap エディタ（Day 3）

> [← Step 2](./step2-day2.md) | [Step 4 →](./step4-day4.md)

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
