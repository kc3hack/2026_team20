# 付録

## A. コミットメッセージ規約

```
<type>(<scope>): <summary>

type: feat | fix | chore | refactor | test | docs | style
scope: api | auth | plot | section | editor | sns | search | history | user | layout | infra
```

例:
- `feat(api): add API client layer and repository pattern`
- `feat(plot): add PlotCard component with hover animation`
- `feat(auth): implement OAuth login flow`
- `test(e2e): add top page and auth flow tests`
- `chore(infra): configure TanStack Query provider`

## B. 環境変数

> **環境変数は Infisical で管理します。** 以下は設定すべき変数の一覧です。

```env
# Infisical で設定する環境変数
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_USE_MOCK=true  # Day 1〜6: true / Day 7（API繋ぎ込み）: false
```

詳細な環境変数の設定手順は [Mock ファースト開発](./09-mock-development.md#e1-環境変数設定) を参照。

## C. Issue 依存関係図

```
Issue #1 (環境構築・設定) ──▶ Issue #2 (HTTP Client/型) ──▶ Issue #3 (リポジトリ/Mock) ──┬──▶ Issue #6 (トップページ) ──▶ Issue #10 (検索・作成)
         │                          │                                                        │                                      │
         └──────────────────────────┴──▶ Issue #4 (Auth/Supabase) ─────────────────────┐    │
                                                                                         │    │
Issue #5 (デザイン基盤) ──────────────────────────────────────────────────────────────┼────┼──▶ Issue #7 (Plot詳細) ──────▶ Issue #13 (履歴)
                                                                                         │    │                                      │
                                                                                         └────┼──▶ Issue #8 (認証) ──────────▶ Issue #12 (プロフィール)
                                                                                              │                                      │
                                                                                              └──▶ Issue #9 (エディタ) ──────▶ Issue #11 (SNS)
                                                                                                          │
                                                                                                          └──────────────────▶ Issue #14 (画像・モバイル)

Issue #15 (エラー/ローディング) は全 Issue の改善として並行可能
Issue #16 (API繋ぎ込み) は全 Issue 完了後の Day 7

Day 1 の並行作業:
  Dev A: #1(確認) → #2(午前) → #3(午後)
  Dev B: #5 + #4(#2 merge 後に着手)
```

## D. shadcn/ui で最初にインストールすべきコンポーネント一覧

```bash
pnpm dlx shadcn@latest add \
  button card input textarea label \
  badge avatar skeleton separator \
  dropdown-menu dialog sheet \
  tabs tooltip form sonner \
  scroll-area select
```
