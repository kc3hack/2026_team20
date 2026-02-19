# Step 6: 画像対応・モバイル仕上げ / エラー・ローディング改善（Day 6）

> [← Step 5](./step5-day5.md) | [Step 7 →](./step7-day7.md)

---

#### Issue #14

**タイトル:** [UI] 画像アップロード + モバイル対応仕上げ

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/hooks/useImageUpload.ts` — 画像アップロード hook
- EditorToolbar の画像ボタンに実装を追加（Issue #9 で作成済の Dialog を完成させる）
- 各ページのモバイル対応 SCSS 調整:
  - `src/app/page.module.scss` — トップページモバイル最適化
  - `src/app/plots/[id]/page.module.scss` — 詳細ページ 1 カラム化
  - `src/components/layout/Header/Header.module.scss` — ヘッダーレスポンシブ改善

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
  - ブレークポイント: sm (640px), md (768px), lg (1024px)
  - トップページ: 1 列表示
  - 詳細ページ: 目次を非表示 (or アコーディオン)、セクション 1 カラム
  - 編集ボタン: **PC・モバイルともに表示**（モバイルでも編集可能）
  - `SectionLockBadge`: モバイルでも表示（他の人が編集中であることは全デバイスで確認可能）
  - ヘッダー: md 未満で検索バー非表示 → ハンバーガーメニュー内に移動

##### テスト観点
- 5MB 超のファイルでバリデーションエラー
- 非対応形式 (.pdf 等) でバリデーションエラー
- レスポンシブ表示テスト (E2E で viewport 切り替え)

##### 使用する API
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

## 画像API関連の未実装項目

### バックエンド
- [ ] `backend/app/api/v1/endpoints/images.py` — POST /images ルーター実装
- [ ] `plots` テーブルに `thumbnail_url` カラム追加（マイグレーション）
- [ ] `api.py` で images router を有効化（コメントアウト解除）

### フロントエンド
- [ ] `frontend/src/lib/api/images.ts` — 画像アップロードリポジトリ実装
- [ ] サムネイル画像アップロードUI コンポーネント
- [ ] Plot作成/編集フォームへのサムネイル選択機能追加
