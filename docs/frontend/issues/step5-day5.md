# Step 5: プロフィール / 履歴・復元（Day 5）

> [← Step 4](./step4-day4.md) | [Step 6 →](./step6-day6.md)

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
  - Props: `user: { id, displayName, avatarUrl }`
  - コンパクトなカード (アバター小 + 表示名)。クリック → プロフィールへ

##### テスト観点
- `UserProfile`: プロフィール情報が正しく表示される
- タブ切り替えで正しいデータが表示される

##### 使用する API
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

##### 使用する API
- `GET /sections/{sectionId}/history?limit=50`
- `GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}`
- `POST /sections/{sectionId}/rollback/{version}`

##### 依存関係
- Issue #3 (historyRepository)
- Issue #7 (Plot 詳細ページから「履歴」リンク)
