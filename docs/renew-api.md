# 履歴サービス設計変更計画

> **本ドキュメントの位置づけ**: 新規作成ガイド。影響範囲に記載されたファイルの多くは未作成であり、本計画書はこれらのファイルを新規作成する際の設計指針を定めるものです。

## 前提条件

### 影響範囲ファイルの存在状況

| ファイル | ステータス | 備考 |
|---------|-----------|------|
| `backend/app/models/__init__.py` | **未作成** | ColdSnapshotモデル定義を含む。Task 1（DB設計）で作成予定 |
| `backend/app/services/history_service.py` | **未作成** | record_operation, rollback関数を含む。Task 6（履歴API）で作成予定 |
| `backend/app/services/moderation_service.py` | **未作成** | ColdSnapshot参照箇所を含む。Task 13（荒らし対策）で作成予定 |
| `backend/app/main.py` | **作成済み** | APScheduler + snapshot_scheduler統合先 |
| `backend/app/services/snapshot_scheduler.py` | **未作成** | 5分間隔バッチ処理。Task 6（履歴API）で新規作成予定 |
| `docs/plot-platform.md` | **作成済み** | 仕様書の該当箇所を更新 |
| `docs/api.md` | **作成済み** | API仕様の該当箇所を更新 |

### 実装順序の依存関係

本計画書の実装は以下のタスク完了後に行うこと:
1. **Task 1（DB設計）**: テーブルスキーマ・マイグレーションの作成
2. **Task 2（FastAPI初期化）**: プロジェクト構造・依存関係の準備
3. **Task 4（Plot CRUD）**: Plotモデルの基本実装
4. **Task 5（Section API）**: Sectionモデルの基本実装

---

## 変更概要

セクション単位のロールバックを廃止し、Plot全体のスナップショット＋ロールバックに統一する。
荒らし対策はBAN/一時停止で事前防止を基本方針とし、5分間隔のPlotスナップショットで十分な復元粒度を確保する。

### 設計変更の動機

1. **セクション単位ロールバックの複雑さ**: セクション間の整合性を保ちながらの個別ロールバックは実装・UX両面で困難
2. **荒らし対策との役割重複**: ロールバックで荒らしを「事後対処」するより、BAN/一時停止で「事前防止」する方が効果的
3. **HotOperationの役割明確化**: ロールバックのゲートキーパーではなく、72時間の操作ログ表示用データとして再定義

---

## モデル変更

### ColdSnapshot（変更）

| 変更点 | Before | After |
|--------|--------|-------|
| 外部キー | `section_id` (sections.id) | `plot_id` (plots.id) |
| content | セクション単体のコンテンツ | Plot全体のJSON（メタデータ + 全セクション） |
| 作成タイミング | `record_operation` 内でセクション更新時 | 5分間隔バッチ（APScheduler） |
| 保持期間 | 永続 | 保持ポリシーに基づく段階的間引き（下記参照） |

**ColdSnapshot 保持ポリシー**:

| 経過期間 | 保持粒度 | 説明 |
|---------|---------|------|
| 直近7日間 | 全保持 | 5分間隔のスナップショットをすべて保持（最大 2,016個/Plot） |
| 7〜30日 | 1時間に1個 | 各時間帯の最新スナップショットのみ保持 |
| 30日以降 | 1日に1個 | 各日の最新スナップショットのみ保持 |

**cleanup バッチ（snapshot_cleanup.py 新規作成）**:
- **トリガー**: APScheduler の CronTrigger（毎日午前3時）
- **処理**: 上記の保持ポリシーに基づき、不要なスナップショットを削除
- **削除対象判定**: 同一 plot_id 内で、各保持粒度の時間枠に複数のスナップショットが存在する場合、最新のもの以外を削除
- **統合先**: `backend/app/main.py` の lifespan イベントに追加（snapshot_scheduler と同居）

### plots テーブル（変更）

| 変更点 | Before | After |
|--------|--------|-------|
| `version` カラム | なし | `INTEGER DEFAULT 0`（楽観的ロック用） |

