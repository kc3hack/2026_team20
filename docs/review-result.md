# バックエンドコードレビュー結果

**レビュー日時**: 2026-02-20
**レビュー対象**: バックエンドPythonスクリプト、uv関連、git関連ファイル
**参照ドキュメント**: `docs/api.md`, `docs/renew-api.md`, `docs/plot-platform.md`, `docs/repo-version.md`

---

## 1. Auth & Core モジュール

### レビュー対象ファイル
- `backend/app/core/auth.py`
- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/app/core/supabase.py`
- `backend/app/api/v1/deps.py`
- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/api/v1/endpoints/admin.py`
- `backend/app/services/moderation_service.py`
- `backend/app/main.py`

### 重大な問題

| ID | ファイル | 問題点 | 重要度 |
|----|------|-------|----------|
| C1 | `admin.py` L19-64 | `POST /admin/bans` が api.md に記載のない `MessageResponse(detail="User banned")` を返す。ドキュメントでは `201 Created` でレスポンスボディなしとなっている。 | 中 |
| C2 | `admin.py` L68-103 | `DELETE /admin/bans` がリクエストボディを受け取る。多くの HTTP クライアントやプロキシは DELETE リクエストのボディを削除するため、不安定なパターンである。 | 中 |
| C3 | `admin.py` + `moderation_service.py` | `admin.py` が BAN ロジックで直接 DB にクエリを投げており、`moderation_service.py` を完全にバイパスしている。同一ロジックに対して 2 つの異なる実装が存在する。 | **高** |
| C4 | `moderation_service.py` | 他のファイルがモダンな `select()` パターンを使用しているのに対し、レガシーな `db.query().filter()` スタイルを使用している。コードスタイルが不一致。 | 中 |

### 型整合性の問題

| ID | 問題点 |
|----|-------|
| T1 | `POST /admin/bans` のレスポンス型不一致 — ドキュメントにない `MessageResponse` を返している |
| T2 | auth エンドポイントにおいて `PlotResponse.isStarred` が常に `false` になる（認証済みユーザーのコンテキストがないため） |
| T3 | `GET /auth/users/{username}` がユニーク制約のない `display_name` でマッチングしている — `MultipleResultsFound` エラーが発生する可能性がある |
| T5 | api.md に記載のある以下のスキーマが不足: `PlotDetailResponse`, `HistoryListResponse`, `DiffResponse`, `SnapshotResponse`, `StarListResponse`, `ThreadResponse`, `CommentResponse`, `SearchResponse` |

### 未実装機能

| ID | 問題点 |
|----|-------|
| M1 | サービス層には `POST /plots/{plotId}/pause` と `DELETE /plots/{plotId}/pause` エンドポイントが存在するが、HTTP ルーター経由で公開されていない |
| M2 | `moderation_service.is_user_banned()` が一度も呼び出されていない — BAN 制限が書き込みエンドポイントに組み込まれていない |
| M3 | Contributions エンドポイントが 72 時間の TTL を持つ `HotOperation` に依存している — 時間の経過とともにカウントがゼロになり、データが失われる |

### セキュリティ懸念

| ID | 問題点 |
|----|-------|
| S1 | 管理者ロールのチェックが JWT の `role` クレームのみに依存している — DB レベルでの検証が行われていない |
| S2 | auth エンドポイントにレート制限がない — ユーザー名の列挙が可能 |
| S5 | `config.py` のデバッグモードがデフォルトで `True` になっている — 環境変数が設定されていない場合にデバッグモードで動作する |
| S6 | **`supabase.py` L22: `SecretStr` の真偽値チェックが常に `True` になる** — 空のキーでも安全チェックをバイパスしてしまう |

### コード品質の問題

| ID | 問題点 |
|----|-------|
| Q1 | `admin.py` と `moderation_service.py` の間で BAN ロジックが重複している |
| Q2 | `moderation_service.py` が古い `db.query()` スタイルを使用している |
| Q3 | `moderation_service.py` が `HTTPException` ではなく `ValueError` を送出している — 500 エラーとして処理されてしまう |
| Q4 | `database.py` および `supabase.py` のモジュールレベルで未使用の `settings = get_settings()` が存在する |
| Q5 | `get_optional_user` が `HTTPBearer` インスタンスを再利用せず、2 つ目を作成している |
| Q6 | `main.py` のバリデーションエラーがドキュメントにある 400 ではなく 422 を返す |

### 軽微な懸念

- `database.py` の `get_db()` の戻り値の型は `Generator[Session, None, None]` であるべき
- `database.py` でデバッグ時に SSL モードがオフになっている
- `auth.py` でアルゴリズムがコメントなしで `["ES256"]` にハードコードされている
- `main.py` の OpenAPI が `/api/v1/openapi.json` に配置されている（デフォルトではないパス）

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| ドキュメント整合性 | **6/10** |
| コード品質 | **6/10** |
| セキュリティ | **7/10** |

