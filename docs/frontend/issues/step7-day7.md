# Step 7: API 繋ぎ込み・バグ修正・最終調整（Day 7）

> [← Step 6](./step6-day6.md) | [付録 →](../08-appendix.md)

---

#### Issue #16

**タイトル:** [Infra] Mock → 実 API 繋ぎ込み + バグ修正 + 最終調整

**担当:** Dev A & Dev B（共同作業）

**内容:**

> **⚠️ このIssueが最重要。** Day 1〜6 はモックで動くUIを完成させる。Day 7 で実 API に切り替えて動作確認し、バグを潰す。

##### やること（優先順位順）

**1. API 繋ぎ込み（最優先・午前中に完了）:**
- Infisical で `NEXT_PUBLIC_USE_MOCK=true` → `false` に変更 (Dev A)
- 各リポジトリ関数が実 API と通信できることを確認 (Dev A & Dev B で分担)
- レスポンスのフィールド名差異（camelCase / snake_case）を修正 (Dev A)
- 認証トークンが API に正しく渡されることを確認 (Dev A)

**2. バグ修正（午前〜午後）:**
- 実 API 接続で発生するエラーの修正 (Dev A & Dev B)
- ページ遷移・ローディング・エラー表示の動作確認 (Dev B)
- モバイル表示の最終確認 (Dev B)

**3. 最終調整（午後）:**
- `pnpm build` がエラーなく完了することを確認
- Biome lint / format にエラーがないことを確認
- デモシナリオの通し確認: トップ → Plot 詳細 → 編集 → 保存 → スター

**4. 余裕があれば — E2E テスト:**
- 'playwright.config.ts' - 設定ファイル
- `e2e/top-page.spec.ts` — トップページ表示テスト
- `e2e/full-journey.spec.ts` — Plot 作成 → 編集 → スター → コメント

##### 最終チェックリスト
- [ ] 全ページが実 API で動作する（モックなし）
- [ ] `pnpm build` がエラーなく完了する
- [ ] Biome lint / format にエラーがない
- [ ] デモシナリオが通る
- [ ] 全ページのレスポンシブ確認 (Desktop / Mobile)
- [ ] トースト通知が成功/失敗時に表示される

##### 依存関係
- 全 Issue (#1 〜 #15)

---
