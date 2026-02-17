# テスト戦略

> **ハッカソン方針:** テストは「機能を壊さないための最低限」に絞る。E2E は全機能完成後に余裕があれば書く。

## テストピラミッド（ハッカソン版）

```
       ╱ E2E (Playwright) ╲             ← 余裕があれば（Day 7）
      ╱  Integration (Vitest) ╲         ← 余裕があれば
     ╱  Unit (Vitest + RTL)     ╲       ← ここだけ必須
    ╱────────────────────────────╲
```

| レイヤー | ツール | テスト対象 | 優先度 |
|---------|--------|-----------|--------|
| Unit | Vitest | `lib/api/client.ts` のエラーハンドリング | **必須** |
| Unit | Vitest + RTL | `PlotCard`, `StarButton` 等の表示 / インタラクション | 余裕があれば |
| Integration | Vitest + RTL | カスタムHook のクエリ/ミューテーション動作 | 余裕があれば |
| E2E | Playwright | ログイン → Plot 作成 → 編集 → スター等の全体フロー | **後回し** |

## テストファイル命名規則

- Unit / Integration: `ComponentName.test.tsx` (`hooks/usePlots.test.ts`)
- E2E: `feature-name.spec.ts`

## Mock 戦略

- **Unit テスト:** Repository 関数を `vi.mock()` でモック
- **Hook テスト:** `@tanstack/react-query` の `QueryClient` をテスト用に作成、Repository をモック
- **E2E:** 実際の（またはステージング）バックエンドに接続。不安定な場合は API Route による proxy mock を検討

## 実装順番とテスト戦略

開発時は**機能の性質に応じてアプローチを使い分ける**：

| 機能の性質 | 開発アプローチ | 理由 |
|-----------|--------------|------|
| **ロジック層（複雑な計算・通信）** | **TDD（テスト駆動開発）** | `lib/api/client.ts`, Repository, カスタム Hook 等は**先にテストを書いてから実装**する。ロジックの正確性を保証し、リファクタリングしやすくなる。API 仕様変更時の影響範囲も明確になる。 |
| **UI層（見た目・インタラクション）** | **プレビュー駆動開発** | コンポーネントは**実際にブラウザで表示を確認しながら実装**する。デザイン調整・レスポンシブ対応・アニメーションは目で見て判断する方が速い。テストは後から追加（または省略）。 |

**具体例：**

```
✅ TDD を使う（テスト → 実装）：
  - lib/api/client.ts の apiClient 関数
  - lib/api/plots.ts の plotRepository
  - hooks/usePlots.ts の楽観的更新ロジック
  - lib/utils.ts のヘルパー関数

✅ プレビュー駆動（実装 → プレビュー確認 → 調整）：
  - components/plot/PlotCard/PlotCard.tsx のレイアウト
  - components/layout/Header/Header.tsx のレスポンシブ対応
  - PlotCard.module.scss のホバーアニメーション
  - 色・余白・フォントサイズ等の調整
```

## ワークフロー例（PlotCard 実装の場合）

### 1. ロジック層を TDD で実装

```bash
# 1. テストを書く
touch src/hooks/usePlots.test.ts
# 2. テストを実行（Red）
task frontend:test
# 3. 実装する（Green）
# 4. リファクタリング
```

### 2. UI層をプレビュー駆動で実装

```bash
# 1. コンポーネントを作る
touch src/components/plot/PlotCard/PlotCard.tsx
# 2. 開発サーバーで確認しながら実装
task frontend:dev
# 3. ブラウザで見た目を確認・調整
# 4. 動作確認できたらコミット
```

**重要:** UI テストは時間がかかるため、ハッカソンでは優先度を下げる。ロジックテストに集中し、UI は目視確認で十分。