### 優先度の高い修正 Top 3

1. **S6**: `supabase.py` の `SecretStr` チェックの修正 — `.get_secret_value()` を使用する
2. **M1**: pause/resume エンドポイントを HTTP ルーターに接続する
3. **Q1+C3**: 重複した BAN ロジックの解消 — サービス層に委譲する

---

## 2. Plot/Section/History モジュール

### レビュー対象ファイル
- `backend/app/api/v1/endpoints/plots.py`
- `backend/app/api/v1/endpoints/sections.py`
- `backend/app/api/v1/endpoints/history.py`
- `backend/app/services/plot_service.py`
- `backend/app/services/section_service.py`
- `backend/app/services/history_service.py`
- `backend/app/services/snapshot_cleanup.py`
- `backend/app/services/snapshot_scheduler.py`

### 重大な問題

| ID | ファイル | 問題点 | 重要度 |
|----|------|-------|----------|
| C1 | `plots.py` L45, `sections.py` L34 | `thumbnailUrl: str | None = ...` — Pydantic のデフォルト値としての三点リーダー（...）は、フィールドをオプショナルではなく**必須**にする。バリデーション失敗の原因となる。 | **高** |
| C2 | `section_service.py` | `create/update/delete_section` が `Plot.updated_at` を更新していない — **セクション編集時にスナップショットスケジューラーが完全に動作しない** | **致命的** |
| C3 | `history_service.py` L62-70 | 二重のバージョンインクリメント — `section_service.update_section()` と `history_service.record_operation()` の両方で `Section.version` がインクリメントされている | 中 |
| C4 | `sections.py` L78-84, L116-123 | `UnboundLocalError` の可能性 — 常に例外を送出する `_handle_service_error()` の後もコードが続行されている | 中 |

### 型整合性の問題

| ID | 問題点 |
|----|-------|
| T1 | `CreateOperationResponse` が api.md に不足 — コードはドキュメントにない `{id, version}` を返している |
| T2 | `HistoryListResponse.items[].payload` の構造がドキュメントで指定されていない |
| T3 | **`DiffResponse.additions/deletions` が文字オフセットではなく行番号を使用している** — api.md との意味的な不一致 |
| T4 | `pause_plot` エンドポイントが `UUID` ではなく `plot_id: str` を使用している |
| T5 | `pause_plot` のレスポンスが api.md と一致していない — ドキュメントにない `MessageResponse` を返している |

### 未実装機能

| ID | 問題点 |
|----|-------|
| M1 | `section_service` が `Plot.updated_at` を更新していない（C2 と同じ） |
| M2 | `title` (200) および `description` (2000) に `max_length` バリデーションがない — 不透明な `IntegrityError` が発生する可能性がある |
| M3 | `operationType` のバリデーションが不足 — `"insert | delete | update"` に対してバリデーションを行うべき |

### セキュリティ懸念

| ID | 問題点 |
|----|-------|
| S1 | **セクション操作における BAN チェックがない** — BAN されたユーザーでもセクションの CRUD 操作が可能 |
| S2 | セクションの更新・削除における所有権・認可のチェックがない |
| S3 | ロールバックエンドポイントがすべての認証済みユーザーからアクセス可能 — 所有権のチェックがない |
| S4 | `snapshot_cleanup.py` が UUID バリデーションなしで `plot_id: str | None` を受け取っている |

### コード品質の問題

| ID | 問題点 |
|----|-------|
| Q1 | `PlotDetailResponse` 定義の重複 — `plots.py` は dict を使用し、`history.py` は Pydantic モデルを定義している |
| Q2 | `UserBrief` / `_serialize_user_brief` パターンが複数のファイルで重複している |
| Q3 | `_enrich_plot` における **スターカウントの N+1 クエリ** — 100 個のプロットに対して 200 個の余分なクエリが発生する |
| Q4 | `history_service.get_history` がクエリごとに合計カウントを計算している |
| Q5 | `snapshot_scheduler.py` がコンテンツのバージョンではなく、ロールバックバージョンである `plot.version` を使用している |
| Q6 | `history.py` における未使用のインポート |

### 軽微な懸念

- `trending/popular/new` がデータベースの総数ではなく `total: len(items)` を返している — ページネーションが壊れる
- `snapshot_cleanup.py` の関数名が複数のスケジュールされたタスクを管理していることを反映していない
- `list_trending` がスターのあるプロットのみを返す — 新しいプロットが除外される
- `get_diff` の section_id 検索がロールバック後に失敗する（セクション ID が変わるため）

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| ドキュメント整合性 | **6/10** |
| コード品質 | **6/10** |
| セキュリティ | **5/10** |

