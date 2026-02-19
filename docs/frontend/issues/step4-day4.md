# Step 4: 検索・Plot 作成 / SNS 機能（Day 4）

> [← Step 3](./step3-day3.md) | [Step 5 →](./step5-day5.md)

---

#### Issue #10

**タイトル:** [UI/Logic] 検索結果ページ + Plot 一覧ページ + Plot 作成/編集フォーム

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/app/search/page.tsx` — 検索結果ページ
- `src/hooks/useSearch.ts` — useSearchPlots
- `src/app/plots/page.tsx` — Plot 一覧ページ (/plots, タグフィルタ対応)
- `src/app/plots/new/page.tsx` — Plot 新規作成ページ
- `src/components/plot/PlotForm/PlotForm.tsx` — 作成/編集フォーム
- `src/components/plot/PlotForm/PlotForm.test.tsx`
- `src/hooks/usePlots.ts` に `useCreatePlot`, `useUpdatePlot` を追加

##### 満たすべき要件
- **検索結果ページ (`/search?q=xxx`):**
  - URL の `q` パラメータを読み取り `useSearchPlots(q)` でデータ取得
  - 結果を `<PlotList>` で表示
  - 「"xxx" の検索結果: N 件」を表示
  - 結果 0 件では `<EmptyState title="見つかりませんでした" />`
  - ページネーション (offset ベース)
- **Plot 一覧ページ (`/plots?tag=xxx&sort=trending`):**
  - タグフィルタ: URL の `tag` パラメータで `usePlotList({ tag })` を呼ぶ
  - ソート切り替え: Trending / Popular / New (タブ or ドロップダウン)
  - ページネーション
- **Plot 作成ページ (`/plots/new`):**
  - `<PlotForm mode="create" />` を表示
  - 認証必須 (AuthGuard)
- **PlotForm:**
  - Props:
    ```typescript
    interface PlotFormProps {
      mode: "create" | "edit";
      defaultValues?: { title: string; description: string; tags: string[] };
      onSubmit: (data: CreatePlotRequest) => void;
      isSubmitting?: boolean;
    }
    ```
  - フィールド: タイトル (max 200 文字), 説明文 (max 2000 文字), タグ (カンマ区切り入力 or バッジ追加 UI)
  - バリデーション: zod スキーマ + react-hook-form
    ```typescript
    const plotSchema = z.object({
      title: z.string().min(1, "タイトルは必須です").max(200, "200文字以内"),
      description: z.string().max(2000, "2000文字以内").optional(),
      tags: z.array(z.string()).max(10, "タグは10個まで").optional(),
    });
    ```
  - 送信成功後、`sonner` の `toast.success("Plotを作成しました")` を表示
  - 作成成功後、`/plots/{id}` へリダイレクト

##### テスト観点
- `PlotForm`: 空タイトルでバリデーションエラーが表示される
- `PlotForm`: 200 文字超えでバリデーションエラー
- `PlotForm`: 正常入力で onSubmit が呼ばれる

##### 使用する API
- `GET /search?q=xxx&limit=20&offset=0`
- `GET /plots?tag=xxx&limit=20&offset=0`
- `POST /plots` — Plot 作成
- `PUT /plots/{plotId}` — Plot 更新

##### 依存関係
- Issue #3 (searchRepository, plotRepository)
- Issue #5 (Pagination, EmptyState)
- Issue #6 (PlotCard, PlotList, SearchBar)

---

#### Issue #11

**タイトル:** [UI] SNS 機能 — StarButton / ForkButton / CommentThread

**担当:** Dev B

**内容:**

##### 実装するファイル
- `src/components/sns/StarButton/StarButton.tsx` — スターボタン
- `src/components/sns/StarButton/StarButton.test.tsx`
- `src/components/sns/ForkButton/ForkButton.tsx` — フォークボタン
- `src/components/sns/CommentThread/CommentThread.tsx` — コメント一覧
- `src/components/sns/CommentThread/CommentThread.module.scss`
- `src/components/sns/CommentForm/CommentForm.tsx` — コメント投稿フォーム
- `src/hooks/useStar.ts` — useToggleStar
- `src/hooks/useComments.ts` — useComments, useAddComment

##### 満たすべき要件
- **StarButton:**
  - Props: `plotId: string`, `initialCount: number`, `initialIsStarred: boolean`
  - クリックで star toggle（楽観的更新: UI を即座に反映 → API コール → 失敗時ロールバック）
  - アニメーション: スター追加時にポップエフェクト (SCSS `@keyframes`)
  - 未ログイン時はクリックでログインページへリダイレクト
  - 表示: ⭐ アイコン + カウント数
- **ForkButton:**
  - Props: `plotId: string`
  - クリックで確認ダイアログ → `forkRepository.create(plotId, token)`
  - 成功後、新しい Plot の詳細ページへ遷移
  - `toast.success("フォークしました")`
- **CommentThread:**
  - Props: `threadId: string`
  - `useComments(threadId)` でコメント一覧を取得
  - 各コメント: アバター、表示名、投稿日時、本文
  - `parentCommentId` がある場合、返信先を「@表示名」で表示
  - ローディング中は Skeleton
- **CommentForm:**
  - Props: `threadId: string`, `parentCommentId?: string`
  - `<Textarea>` + 「投稿」ボタン
  - バリデーション: max 5000 文字
  - 投稿成功で `toast.success("コメントを投稿しました")`、コメント一覧を `invalidateQueries`
  - 返信モード: 親コメントの引用表示 + キャンセルボタン
- **Plot 詳細ページとの統合:**
  - `PlotDetail` に `StarButton` と `ForkButton` を配置
  - セクション下部にコメントエリア（Thread がなければ「コメントを開始」ボタンで Thread 作成）

##### テスト観点
- `StarButton`: クリックでカウントが増減する（楽観的更新）
- `StarButton`: 未ログイン時にリダイレクトされる
- `CommentForm`: 空本文で送信不可
- `CommentForm`: 5000 文字超でバリデーションエラー

##### 使用する API
- `POST /plots/{plotId}/stars` — スター追加
- `DELETE /plots/{plotId}/stars` — スター削除
- `POST /plots/{plotId}/fork` — フォーク
- `POST /threads` — スレッド作成
- `GET /threads/{threadId}/comments` — コメント一覧
- `POST /threads/{threadId}/comments` — コメント投稿

##### 依存関係
- Issue #3 (snsRepository)
- Issue #7 (PlotDetail に StarButton/ForkButton を配置)
- Issue #8 (useAuth — ログイン状態判定)

---
