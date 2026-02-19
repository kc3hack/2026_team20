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
- `src/components/history/SnapshotList/SnapshotList.tsx` — スナップショット一覧
- `src/components/history/SnapshotList/SnapshotList.module.scss`
- `src/hooks/useHistory.ts` — useHistory, useSnapshots, useRollback, useDiff

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
  - HotOperation（72時間保持）の操作ログのみを表示対象とする
- **SnapshotList:**
  - Props: `plotId: string`
  - `useSnapshots(plotId)` でデータ取得（`GET /plots/{plotId}/snapshots`）
  - 各項目: バージョン番号、作成日時、「このバージョンに戻す」ボタン
  - スナップショットの保持ポリシーに基づき、古いスナップショットには保持粒度を表示（7日以内: 全保持、7-30日: 毎時、30日以降: 日次）
  - ColdSnapshot の閲覧・復元を担当するコンポーネントであり、HistoryList とは責務を分離する
  - **スナップショット詳細プレビュー:**
    - 各スナップショット項目をクリックするとモーダルで詳細を表示
    - `GET /plots/{plotId}/snapshots/{snapshotId}` → `SnapshotDetailResponse` でデータ取得
    - モーダル内に Plot タイトル・説明・タグ、各セクションのタイトルとコンテンツのプレビューを表示
    - `content` が `null` の場合は「スナップショットデータなし」を表示
    - モーダル内に「このバージョンに戻す」ボタンを配置（ロールバック導線）
- **DiffViewer:**
  - Props: `diff: DiffResponse`
  - additions を緑背景、deletions を赤背景で表示
  - GitHub 風の diff 表示スタイル
- **ロールバック:**
  - `useRollback(plotId, snapshotId)` ミューテーション
  - 成功 → `toast.success("スナップショットから復元しました")` + Plot 詳細を invalidate
  - スナップショットが存在しない → `toast.error("指定のスナップショットが見つかりません")`

##### テスト観点
- `HistoryList`: 履歴項目がバージョン降順で表示される
- `DiffViewer`: additions が緑、deletions が赤で表示される
- ロールバックの確認ダイアログが表示される

##### 使用する API
- `GET /sections/{sectionId}/history?limit=50`
- `GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}`
- `GET /plots/{plotId}/snapshots`
- `GET /plots/{plotId}/snapshots/{snapshotId}` → `SnapshotDetailResponse`
- `POST /plots/{plotId}/rollback/{snapshotId}`

##### 依存関係
- Issue #3 (historyRepository)
- Issue #7 (Plot 詳細ページから「履歴」リンク)