### 優先度の高い修正 Top 3

1. **C2**: すべての `section_service` の変更操作に `Plot.updated_at` の更新を追加する — **スナップショット機能において致命的**
2. **C1**: `UpdatePlotRequest` / `UpdateSectionRequest` の Pydantic のデフォルト値（センチネル）を修正する
3. **S1**: セクションの CRUD 操作に BAN チェックを追加する

---

## 3. Social/Star/Search/Image モジュール

### レビュー対象ファイル
- `backend/app/api/v1/endpoints/social.py`
- `backend/app/api/v1/endpoints/stars.py`
- `backend/app/api/v1/endpoints/search.py`
- `backend/app/api/v1/endpoints/images.py`
- `backend/app/services/social_service.py`
- `backend/app/services/star_service.py`
- `backend/app/services/search_service.py`
- `backend/app/services/image_service.py`

### 重大な問題

| ID | ファイル | 問題点 | 重要度 |
|----|------|-------|----------|
| C1 | `search_service.py` L24 | **ILIKE パターンによる SQL インジェクション** — `%` および `_` ワイルドカードがエスケープされていない。パターンインジェクションによる DoS が可能。 | **高** |
| C2 | `social_service.py` L136 | **`list_comments` における N+1 クエリ** — 50 個のコメントに対して 51 個のクエリが発生する | **高** |
| C3 | `star_service.py` L34-41 | **`list_stars` における N+1 クエリ** + **ページネーションなし** — すべてのスターを返す | **高** |
| C4 | `social.py` L153 | `\"5000\" in str(e)` による脆弱なエラー判別 | 中 |
| C5 | `stars.py` L60 | 同様の脆弱なパターン — `\"Already starred\" in str(e)` | 中 |

### 型整合性の問題

| ID | 問題点 |
|----|-------|
| T2 | `CreateThreadRequest.plotId` が `UUID` ではなく `str` として型定義されている — 不正な形式の UUID が未処理の `ValueError` を引き起こす |
| T6 | `ThreadResponse.commentCount` がレイジーロードをトリガーする `len(thread.comments)` を使用している — カウントが不正確になる可能性がある |
| T7 | `ThreadResponse.createdAt` が `.isoformat()` を使用しており、`Z` サフィックスではなく `+00:00` を生成している |

### 未実装機能

| ID | 問題点 |
|----|-------|
| M1 | スター一覧にページネーションがない — すべてのスターを返す（人気のプロットでパフォーマンスリスクがある） |
| M3 | 検索結果が認証済みユーザーに対して `isStarred` を返さない — 常に `false` になる |

### セキュリティ懸念

| ID | 問題点 |
|----|-------|
| S1 | ILIKE ワイルドカードインジェクション（C1 を参照） |
| S2 | `social.py` L97-98 — 未処理の UUID パースエラーが 500 エラーを引き起こす |
| S3-S8 | **画像モジュールは模範的**: パストラバーサル防止、マジックバイト検証、高圧縮ファイル（Decompression Bomb）対策、EXIF 情報の削除 |

### コード品質の問題

| ID | 問題点 |
|----|-------|
| Q1 | `social_service.list_comments` における **N+1 クエリ** |
| Q2 | `star_service.list_stars` における **N+1 クエリ** |
| Q3 | `search_service.search_plots` におけるスターカウントの **N+1 クエリ** |
| Q4 | `social.py`, `stars.py` において Pydantic モデルではなく手動の dict シリアライズを行っている |
| Q5 | `_serialize_user_brief` ロジックが複数のファイルで重複している |
| Q6-Q7 | **`image_service.py` および `images.py` は模範的** — 適切に構造化され、包括的な検証と適切なセキュリティ対策が施されている |

### 軽微な懸念

- `social.py` でキャメルケースのフィールドに対して `# noqa: N815` を使用している — Pydantic のエイリアスを使用できる
- `thread.comments` がカウントのためだけにリスト全体をレイジーロードしている — COUNT クエリを使用すべき
- アグレッシブなキャッシュ設定 `max-age=31536000` (1 年) — UUID ベースのファイル名には適切

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| ドキュメント整合性 | **7/10** |
| コード品質 | **6/10** |
| セキュリティ | **8/10** (画像モジュールが平均を押し上げている) |

### 優先的な修正推奨事項

1. **P0**: `social_service`, `star_service`, `search_service` における N+1 クエリの修正 — JOIN を使用する
2. **P0**: `search_service.py` において ILIKE ワイルドカードをエスケープする
3. **P1**: `social.py` において UUID パースエラーを処理する
4. **P1**: 文字列ベースのエラー判別を型付き例外に置き換える
5. **P2**: シリアライズを Pydantic レスポンスモデルに統一する

