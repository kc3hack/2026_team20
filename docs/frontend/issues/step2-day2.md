# Step 2: トップページ / Plot 詳細ページ（Day 2）

> [← Step 1](./step1-day1.md) | [Step 3 →](./step3-day3.md)

---

#### Issue #6

**タイトル:** [UI] トップページ — ランキング 3 セクション + PlotCard + SearchBar

**担当:** Dev A

**内容:**

##### 実装するファイル
- `src/components/plot/PlotCard/PlotCard.tsx` — Plot カードコンポーネント
- `src/components/plot/PlotCard/PlotCard.module.scss` — PlotCard SCSS
- `src/components/plot/PlotCard/PlotCard.test.tsx` — PlotCard テスト
- `src/components/plot/PlotList/PlotList.tsx` — PlotCard のリスト表示 (1 列)
- `src/components/search/SearchBar/SearchBar.tsx` — 検索バー
- `src/components/search/SearchBar/SearchBar.module.scss` — SearchBar SCSS
- `src/hooks/usePlots.ts` — useTrendingPlots, usePopularPlots, useLatestPlots, usePlotList
- **`src/app/page.tsx` — トップページ（本実装）** ← Issue #2 で作成した仮ページを置き換える
- `src/app/page.module.scss` — トップページ SCSS
- Header への SearchBar 注入（渡し方を Dev B と合意）

##### 満たすべき要件
- **PlotCard:**
  - Props: `plot: PlotItem`
  - 表示項目: タイトル、説明文 (2 行で省略)、タグ (TagBadge)、スター数、作成日 (date-fns `formatDistanceToNow`)
  - カード全体がクリッカブル → `/plots/{id}` へ遷移 (Next.js `<Link>`)
  - ホバー時に浮き上がりアニメーション (SCSS Module)
- **PlotList:**
  - Props: `items: PlotItem[]`, `isLoading?: boolean`
  - 1 列のリスト表示
  - `isLoading` 時は `<Skeleton>` を 3 つ表示
- **SearchBar:**
  - `<Input>` + 検索アイコン (Lucide `Search`)
  - Enter キー or 検索ボタンで `/search?q={入力値}` へ遷移 (`useRouter`)
  - `placeholder="Plotを検索..."` 
- **トップページ:**
  - 3 セクション: 「🔥 急上昇」「⭐ 人気」「🆕 新着」
  - 各セクション: `<PlotList items={data.items} />` + 「もっと見る →」リンク (`/plots?sort=trending` 等)
  - 各セクションは Client Component でラップ (`"use client"` + `useTrendingPlots()` 等)
  - 初回アクセスでも表示が速くなるよう、Skeleton でのフォールバック

##### テスト観点
- `PlotCard`: タイトル・タグ・スター数が正しく表示される
- `PlotCard`: クリック時のリンク先が正しい
- `PlotList`: `isLoading=true` で Skeleton が表示される
- `SearchBar`: Enter キーで onSearch コールバックが呼ばれる

##### 使用する API（仮）
- `GET /plots/trending?limit=5`
- `GET /plots/popular?limit=5`
- `GET /plots/new?limit=5`

##### 依存関係
- Issue #2 / #3 (API 基盤, hooks)
- Issue #5 (Header, TagBadge, Skeleton)

---

#### Issue #7

**タイトル:** [UI] Plot 詳細ページ — セクション閲覧 + メタ情報表示

**担当:** Dev B

**内容:**

##### 実装するファイル
- `src/components/plot/PlotDetail/PlotDetail.tsx` — Plot 詳細表示 (メタ情報 + オーナー + タグ)
- `src/components/plot/PlotDetail/PlotDetail.module.scss`
- `src/components/section/SectionViewer/SectionViewer.tsx` — セクション閲覧 (Tiptap content を HTML 描画)
- `src/components/section/SectionViewer/SectionViewer.module.scss`
- `src/components/section/SectionList/SectionList.tsx` — セクション一覧
- `src/hooks/usePlots.ts` に `usePlotDetail` を追加 (Dev A が雛形を作成済み。型と hook を追記)
- `src/app/plots/[id]/page.tsx` — Plot 詳細ページ
- `src/app/plots/[id]/page.module.scss`

##### 満たすべき要件
- **PlotDetail:**
  - Props: `plot: PlotDetailResponse`
  - 表示: タイトル (h1)、説明文、タグ一覧 (TagBadge)、オーナー情報 (Avatar + 名前)、スター数、作成日
  - 「編集する」ボタン（ログイン中 → `/plots/{id}/edit` へリンク。未ログイン → ログインページ）
  - `isPaused === true` の場合、「⚠️ 編集一時停止中」バナーを表示
- **SectionViewer:**
  - Props: `section: SectionItem`
  - Tiptap の content (JSON) を読み取り専用で描画
  - Tiptap エディタを `editable: false` で初期化し、content を `setContent()` で注入
  - タイポグラフィは `_typography.scss` を適用 (見出し, リスト, リンク等が正しくスタイルされる)
- **SectionList:**
  - Props: `sections: SectionItem[]`
  - `orderIndex` 順にソートして表示
  - 各セクションのタイトルをクリックでそのセクションまでスクロール (id アンカー)
- **Plot 詳細ページ (`/plots/[id]`):**
  - `usePlotDetail(id)` でデータ取得
  - ローディング中は Skeleton 表示
  - 左カラム: セクション一覧 (目次)、右/メイン: セクション本文
  - モバイル: 1 カラム（目次は折りたたみ or 上部に配置）

##### テスト観点
- `PlotDetail`: `isPaused=true` で一時停止バナーが表示される
- `SectionViewer`: Tiptap content が正しく描画される (基本的な heading, paragraph)
- `SectionList`: `orderIndex` 順にソートされる

##### 使用する API（仮）
- `GET /plots/{plotId}` → `PlotDetailResponse`

##### 依存関係
- Issue #2 / #3 (API 基盤, hooks)
- Issue #5 (Header/Footer レイアウト, TagBadge, Avatar)