- ロールバック実行時に `version` をインクリメント
- クライアントは `expectedVersion` を送信し、サーバー側の `version` と一致しなければ `409 Conflict` を返却
- これにより2人のユーザーが同時に異なるスナップショットへロールバックしようとした場合、後発のリクエストが拒否される

**変更後の content JSON構造**:
```json
{
  "plot": {
    "title": "...",
    "description": "...",
    "tags": [...]
  },
  "sections": [
    {
      "id": "uuid",
      "title": "...",
      "content": { "type": "doc", "content": [...] },
      "order_index": 0,
      "version": 5
    }
  ]
}
```

### HotOperation（維持）

- 役割変更: ロールバック用データ → **操作ログ表示用データ**（「誰が、いつ、どこを、どう変えた」のUI表示）
- TTL: 72時間（変更なし）
- スキーマ: 変更なし

### rollback_logs（新規追加）

- 目的: ロールバック操作の監査ログ。「誰が、いつ、どのスナップショットに復元したか」を記録
- スキーマ: `(id, plot_id, snapshot_id, user_id, reason, created_at)`
- 外部キー: `plot_id` → plots.id, `snapshot_id` → cold_snapshots.id, `user_id` → users.id
- 保持期間: 永続（監査目的のため削除しない）

---

## 廃止する機能

| 機能 | エンドポイント | 理由 |
|------|---------------|------|
| セクション単位ロールバック | `POST /sections/{sectionId}/rollback/{version}` | Plot全体ロールバックに統一 |
| 1クリック復元（Task 13） | `POST /sections/{sectionId}/restore/{version}` | 同上 |

## 新設する機能

| 機能 | エンドポイント | 説明 |
|------|---------------|------|
| Plot全体ロールバック | `POST /plots/{plotId}/rollback/{snapshotId}` | スナップショットからPlot全体を復元 |
| スナップショット一覧 | `GET /plots/{plotId}/snapshots` | 利用可能なスナップショットの一覧取得 |
| スナップショット詳細 | `GET /plots/{plotId}/snapshots/{snapshotId}` | 復元前のプレビュー用。スナップショットの内容を取得 |

## 維持する機能

| 機能 | エンドポイント | 備考 |
|------|---------------|------|
| 操作ログ保存 | `POST /sections/{sectionId}/operations` | HotOperation記録用として維持 |
| 履歴一覧取得 | `GET /sections/{sectionId}/history` | 72時間操作ログ表示用として維持 |
| 差分取得 | `GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}` | 差分表示として維持 |

---

## APIエンドポイント変更一覧

| # | 変更種別 | エンドポイント | 認証 | 説明 |
|---|---------|---------------|------|------|
| 1 | **廃止** | `POST /sections/{sectionId}/rollback/{version}` | - | セクション単位ロールバック廃止 |
| 2 | **廃止** | `POST /sections/{sectionId}/restore/{version}` | - | Task 13の1クリック復元廃止 |
| 3 | **新設** | `POST /plots/{plotId}/rollback/{snapshotId}` | 要認証 | Plot全体ロールバック |
| 4 | **新設** | `GET /plots/{plotId}/snapshots` | 不要 | スナップショット一覧 |
| 5 | **新設** | `GET /plots/{plotId}/snapshots/{snapshotId}` | 不要 | スナップショット詳細（プレビュー用） |
| 6 | 維持 | `POST /sections/{sectionId}/operations` | 要認証 | 操作ログ保存 |
| 7 | 維持 | `GET /sections/{sectionId}/history` | 不要 | 履歴一覧取得 |
| 8 | 維持 | `GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}` | 不要 | 差分取得 |
| 9 | **新設** | `GET /plots/{plotId}/rollback-logs` | 要認証 | ロールバック監査ログ一覧取得 |

### 新設エンドポイント詳細

#### POST /plots/{plotId}/rollback/{snapshotId}
Plot全体ロールバック（要認証）