---

## 全モジュールにおける重大な問題のまとめ

| 優先度 | モジュール | 問題点 | 影響 |
|----------|--------|-------|--------|
| **1** | Plot/Section/History | C2: `section_service` が `Plot.updated_at` を更新しない | スナップショット機能が完全に動作しない |
| **2** | Auth/Core | S6: `SecretStr` の空チェックが失敗しない | セキュリティバイパス |
| **3** | Social/Star/Search | C1: ILIKE ワイルドカードインジェクション | DoS 脆弱性 |
| **4** | Plot/Section/History | C1: `...` を使用した Pydantic のデフォルト値設定 | リクエストバリデーション失敗 |
| **5** | Social/Star/Search | C2/C3: N+1 クエリ | 深刻なパフォーマンス低下 |
| **6** | Auth/Core | C3: 重複した BAN ロジック | メンテナンス上の悪夢 |
| **7** | Plot/Section/History | S1: セクションの CRUD 操作に BAN チェックがない | 認可バイパス |

---

## 4. モデル & スキーマ

### レビュー対象ファイル
- `backend/app/models/__init__.py` (341 行)
- `backend/app/schemas/__init__.py` (142 行)

### 重大な問題

**問題は見つかりませんでした。** モデルとスキーマは構造的に健全です。

### 型整合性の問題

| ID | 問題点 | 重要度 |
|----|-------|----------|
| T1 | `UserResponse.id` が `str` として定義されているが、docs/api.md では `"id": "uuid"` と指定されている | 低 |
| T2 | **多くのドキュメント化されたレスポンススキーマが不足している**: `PlotDetailResponse`, `HistoryListResponse`, `HistoryItem`, `DiffResponse`, `SnapshotResponse`, `SnapshotListResponse`, `SnapshotDetailResponse`, `RollbackLogResponse`, `RollbackLogListResponse`, `ThreadResponse`, `CommentResponse`, `CommentListResponse`, `StarListResponse`, `SearchResponse`, `UserBrief` | 中 |
| T3 | `PlotListResponse` に `frozen=True` が設定されているが、他のレスポンススキーマには設定されていない — 一貫性がない | 低 |

### 未実装機能

| ID | エンティティ | ステータス |
|----|--------|--------|
| M1 | `SearchResponse` スキーマ | 不足 — インラインで構築されている可能性が高い |
| M2 | `StarListResponse` スキーマ | schemas ファイルに不足 — エンドポイントで生の dict を使用 |
| M3 | `CommentListResponse`, `ThreadResponse`, `CommentResponse` | 不足 — social.py で生の dict を使用 |
| M4 | リクエストスキーマ: `CreatePlotRequest`, `UpdatePlotRequest` など | schemas ファイルに集約されていない |
| M5 | `User.username` ユニーク検索フィールド | `display_name` にインデックスはあるが、ユニーク制約がない |

### セキュリティ懸念

| ID | 問題点 | 重要度 |
|----|-------|----------|
| S1 | `User.email` が `UserResponse` で公開されている — `GET /auth/me` には正しいが、他のエンドポイントでは漏洩のリスクがある | 低 |
| S2 | `HotOperation.user_id` が削除時に CASCADE 設定されている — 72 時間の TTL データとしては許容範囲 | 低 |
| S3 | **`RollbackLog.user_id` の CASCADE により、ユーザー削除時に監査ログが削除される** — 「永続」保持ポリシーに違反 | **中** |

### コード品質の問題

| ID | 問題点 |
|----|-------|
| Q1 | スキーマの重複 — `PlotDetailResponse`, `UserBrief` が集約されず、エンドポイントファイルで定義されている |
| Q2 | `social.py`, `stars.py` における生の dict シリアライズが FastAPI のバリデーションをバイパスしている |
| Q3 | `BanRequest` / `UnbanRequest` の UUID バリデーターがコピー＆ペーストされている — 共有すべき |
| Q4 | `PlotListResponse.frozen=True` が 1 つのスキーマにのみ恣意的に適用されている |
| Q5 | `Fork` モデルに `source_plot` および `new_plot` リレーションシップが不足 |
| Q6 | `Thread` モデルに `plot` リレーションシップが不足 |

### 軽微な懸念

- `User.display_name` に `index=True` はあるが `unique=True` がない — 曖昧な検索が行われる可能性がある
- `Plot.tags` の型が `Mapped[Any]` — `list[str]` を検討すべき
- `ColdSnapshot.content` の型が `Mapped[Any]` — `dict` を検討すべき
- `HotOperation.operation_type` に有効な値の CHECK 制約がない
- モデルに `__repr__` メソッドがない
- スキーマに `ConfigDict(from_attributes=True)` がない — 手動での変換が必要

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| ドキュメント整合性 | **6/10** |
| コード品質 | **7/10** |
| セキュリティ | **7/10** |

