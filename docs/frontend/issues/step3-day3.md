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
  - 保護ルート: `/plots/new`（`/plots/[id]` は公開、編集アクションは UI/API レベルで保護）

##### テスト観点
- `LoginButton`: クリックで `signInWithOAuth` が呼ばれる（モック）
- `UserMenu`: ログアウトクリックで `signOut` が呼ばれる
- `AuthGuard`: 未認証時にリダイレクトされる

##### 依存関係
- Issue #4 (AuthProvider, Supabase クライアント)
- Issue #5 (Header の slot 構造)

---

#### Issue #9

**タイトル:** [UI/Logic] Tiptap エディタ統合 — セクション編集・ツールバー・**セクションロック + Y.js リアルタイム同期**

**担当:** Dev B

**内容:**

> ⚠️ **仕様変更**: Plot の編集は**セクション単位の排他ロック**方式です。詳細は [10-realtime-editing.md](../10-realtime-editing.md) を絶対に先に読んでください。

##### 実装するファイル
- `src/components/editor/TiptapEditor/TiptapEditor.tsx` — Tiptap エディタコアラッパー
- `src/components/editor/TiptapEditor/TiptapEditor.module.scss` — エディタ SCSS (ProseMirror スタイル)
- `src/components/editor/EditorToolbar/EditorToolbar.tsx` — ツールバー
- `src/components/editor/EditorToolbar/EditorToolbar.module.scss`
- `src/components/section/SectionEditor/SectionEditor.tsx` — セクション編集コンポーネント (**セクションロック統合済み**)
- `src/components/section/SectionEditor/SectionEditor.module.scss`
- `src/hooks/useSections.ts` — useSectionList, useUpdateSection, useCreateSection, useDeleteSection
- `src/hooks/useSectionLock.ts` — **セクションロック管理 (Y.js Awareness ベース)**
- `src/hooks/useRealtimeSection.ts` — **Y.js + Broadcast によるリアルタイム同期**
- `src/lib/realtime/channel.ts` — **Supabase Realtime チャネル管理**
- `src/lib/realtime/awareness.ts` — **Y.js Awareness ラッパー (ロック状態管理)**
- `src/lib/realtime/types.ts` — **SectionAwarenessState, YjsSyncMessage 型定義**
- `src/styles/_typography.scss` の拡充（Tiptap コンテンツのスタイル: h1-h3, p, ul, ol, a, blockquote, code 等）

##### 満たすべき要件

**Phase 1 — MVP（このIssueで必ず完了させる）:**
- **TiptapEditor:**
  - Props:
    ```typescript
    interface TiptapEditorProps {
      content?: Record<string, unknown>;  // 初期コンテンツ (Tiptap JSON)
      editable?: boolean;                 // デフォルト true
      onChange?: (json: Record<string, unknown>) => void;
      onDirtyChange?: (isDirty: boolean) => void;  // 未保存変更状態の通知
      className?: string;
    }
    ```
  - 使用する Tiptap 拡張 (**MVP**):
    - `StarterKit` (Bold, Italic, Strike, Heading, BulletList, OrderedList, Blockquote, Code, HorizontalRule)
    - `Placeholder` (`@tiptap/extension-placeholder`) — プレースホルダーテキスト
    - `Collaboration` (`@tiptap/extension-collaboration`) — **Y.js 統合（リアルタイム同期の基盤）**
  - `onChange` は `onUpdate` イベントで `editor.getJSON()` を返す
  - **Y.js 統合**: `Collaboration` 拡張で Y.js Doc と Tiptap を接続。Supabase Realtime Broadcast 経由で差分を配信
- **未保存変更の警告（重要）:**
  - エディタで未保存の変更がある場合、ブラウザバック/リロード/タブクローズ時に `beforeunload` イベントで警告を表示
  - `useEffect` で `editor.isEditable && hasUnsavedChanges` を監視
  - 保存成功後は警告を解除
  - Next.js の `<Link>` 遷移時も警告が必要な場合、カスタム確認ダイアログを実装
- **EditorToolbar（MVP版）:**
  - **最低限のボタンのみ:** Bold, Italic, H1, H2, H3, BulletList, OrderedList, Undo, Redo
  - 各ボタンはアクティブ状態を `editor.isActive()` で判定し、ハイライト表示
