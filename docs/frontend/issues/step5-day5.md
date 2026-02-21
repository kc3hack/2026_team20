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
- `src/components/history/RollbackLogList/RollbackLogList.tsx` — ロールバック監査ログ一覧
- `src/components/history/RollbackLogList/RollbackLogList.module.scss`
- `src/hooks/useHistory.ts` — useHistory, useSnapshots, useRollback, useRollbackLogs, useDiff

##### 満たすべき要件
- **履歴ページ (`/plots/[id]/history`):**
  - セクション選択ドロップダウン（Plot の全セクション一覧）
  - 選択したセクションの履歴一覧を表示
  - 2 つのバージョンを選択して差分を表示
  - 「このバージョンに戻す」ボタン（確認ダイアログ付き）
- **HistoryList:**
  - Props: `sectionId: string`
  - `useHistory(sectionId, { limit?, offset? })` でデータ取得（デフォルト: limit=50, offset=0）
  - 各項目: バージョン番号、操作種別 (insert/delete/update)、ユーザー、日時
  - `payload` フィールド: 操作の詳細情報（`{} | null`）。null でない場合は「詳細」トグルで展開表示する（JSON整形表示）。表示は補助的な位置づけとし、メイン情報（操作種別・ユーザー・日時）を優先する
  - タイムライン風の表示 (SCSS Module で縦線 + ドット装飾)
  - HotOperation（72時間保持）の操作ログのみを表示対象とする
  - ページネーション: 「もっと読み込む」ボタンで追加取得（offset を加算）
- **SnapshotList:**
  - Props: `plotId: string`
  - `useSnapshots(plotId, { limit?, offset? })` でデータ取得（`GET /plots/{plotId}/snapshots`、デフォルト: limit=20, offset=0）
  - 各項目: バージョン番号、作成日時、「このバージョンに戻す」ボタン
  - スナップショットの保持ポリシーに基づき、古いスナップショットには保持粒度ラベルを表示（7日以内: 全保持、7-30日: 毎時、30日以降: 日次）。APIレスポンス（`SnapshotResponse`）には保持粒度フィールドが存在しないため、`createdAt` と現在時刻の差分からフロントエンドで算出する
  - ColdSnapshot の閲覧・復元を担当するコンポーネントであり、HistoryList とは責務を分離する
  - ページネーション: 「もっと読み込む」ボタンで追加取得（offset を加算）
  - **スナップショット詳細プレビュー:**
    - 各スナップショット項目をクリックするとモーダルで詳細を表示
    - `GET /plots/{plotId}/snapshots/{snapshotId}` → `SnapshotDetailResponse` でデータ取得
    - モーダル内に Plot タイトル・説明・タグ、各セクションのタイトルとコンテンツのプレビューを表示
    - `content` が `null` の場合は「スナップショットデータなし」を表示
    - モーダル内に「このバージョンに戻す」ボタンを配置（ロールバック導線）
- **RollbackLogList:**
  - Props: `plotId: string`
  - `useRollbackLogs(plotId, { limit?, offset? })` でデータ取得（`GET /plots/{plotId}/rollback-logs`、デフォルト: limit=20, offset=0）
  - 各項目: スナップショットバージョン（`snapshotVersion`）、実行ユーザー、理由（`reason`、null の場合は「理由なし」）、実行日時
  - Plot 所有者または管理者のみに表示する（`403 Forbidden` 時はコンポーネントを非表示にする）
  - ページネーション: 「もっと読み込む」ボタンで追加取得（offset を加算）
- **DiffViewer:**
  - Props: `diff: DiffResponse`
  - additions を緑背景、deletions を赤背景で表示
  - GitHub 風の diff 表示スタイル
- **ロールバック:**
  - `useRollback(plotId, snapshotId, { expectedVersion?, reason? })` ミューテーション 
    - `expectedVersion`: 現在の Plot の `version` 値を送信（楽観的ロック）。省略時はバージョンチェックをスキップ 
    - `reason`: ロールバック理由（任意）。監査ログ（`rollback_logs`）に記録される 
  - 確認ダイアログ内に `reason` の入力欄（テキストフィールド、任意）を表示する 
  - 成功 → `toast.success("スナップショットから復元しました")` + Plot 詳細を invalidate
  - エラーハンドリング: 
    - `404 Not Found` → `toast.error("指定のスナップショットが見つかりません")`
    - `403 Forbidden` → `toast.error("この Plot は現在一時停止中のため、復元できません")` 
    - `409 Conflict` → `toast.error("他のユーザーが先に変更を行いました。ページを再読み込みしてください")` + Plot 詳細を invalidate（最新状態を再取得） 

##### テスト観点
- `HistoryList`: 履歴項目がバージョン降順で表示される
- `HistoryList`: `payload` が存在する場合、詳細トグルで展開表示される 
- `DiffViewer`: additions が緑、deletions が赤で表示される
- ロールバックの確認ダイアログが表示され、`reason` 入力欄が存在する 
- ロールバック成功時に toast.success が表示される 
- ロールバック 403 エラー時に一時停止中メッセージが表示される 
- ロールバック 409 エラー時にバージョン不一致メッセージが表示され、Plot詳細が再取得される 
- `RollbackLogList`: 監査ログが実行日時の降順で表示される 
- `RollbackLogList`: Plot 所有者でないユーザーにはコンポーネントが表示されない 
- `SnapshotList`: 保持粒度ラベルが `createdAt` に基づいて正しく表示される 

##### 使用する API
- `GET /sections/{sectionId}/history?limit=50&offset=0` → `HistoryListResponse` 
- `GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}` → `DiffResponse` 
- `GET /plots/{plotId}/snapshots?limit=20&offset=0` → `SnapshotListResponse` 
- `GET /plots/{plotId}/snapshots/{snapshotId}` → `SnapshotDetailResponse`
- `POST /plots/{plotId}/rollback/{snapshotId}` → `PlotDetailResponse`（Request Body: `{ expectedVersion?, reason? }`） 
- `GET /plots/{plotId}/rollback-logs?limit=20&offset=0` → `RollbackLogListResponse` 

##### 依存関係
- Issue #3 (historyRepository)
- Issue #7 (Plot 詳細ページから「履歴」リンク)