### 優先度の高い修正 Top 3

1. **S3**: `RollbackLog.user_id` を CASCADE から SET NULL に変更する — 監査ログを保持するため
2. **Q1/T2**: レスポンススキーマを `schemas/__init__.py` に集約する
3. **M5**: `User.display_name` にユニーク制約を追加する

---

## 5. ユーティリティ & テストフィクスチャ

### レビュー対象ファイル
- `backend/app/api/v1/utils.py` (153 行)
- `backend/app/api/v1/api.py` (33 行)
- `backend/tests/conftest.py` (278 行)
- `backend/tests/test_auth_fixtures_test.py` (187 行)

### 重大な問題

| ID | ファイル | 問題点 | 重要度 |
|----|------|-------|----------|
| C1 | `utils.py` L135 | **`section_to_response` に未定義の `Section` 型がある** — `"Section"` の前方参照が解決されない。型チェックが壊れている。 | **高** |
| C2 | `utils.py` L141 | 未使用の `from app.models import Section` インポート — デッドコード | 中 |

### 型整合性の問題

| ID | 問題点 |
|----|-------|
| T1 | エラー形式 `{"detail": "..."}` がドキュメントと一致 ✅ |
| T2 | `PlotResponse` スキーマがドキュメントと一致 ✅ |
| T3 | `SectionResponse` スキーマがドキュメントと一致 ✅ |
| T4 | エラーコード (400/403/404) がドキュメントと一致 ✅ |
| T5 | `PlotDetailResponse` ヘルパーが不足 — エンドポイントでアドホックに構築されている |

### 未実装機能

| ID | 問題点 |
|----|-------|
| M1 | `_get_section_or_404` ユーティリティがない — sections.py でパターンが重複している可能性が高い |
| M2 | 一時停止チェックのための `_require_not_paused(plot)` ユーティリティがない |
| M3 | 所有権検証のための `_require_owner` ユーティリティがない |

### セキュリティ懸念

| ID | 問題点 |
|----|-------|
| S1 | テスト用認証情報は合成されたもの（ダミー） ✅ |
| S2 | `conftest.py` の `dependency_overrides` クリーンアップが正しい ✅ |
| S3 | `_require_admin` のロールチェックはデフォルトで安全（不一致時に拒否） ✅ |

### コード品質の問題

| ID | 問題点 |
|----|-------|
| Q1 | アンダースコアプレフィックスの一貫性のなさ — `_require_admin` は「プライベート」だが、複数のファイルで使用されている |
| Q2 | ユーザーフィクスチャ作成の重複 — ほぼ同一のフィクスチャが 3 つ存在する |
| Q3 | クライアントフィクスチャ作成の重複 — ほぼ同一の `with patch(...)` ブロックが 4 つ存在する |
| Q4 | `conftest.py` L41 — 未使用の `connection_record` パラメータ |
| Q5 | テストファイルの命名: `test_auth_fixtures_test.py` — 二重の `test` プレフィックスは珍しい |

### 軽微な懸念

- `plot_to_response` のバージョンフォールバック `or 0` は防御的だが安全
- アンダースコアプレフィックスがあるにもかかわらず、ドキュメント文字列に `_require_admin` が「公開関数」として記載されている
- テストパラメータはフィクスチャのトリガーのためだけに存在（有効な pytest パターン）
- `stars.router` と `social.router` が分割されている — 理由のドキュメント化を検討すべき

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| ドキュメント整合性 | **8/10** |
| コード品質 | **7/10** |
| セキュリティ | **9/10** |

### 優先度の高い修正

1. **P0**: `Section` の未定義型を修正する — `TYPE_CHECKING` ブロックに追加する
2. **P1**: `test_auth_fixtures_test.py` → `test_auth_fixtures.py` にリネームする
3. **P2**: `_get_section_or_404`, `_require_not_paused`, `_require_owner` ユーティリティを抽出する

---

## 6. Alembic & プロジェクト構成

### レビュー対象ファイル
- `backend/alembic/env.py` (96 行)
- `backend/alembic/versions/e263b4b4cc1f_history_service_schema_changes.py` (445 行)
- `backend/pyproject.toml` (84 行)

### 重大な問題

**問題は見つかりませんでした。** マイグレーションと構成は適切に構造化されています。

### マイグレーションの問題