**Request Body** (省略可):
```json
{
  "expectedVersion": 5,
  "reason": "荒らし行為の復旧 (省略可)"
}
```

- `expectedVersion`: 楽観的ロック用。現在のPlotの `version` 値を送信し、バージョン不一致時は `409 Conflict` を返す。
- `reason`: ロールバック理由。監査ログ（`rollback_logs`）に記録される。

**Response**: `200 OK` → `PlotDetailResponse`

**処理フロー**:
1. `expectedVersion` が指定されている場合、`plots.version` と比較
2. 不一致の場合は `409 Conflict` を返却（他のユーザーが先にロールバック済み）
3. 一致する場合、スナップショットの内容でPlot全体を上書き
4. `plots.version` をインクリメント
5. `rollback_logs` テーブルに監査ログを記録（plot_id, snapshot_id, user_id, reason, created_at）

**Error**:
- `404 Not Found` - スナップショットが存在しない
- `403 Forbidden` - Plotが一時停止中
- `409 Conflict` - バージョン不一致（同時ロールバックの競合）

#### GET /plots/{plotId}/snapshots
スナップショット一覧取得

**Query Parameters**:
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| limit | integer | 20 | 100 |
| offset | integer | 0 | - |

**Response**: `SnapshotListResponse`

#### GET /plots/{plotId}/snapshots/{snapshotId}
スナップショット詳細取得（プレビュー用）

復元前にスナップショットの内容を確認するためのエンドポイント。

**Response**: `200 OK` → `SnapshotDetailResponse`

**Error**:
- `404 Not Found` - スナップショットが存在しない

### 新設レスポンススキーマ

#### SnapshotResponse
```json
{
  "id": "uuid",
  "plotId": "uuid",
  "version": 1,
  "createdAt": "2026-02-16T00:00:00Z"
}
```

#### SnapshotListResponse
```json
{
  "items": [SnapshotResponse],
  "total": 50
}
```

---

## バックエンド実装変更

### 5分間隔バッチ（snapshot_scheduler.py 新規作成）

- **トリガー**: APScheduler の IntervalTrigger（5分間隔）
- **変更検出**: `Plot.updated_at >= (now - 5分)` で直近5分に変更があったPlotを取得
- **スナップショット作成**: Plot全体（メタデータ + 全セクション）のJSONをColdSnapshotに保存
- **サイズ上限**: 1スナップショットあたり最大10MB。超過した場合はスナップショット作成をスキップし、ログに警告を出力する（`logger.warning`）
- **統合先**: `backend/app/main.py` の lifespan イベントに追加

**前提条件（重要）**: Section CRUD（作成・更新・削除）時に、親Plotの `updated_at` を必ず更新すること。これが漏れるとバッチが変更を検出できず、スナップショットが作成されない。

**`Plot.updated_at` 更新の実装方法**（いずれかを選択）:
1. **アプリケーションレベル**（推奨）: Section CRUD のサービス層で、Section変更時に `Plot.updated_at = now()` を明示的に実行
2. **DBトリガー**: `sections` テーブルの INSERT/UPDATE/DELETE トリガーで、対応する `plots.updated_at` を自動更新

> 推奨は方法1（アプリケーションレベル）。DBトリガーはデバッグが困難なため、MVPではアプリケーション層で明示的に制御する。

### record_operation の変更

- ColdSnapshot作成ロジックを**除去**（バッチに移行するため）
- HotOperation記録のみを行うシンプルな関数に変更

### rollback_to_version → rollback_plot_to_snapshot

- セクション単位ロールバックを廃止
- ColdSnapshotからPlot全体を復元する新関数に置き換え
- 復元時: スナップショットのcontentからplot metadata + 全sectionsを上書き

**セクション構成差異の処理方針（完全上書き方式）**:

スナップショット時点のセクション構成と現在のセクション構成が異なる場合（例：スナップショット時点は3セクション、現在は5セクション）、以下の方針で処理する:

1. **現在の全セクションを削除**
2. **スナップショットに含まれるセクションを新規作成**（スナップショットのセクションIDは保持しない。新しいUUIDを採番する）
3. **セクションIDの変更による影響**:
   - コメントスレッド（`threads.section_id`）: ロールバック前のセクションIDを参照しているスレッドは孤立する。ただし `threads.section_id` は NULL許容のため、Plot単位のスレッドとして引き続きアクセス可能
   - HotOperation（`hot_operations.section_id`）: 旧セクションIDを参照する操作ログは72時間TTLで自動消滅するため、特別な処理は不要

> **設計判断の根拠**: セクションIDの部分的マッチング（名前や順序での対応付け）は複雑で誤りが起きやすい。完全上書きの方がシンプルで予測可能。

---

## 既知のバグ（修正対象）

| # | 箇所 | 内容 | 重要度 |
|---|------|------|--------|
| 1 | `record_operation` L62-74 | `db.add(operation)` が重複して呼ばれている | P0 |
| 2 | `rollback_to_version` L209-224 | `filter(...)` にEllipsis（`...`）が渡されており、壊れている | P0 |
| 3 | ColdSnapshot保存タイミング | 更新前のコンテンツではなく更新後のコンテンツが保存されるバージョンズレ問題 | P1（バッチ移行で解消） |

---

## 実装優先度

| 優先度 | タスク | 工数目安 |
|--------|--------|----------|
| P0 | `record_operation` の db.add 重複 + 壊れた rollback_to_version 修正 | 15分 |
| P1 | ColdSnapshot モデル変更 (section_id → plot_id) + マイグレーション | 30分 |
| P1 | record_operation からColdSnapshot作成を除去 | 15分 |
| P1 | snapshot_scheduler.py 新規作成 + main.py統合 | 1時間 |
| P2 | rollback_to_version → rollback_plot_to_snapshot に書き換え | 1時間 |
| P2 | moderation_service.py のColdSnapshot参照箇所を改修 | 30分 |
| P3 | TTL cleanupジョブ（72時間超のHotOperation削除） | 30分 |
| P3 | Plot全体スナップショット一覧API | 30分 |

---

## 影響範囲

### 変更が必要なファイル

| ファイル | 変更内容 | ステータス |
|---------|---------|-----------|
| `backend/app/models/__init__.py` | ColdSnapshot の section_id → plot_id, plots.version 追加 | **未作成**（新規作成ガイド） |
| `backend/app/services/history_service.py` | record_operation改修、rollback関数書き換え | **未作成**（新規作成ガイド） |
| `backend/app/services/moderation_service.py` | ColdSnapshot参照箇所の改修 | **未作成**（新規作成ガイド） |
| `backend/app/main.py` | APScheduler + snapshot_scheduler統合 | **作成済み** |
| `backend/app/services/snapshot_scheduler.py` | 新規作成 | **未作成**（新規作成） |
| `backend/app/services/snapshot_cleanup.py` | 新規作成（保持ポリシーに基づくcleanupバッチ） | **未作成**（新規作成） |
| `docs/plot-platform.md` | 仕様書の該当箇所を更新 | **作成済み** |
| `docs/api.md` | API仕様の該当箇所を更新 | **作成済み** |

### 変更不要なファイル

| ファイル | 理由 |
|---------|------|
| `backend/app/api/v1/api.py` | 全コメントアウト状態、ルーター未実装 |
| `backend/app/schemas/__init__.py` | 新スキーマ追加時に変更するが、本計画書のスコープ外 |

---

## 変更履歴

| 日付 | 変更内容 | 理由 |
|------|---------|------|
| 2026-02-19 | `editingUsers` フィールドをAPIレスポンスに含めない方針を確定 | 「編集中のユーザー」はY.jsのawareness機能でクライアントサイドのみで管理するため、APIレスポンス（`PlotResponse`等）に `editingUsers` フィールドを含める必要がない。`plot-platform.md` の Task 8 の記述を修正し、Supabase Presence経由ではなくY.js awarenessで管理する旨を明記 |
