# フロントエンド開発計画書

> **プロダクト:** Plot Platform — 「架空の欲しいもの」をみんなで作り上げる Wiki 共同編集プラットフォーム
> **期間:** 1 週間（7 日間）
> **フロントエンド開発者:** 2 名（Dev A / Dev B）
> **フレームワーク:** Next.js (App Router) + TypeScript

---

## ドキュメント一覧

### 基本ルール・設計方針

| ドキュメント | 内容 |
|-------------|------|
| [ハッカソン鉄則](./00-hackathon-rules.md) | 全員必読の 8 つのルール |
| [技術スタック](./01-tech-stack.md) | 使用ライブラリ・バージョン・インストールコマンド |
| [ディレクトリ構造](./02-directory-structure.md) | ディレクトリツリー・設計原則・型定義ファイルの使い分け |

### 共通設計方針

| ドキュメント | 内容 |
|-------------|------|
| [コンポーネント設計](./03-component-design.md) | shadcn/ui ファーストの原則・コンポーネント一覧・カスタマイズ方法 |
| [API 抽象化戦略](./04-api-architecture.md) | 3 層レイヤー設計・HTTP クライアント・型定義・リポジトリ・Hook のコード例 |
| [スタイリング戦略](./05-styling-guide.md) | SCSS ファースト方針・Tailwind との使い分け・レスポンシブデザイン |
| [テスト戦略](./06-testing-strategy.md) | テストピラミッド・TDD vs プレビュー駆動・Mock 戦略 |

### 開発タイムライン・Issue

| ドキュメント | 内容 |
|-------------|------|
| [開発タイムライン](./07-development-timeline.md) | 7 日間のスケジュール・コンフリクト回避ルール・開発フロー注意点 |
| [Step 1 (Day 1)](./issues/step1-day1.md) | Issue #1〜#5: 環境構築・API基盤・リポジトリ・Auth・デザイン基盤 |
| [Step 2 (Day 2)](./issues/step2-day2.md) | Issue #6〜#7: トップページ・Plot 詳細ページ |
| [Step 3 (Day 3)](./issues/step3-day3.md) | Issue #8〜#9: 認証フロー・Tiptap エディタ |
| [Step 4 (Day 4)](./issues/step4-day4.md) | Issue #10〜#11: 検索・Plot 作成・SNS 機能 |
| [Step 5 (Day 5)](./issues/step5-day5.md) | Issue #12〜#13: プロフィール・履歴・復元 |
| [Step 6 (Day 6)](./issues/step6-day6.md) | Issue #14〜#15: 画像・モバイル仕上げ・エラーハンドリング |
| [Step 7 (Day 7)](./issues/step7-day7.md) | Issue #16: API 繋ぎ込み・バグ修正・最終調整 |

### 付録・参考資料

| ドキュメント | 内容 |
|-------------|------|
| [付録](./08-appendix.md) | コミット規約・環境変数一覧・Issue 依存関係図・shadcn/ui コンポーネント一覧 |
| [Mock ファースト開発](./09-mock-development.md) | 環境変数設定・Mock データ実装パターン・認証フロー・切り替え手順 |

---

*最終更新: 2026-02-16*