| ID | 問題点 | 重要度 |
|----|-------|----------|
| M1 | `plots.is_paused` にマイグレーションでは server_default があるが、モデルにはない | 低 |
| M2 | `plots.version`, `sections.order_index`, `sections.version` — 上記と同じパターン | 低 |
| M3 | **`hot_operations.created_at` にインデックスがない** — TTL クリーンアップにフルテーブルスキャンが必要 | **中** |
| M4 | クリーンアップバッチ用の `cold_snapshots.created_at` にインデックスがない | 低 |
| M5 | Trending クエリ用の `stars.created_at` にインデックスがない | 低 |
| M6 | マイグレーションファイル名 `history_service_schema_changes` と内容（すべてのテーブルを作成）の乖離 — 表面上の問題 | 低 |

### 依存関係の問題

| ID | 問題点 |
|----|-------|
| D1 | **`pytest` がメインの依存関係に含まれている** — 開発専用（dev-only）であるべき |
| D2 | 主要パッケージ (`supabase`, `sqlalchemy` など) のバージョンが固定されていない |
| D3 | `psycopg2-binary` はハッカソンとしては許容できるが、本番環境では `psycopg2` が推奨される |
| D4 | 説明のプレースホルダー: `"Add your description here"` |

### セキュリティ懸念

| ID | 問題点 |
|----|-------|
| S1 | `alembic.ini` にシークレットがハードコードされていない ✅ |
| S2 | `env.py` が環境から `DATABASE_URL_MIGRATE` / `DATABASE_URL` を正しく読み取っている ✅ |
| S3 | コネクションプーラーの違いに関する優れたドキュメントがある ✅ |

### コード品質の問題

| ID | 問題点 |
|----|-------|
| Q1 | `env.py` でのワイルドカードインポート `from app.models import *` — noqa を伴う標準的な Alembic パターン |
| Q2 | 番号付きセクションで適切に構造化されたマイグレーション ✅ |
| Q3 | 仕様に一致する正しい外部キー（FK）の `ondelete` 動作 ✅ |

### 軽微な懸念

- `tags` カラムに `JSONB` ではなく `JSON` を使用している — 将来の最適化のために検討すべき
- `plots` に非正規化された `star_count` カラムがない
- `forks.new_plot_id` にインデックスがない
- `pyproject.toml` の pytest パターンが `*_test.py` にのみ一致し、`test_*.py` に一致しない

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| マイグレーション品質 | **8/10** |
| 構成 | **7/10** |
| セキュリティ | **9/10** |

### 優先度の高い修正 Top 3

1. **D1**: `pytest` を開発依存関係に移動する
2. **M3**: TTL パフォーマンス向上のため、`hot_operations` に `created_at` インデックスを追加する
3. **D4**: `test_*.py` を含むように `python_files` パターンを修正する

---

## 7. 結合テスト Part 1

### レビュー対象ファイル
- `backend/tests/integration/auth_test.py` (102 行)
- `backend/tests/integration/search_test.py` (183 行)
- `backend/tests/integration/stars_test.py` (153 行)

### 重大な問題

**問題は見つかりませんでした。** 3 つのテストファイルはすべて適切に構造化されています。

### カバレッジの不足

| エンドポイント | テスト済み？ | 備考 |
|----------|---------|-------|
| `GET /auth/me` | ✅ | 200 + 401 |
| `GET /auth/users/{username}` | ✅ | 200 + 404 |
| `GET /auth/users/{username}/plots` | ✅ | 200 + 404 |
| `GET /auth/users/{username}/contributions` | ⚠️ | 空のレスポンスのみテスト済み — データ検証なし |
| `GET /search` | ✅ | 境界値を含む完全なカバレッジ |
| `GET /plots/{plotId}/stars` | ✅ | 200 + 404 |
| `POST /plots/{plotId}/stars` | ✅ | 201 + 409 + 404 + 401 |
| `DELETE /plots/{plotId}/stars` | ✅ | 204 + 404 + 401 |

**具体的な不足点:**
- `auth_test.py`: `avatarUrl`, `createdAt` フィールドの検証不足
- `auth_test.py`: 実際のデータを用いた contributions のテストがない
- `stars_test.py`: `StarListResponse.items[].createdAt` が一度もアサートされていない

### セキュリティテストの不足

| 不足点 | 重要度 |
|-----|----------|
| ユーザーエンドポイントに対する `unauthed_client` テストがない | 中 |
| 他ユーザーによるスター削除のテストがない | 中 |
| 無効な UUID パスパラメータのテストがない | 低 |

### コード品質の問題

| 問題点 |
|-------|
| いくつかのテストで `test_user` フィクスチャが未使用（誤解を招く） |
| `@pytest.mark.integration` マーカーがない |
| `search_test.py` が末尾にスラッシュのある `/api/v1/search/` を使用している（ドキュメントではスラッシュなし） |

### 軽微な懸念