- **SectionEditor（セクションロック統合版）:**
  - Props:
    ```typescript
    interface SectionEditorProps {
      section: SectionResponse;
      /** ロック状態（親から渡される） */
      lockState: "unknown" | "unlocked" | "locked-by-me" | "locked-by-other";
      /** ロック保持者情報 */
      lockedBy: { id: string; displayName: string; avatarUrl: string | null } | null;
      /** 保存コールバック */
      onSave: (title: string, content: Record<string, unknown>) => void;
      /** 編集開始コールバック（ロック取得をトリガー） */
      onEditStart: () => void;
      /** 編集終了コールバック（ロック解放をトリガー） */
      onEditEnd: () => void;
    }
    ```
  - **UI 状態遷移:**
    | `unknown` | 「⏳ 接続中...」or 非活性の編集ボタン |
    | `unlocked` | 閲覧表示 + 「✏️ 編集する」ボタン |
    | `locked-by-me` | Tiptap エディタ（編集可能）+ 「✅ 編集完了」ボタン |
    | `locked-by-other` | 閲覧表示（リアルタイム更新）+ `SectionLockBadge` |
  - 「編集する」クリック:
    - **未ログイン** → キャンセルしてログインを促す（`toast.error("編集するにはログインが必要です")` + ログインページへ誘導）
    - **ログイン済** → `onEditStart()` → `useSectionLock.acquireLock()` → 成功でインプレース編集モードへ
  - 「編集完了」クリック → `onEditEnd()` → `onSave()` + `useSectionLock.releaseLock()`
  - **ロック取得失敗**: `toast.error("このセクションは ${displayName} が編集中です")` + 閲覧維持
  - デバウンスによる自動保存は将来実装（今は手動保存のみ）
  - ⨳ **インプレース編集**: `/plots/[id]/edit` へのページ遷移は行わない。Plot 詳細ページ（`/plots/[id]`）上で直接セクションを編集する
- **useSectionLock フック（Y.js Awareness ベース）:**
  - `acquireLock()`: Awareness 状態を確認 → 空いていれば `awareness.setLocalState({ editingSectionId, user })` → `true` を返す
  - `releaseLock()`: `awareness.setLocalState({ editingSectionId: null, user })`
  - Y.js Awareness のデフォルトタイムアウト（30秒）が切断時の自動解放を担う——ハートビートの自前実装は不要
  - 詳細は [10-realtime-editing.md](../10-realtime-editing.md) の `useSectionLock` セクション参照
- **useRealtimeSection フック:**
  - `plot:{plotId}` Broadcast チャネルを購読
  - Y.js 差分メッセージを受信 → ローカル Y.js Doc に適用 → Tiptap エディタに反映
  - 編集者側: `editor.on("update")` → Y.js 差分を Broadcast チャネルに送信
  - 詳細は [10-realtime-editing.md](../10-realtime-editing.md) の `useRealtimeSection` セクション参照
- **lib/realtime/ インフラ:**
  - `channel.ts`: Supabase Realtime チャネル作成・購読・切断ユーティリティ
  - `awareness.ts`: Y.js Awareness ラッパー (セクションロック状態管理)
  - `types.ts`: `SectionAwarenessState`, `YjsSyncMessage` 型定義
- **Plot 詳細ページ (`/plots/[id]`) への編集機能統合:**
  - **Y.js Awareness で `plot:{plotId}` チャネルを購読** → 各セクションのロック状態をリアルタイム取得
  - **初期状態:** Awareness コネクション確立までは「接続中...」または編集ボタン非活性
  - 各セクションを `SectionEditor` で表示（`lockState` を Awareness から決定）
  - 「セクション追加」ボタン
  - 編集アクションは認証必須（AuthGuard 等でボタン押下時にチェック）
  - `isPaused === true` の場合、編集不可のメッセージを表示
  - **1 ユーザーが同時に編集できるセクションは 1 つのみ**：別のセクションの「編集」をクリック → 現在のセクションのロックを先に解放

**Phase 2 — 余裕があれば追加（別 Issue or 同 Issue 内で後から）:**
- Underline (`@tiptap/extension-underline`)
- Link (`@tiptap/extension-link`)
- Color + TextStyle（8 色パレット、`<DropdownMenu>` で選択）
- Image (`@tiptap/extension-image`) — 画像挿入（Step 6 の画像アップロードと連携）
- Strikethrough ボタン
- **セクションの並び替え (Drag & Drop)** — `dnd-kit` 等を使用し `orderIndex` を更新する機能

##### テスト観点
- `TiptapEditor`: content を渡して editable=false で描画される
- `SectionEditor`: `lockState="locked-by-me"` で編集モードが表示される
- `SectionEditor`: `lockState="locked-by-other"` で「🔒 ○○が編集中」バッジが表示される
- `SectionEditor`: 「編集完了」ボタンクリックで onSave + onEditEnd が呼ばれる
- `useSectionLock`: acquireLock 成功時にロック状態が `locked-by-me` になる（モック）

##### 追加パッケージ
```bash
# MVP
pnpm add @tiptap/extension-placeholder
pnpm add @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor @tiptap/extension-collaboration-history @tiptap/extension-link @tiptap/extension-underline @tiptap/extension-bubble-menu
# Y.js ↔ Tiptap 統合

# Phase 2（余裕があれば）
# pnpm add @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-image
```

##### 使用する API
- `PUT /sections/{sectionId}` — セクション更新
- `POST /plots/{plotId}/sections` — セクション追加
- `DELETE /sections/{sectionId}` — セクション削除

> ⚠️ **ロック管理は Y.js Awareness で行う。** REST API のロックエンドポイント（`POST /sections/{id}/lock` 等）は存在しないので使わないこと。

##### 依存関係
- Issue #2 / #3 (API 基盤)
- Issue #5 (_typography.scss)
- Issue #7 (SectionViewer を参考に、editable 版を構築)
- **[10-realtime-editing.md](../10-realtime-editing.md) — 必読。ロックライフサイクル、チャネル設計、エラーハンドリングの全仕様**