- SQL インジェクション、Unicode、境界値テストを含む優れた検索テスト
- プロジェクトの慣習に沿った日本語のドキュメント文字列
- 負の制限値テスト (`limit=-1`) の不足

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| テストカバレッジ | **8/10** |
| テスト品質 | **8/10** |
| セキュリティ | **7/10** |

---

## 8. 結合テスト Part 2

### レビュー対象ファイル
- `backend/tests/integration/plots_test.py` (470 行)
- `backend/tests/integration/history_test.py` (482 行)
- `backend/tests/integration/social_test.py` (287 行)

### 重大な問題

| ID | ファイル | 問題点 | 重要度 |
|----|------|-------|----------|
| C1 | `plots_test.py:125-126` | `test_create_plot_title_exceeds_max` が `201` を許容しているが、`400`/`422` をアサートすべき。バリデーションバグを隠蔽している。 | **致命的** |
| C2 | `plots_test.py:153-154` | `description_exceeds_max` も同様 — `201` を許容するのは誤り | **致命的** |
| C3 | `history_test.py` | `TestPostOperations` に成功（201）のテストがない — スキップされたテストのみ | **致命的** |
| C4 | `social_test.py` | `list_comments` のリミット `le=50` が他のエンドポイント (`le=100`) と競合している | 重大 |

### カバレッジの不足

| 不足しているテスト |
|--------------|
| `POST /sections/{sectionId}/operations` → 201 成功 |
| `GET /sections/{sectionId}/history` のレスポンススキーマ検証 |
| `GET /sections/{sectionId}/diff` — `additions`/`deletions` の検証 |
| `GET /plots/{plotId}/snapshots` のページネーション |
| `POST /plots/{plotId}/rollback` — セクションの復元、バージョンのインクリメント、ログの作成 |
| `POST /plots/{plotId}/fork` — セクションのコピー、タグの保持 |
| `POST /threads` — `commentCount` フィールド |
| `PlotResponse.isStarred`, `version` フィールドの検証 |
| `PlotDetailResponse.owner` 構造の検証 |

### セキュリティテストの不足

| 不足点 |
|-----|
| ロールバックの認可（非所有者によるロールバックテスト） |
| 一時停止中のプロットのフォーク動作 |
| 削除されたスレッド/プロットへのコメント |
| 無効な UUID パスパラメータ |

### コード品質の問題

| 問題点 |
|-------|
| `ColdSnapshot` の作成がインラインで繰り返されている — フィクスチャにすべき |
| スレッド作成のボイラープレートが 6 回繰り返されている |
| `HotOperation` の作成がインラインで行われている — ヘルパーにすべき |
| `@pytest.mark.skip` テストには追跡用 Issue への参照が必要 |

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| テストカバレッジ | **6/10** |
| テスト品質 | **7/10** |
| API 整合性 | **6/10** |
| セキュリティ | **7/10** |

---

## 9. ユニットテスト

### レビュー対象ファイル
- `backend/tests/unit/history_service_test.py` (539 行)
- `backend/tests/unit/plot_service_test.py` (305 行)
- `backend/tests/unit/search_service_test.py` (267 行)
- `backend/tests/unit/social_service_test.py` (201 行)
- `backend/tests/unit/star_service_test.py` (96 行)

### 重大な問題

| ID | 問題点 | 重要度 |
|----|-------|----------|
| C1 | `record_operation` が完全にスキップされている — コアとなる書き込みパスの**テストカバレッジが 0** | **致命的** |
| C2 | `list_plots(tag=...)` のタグフィルターが完全に未テスト — テストが全く存在しない | **致命的** |
| C3 | `search_service_test.py:59` — デッドコード: プロットは作成されたがセッションに追加されていない | 中 |

### カバレッジの不足

| サービス | 関数 | ステータス |
|---------|----------|--------|
| `history_service` | `record_operation` | **なし（スキップ）** |
| `history_service` | `extract_text`, `compute_diff` | なし |
| `plot_service` | `list_plots` (タグフィルター) | **なし** |
| `plot_service` | `update_plot` 部分更新 | 部分的 |
| `section_service` | *すべての関数* | **テストファイルなし** |
| `moderation_service` | *すべての関数* | **テストファイルなし** |
| `image_service` | *すべての関数* | **テストファイルなし** |
| `snapshot_scheduler` | *すべての関数* | **テストファイルなし** |
| `snapshot_cleanup` | *すべての関数* | **テストファイルなし** |

### テストの隔離に関する問題

- すべてのテストで SQLite インメモリ DB を使用 — 有効なアプローチ
- SQLite の制限により機能の乖離が生じている (`.returning()`, `@>` 演算子など)
- `search_service_test.py:168-176` — テストボディ内での conftest からの直接インポート

### コード品質の問題

| 問題点 |
|-------|
| 3 つのクラスにわたる冗長な limit/offset テストパターン |
| スレッド作成のボイラープレートが 6 回繰り返されている |
| `test_create_plot_missing_title` の名称が紛らわしい（「不足」ではなく空文字をテストしている） |
| 脆弱な diff アサーション — 実際のコンテンツを検証していない |

### 軽微な懸念

- API 仕様への参照を含む優れたドキュメント文字列
- 優れた境界値テスト（72 時間 TTL、5000 文字制限）
- `NON_EXISTENT_PLOT_ID` 定数の使用は良い習慣

### スコア概要

| 評価項目 | スコア |
|----------|-------|
| テストカバレッジ | **5/10** |
| テスト品質 | **7/10** |
| 隔離性 | **8/10** |

---

## 最終まとめ: すべての重大な問題

| 順位 | モジュール | 問題点 | 影響 | 修正コスト |
|------|--------|-------|--------|------------|
| **1** | Plot/Section/History | `section_service` が `Plot.updated_at` を更新しない | **スナップショット機能が完全に動作しない** | 低 |
| **2** | Auth/Core | `SecretStr` の空チェックが失敗しない | **セキュリティバイパス** | 低 |
| **3** | Social/Star/Search | ILIKE ワイルドカードインジェクション | DoS 脆弱性 | 低 |
| **4** | Plot/Section/History | `...` を使用した Pydantic のデフォルト値設定 | リクエストバリデーション失敗 | 低 |
| **5** | Models/Schemas | `RollbackLog.user_id` の CASCADE 設定 | 監査トレイル違反 | 中 |
| **6** | Social/Star/Search | 3 つのサービスにおける N+1 クエリ | 深刻なパフォーマンス低下 | 中 |
| **7** | 結合テスト | `title/description_exceeds_max` テストが 201 を許容 | **バリデーションバグを隠蔽** | 低 |
| **8** | ユニットテスト | `record_operation` が完全に未テスト | コア機能のカバレッジが 0% | 高 |
| **9** | ユニットテスト | 5 つのサービスファイルにユニットテストがない | カバレッジの不足 | 高 |
| **10** | Plot/Section/History | セクションの CRUD 操作に BAN チェックがない | 認可バイパス | 低 |
| **11** | Auth/Core | 重複した BAN ロジック | メンテナンスの負担 | 中 |
| **12** | Utils | `section_to_response` で `Section` 型が未定義 | 型チェックの破損 | 低 |
| **13** | Alembic/構成 | `pytest` が本番用の依存関係に含まれている | イメージサイズの肥大化 | 低 |

---

## 推奨アクションプラン

### 即時 (P0) — 次のリリースまでに修正
1. `section_service` の変更操作に `Plot.updated_at` の更新を追加する
2. `supabase.py` の `SecretStr` チェックを `.get_secret_value()` で修正する
3. `search_service.py` において ILIKE ワイルドカードをエスケープする
4. Pydantic のデフォルト値（センチネル）を修正する (`UpdatePlotRequest`, `UpdateSectionRequest`)
5. **結合テストの修正** — `title/description_exceeds_max` は 201 ではなく 400/422 をアサートする必要がある

### 短期 (P1) — スプリント内に修正
1. `RollbackLog.user_id` のカスケードを SET NULL に変更する — 監査ログを保持するため
2. social/star/search サービスの N+1 クエリを修正する
3. レスポンススキーマを `schemas/__init__.py` に集約する
4. セクションの CRUD 操作に BAN チェックを追加する
5. utils.py の `TYPE_CHECKING` ブロックに `Section` を追加する
6. **ユニットテストの追加**: `record_operation` 用（PostgreSQL testcontainers またはモックを使用）
7. **テストファイルの作成**: `section_service`, `moderation_service`, `image_service` 用

### 中期 (P2) — 技術的負債
1. 重複した BAN ロジックの解消（サービス層への委譲）
2. pause/resume エンドポイントを HTTP ルーターに接続する
3. `pytest` を開発依存関係に移動する
4. TTL/クリーンアップクエリ用のデータベースインデックスを追加する
5. シリアライズを Pydantic レスポンスモデルに統一する
6. `User.display_name` にユニーク制約を追加する
7. ColdSnapshot, Thread, HotOperation 作成用のテストフィクスチャを抽出する
8. 結合テストに詳細なスキーマ検証のアサーションを追加する
9. `@pytest.mark.integration` マーカーを追加する

---

*レビュー完了: 2026-02-20*
*すべてのバックエンド Python ファイル、uv 関連ファイル、および git 関連ファイルがレビューされました。*
*レビュー済みファイル総数: 52 個の Python ファイル、1 個の TOML ファイル、4 個のドキュメントファイル*
