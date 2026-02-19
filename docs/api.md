# Plot Platform API Specification

## 概要

- **ベースURL**: `{domain}/api/v1`
- **認証**: Supabase Auth（Bearer Token）
- **エラー形式**: `{"detail": "エラーメッセージ"}`

---

## 認証

```
Authorization: Bearer <Supabase JWT>
```

---

## Endpoints

### Plots

#### GET /plots
Plot一覧取得

**Query Parameters**:
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| tag | string | - | - | タグでフィルタ |
| limit | integer | 20 | 100 | 取得件数 |
| offset | integer | 0 | - | オフセット |

**Response**: `PlotListResponse`

---

#### POST /plots
Plot作成（要認証）

**Request Body**:
```json
{
  "title": "string (max 200)",
  "description": "string (max 2000) (省略可)",
  "tags": ["tag1", "tag2"] (省略可),
  "thumbnailUrl": "string (省略可)"
}
```

**Response**: `201 Created` → `PlotResponse`

---

#### PUT /plots/{plotId}
Plot更新（要認証・作成者のみ）

**Request Body**: `UpdatePlotRequest`
```json
{
  "title": "string (max 200) (省略可)",
  "description": "string (max 2000) (省略可)",
  "tags": ["tag1", "tag2"] (省略可),
  "thumbnailUrl": "string | null (省略可)"
}
```

**Response**: `200 OK` → `PlotResponse`

---

#### GET /plots/{plotId}
Plot詳細取得

**Response**: `PlotDetailResponse`

---

#### DELETE /plots/{plotId}
Plot削除（要認証・作成者のみ）

関連するセクション、スナップショット（`cold_snapshots`）、ロールバックログ（`rollback_logs`）、スター、スレッド・コメントは `ON DELETE CASCADE` により自動削除される。

**Response**: `204 No Content`

---

#### GET /plots/trending
急上昇Plot一覧（直近72時間のスター増加数でソート）

**Query Parameters**:
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| limit | integer | 5 | 100 |

**Response**: `PlotListResponse`

---

#### GET /plots/popular
人気Plot一覧（全期間のスター総数でソート）

**Query Parameters**:
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| limit | integer | 5 | 100 |

**Response**: `PlotListResponse`

---

#### GET /plots/new
新規Plot一覧（作成日時の降順）

**Query Parameters**:
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| limit | integer | 5 | 100 |

**Response**: `PlotListResponse`

---

### Sections

#### GET /plots/{plotId}/sections
セクション一覧取得

**Response**: `SectionListResponse`

---

#### POST /plots/{plotId}/sections
セクション作成（要認証）

**Request Body**:
```json
{
  "title": "string (max 200)",
  "content": { "type": "doc", "content": [...] } (省略可),
  "orderIndex": 1 (省略可・指定時はその位置に挿入し後続をシフト)
}
```

**Response**: `201 Created` → `SectionResponse`

**Error**:
- `400 Bad Request` - セクション数が上限（255個）に達している
- `403 Forbidden` - Plotが一時停止中

---

#### GET /sections/{sectionId}
セクション詳細取得

**Response**: `SectionResponse`

---

#### PUT /sections/{sectionId}
セクション更新（要認証）

**Request Body**:
```json
{
  "title": "string (max 200) (省略可)",
  "content": { "type": "doc", "content": [...] } (省略可)
}
```

**Response**: `200 OK` → `SectionResponse`

**Error**: `403 Forbidden` - Plotが一時停止中

---

#### DELETE /sections/{sectionId}
セクション削除（要認証）

**Response**: `204 No Content`

**Error**: `403 Forbidden` - Plotが一時停止中

---

#### POST /sections/{sectionId}/reorder
セクション並び替え（要認証）

**Request Body**:
```json
{
  "newOrder": 2
}
```

**Response**: `200 OK` → `SectionResponse`

**Error**: `403 Forbidden` - Plotが一時停止中

> **Note (Pause ポリシー)**: セクションの編集操作（作成、更新、削除、並び替え）はすべて、Plotが一時停止中の場合は `403 Forbidden` となります。読み取り（一覧取得、詳細取得）のみ可能です。

---

### History

#### POST /sections/{sectionId}/operations
操作ログ保存（要認証）

**Request Body**:
```json
{
  "operationType": "insert | delete | update",
  "position": 10 (省略可),
  "content": "追加されたテキスト (省略可)",
  "length": 5 (省略可)
}
```

**Response**: `201 Created`

---

#### GET /sections/{sectionId}/history
操作ログ一覧取得（HotOperation、72時間以内の操作ログ）

**Query Parameters**:
| Parameter | Type | Default |
|-----------|------|---------|
| limit | integer | 50 |
| offset | integer | 0 |

**Response**: `HistoryListResponse`

---

#### GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}
差分取得

**Response**: `DiffResponse`

---

#### GET /plots/{plotId}/snapshots
スナップショット一覧取得（ColdSnapshot、保持ポリシーに基づく段階的間引き：直近7日=全保持、7〜30日=1時間1個、30日以降=1日1個）

スナップショットは5分間隔バッチで自動作成される。1スナップショットあたりの最大サイズは10MB。超過したPlotのスナップショットは作成がスキップされ、ログに警告が出力される。

**Query Parameters**:
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| limit | integer | 20 | 100 |
| offset | integer | 0 | - |

**Response**: `SnapshotListResponse`

---

#### GET /plots/{plotId}/snapshots/{snapshotId}
スナップショット詳細取得（プレビュー用）

復元前にスナップショットの内容を確認するためのエンドポイント。
スナップショットに保存されたPlotのメタデータと全セクションの内容を返す。

**Response**: `200 OK` → `SnapshotDetailResponse`

**Error**:
- `404 Not Found` - スナップショットが存在しない

---

#### POST /plots/{plotId}/rollback/{snapshotId}
Plot全体ロールバック（要認証）

スナップショットからPlot全体（メタデータ + 全セクション）を復元する。
楽観的ロック（Optimistic Locking）により同時ロールバックの競合を防止する。

**Request Body** (省略可):
```json
{
  "expectedVersion": 5,
  "reason": "荒らし行為の復旧 (省略可)"
}
```

- `expectedVersion`: 現在のPlotの `version` 値。指定した場合、サーバー側の `version` と一致しなければ `409 Conflict` を返す。省略した場合はバージョンチェックを行わない。
- `reason`: ロールバック理由。監査ログ（`rollback_logs`）に記録される。

**Response**: `200 OK` → `PlotDetailResponse`

**処理フロー**:
1. `expectedVersion` が指定されている場合、`plots.version` と比較
2. 不一致の場合は `409 Conflict` を返却（他のユーザーが先にロールバック済み）
3. 一致する場合、スナップショットの内容でPlot全体を上書き
4. `plots.version` をインクリメント
5. `rollback_logs` テーブルに監査ログを記録（plot_id, snapshot_id, user_id, reason, created_at）

**セクション構成差異の処理（完全上書き方式）**:
- 現在の全セクションを削除し、スナップショットのセクション構成で完全に上書きする
- セクションIDは新規採番される（スナップショット時点のIDは保持しない）
- コメントスレッド（`threads.section_id`）はPlot単位のスレッドとして引き続きアクセス可能（`section_id` はNULL許容）
- HotOperation（旧セクションIDへの参照）は72時間TTLで自動消滅するため特別な処理不要

**Error**:
- `404 Not Found` - スナップショットが存在しない
- `403 Forbidden` - Plotが一時停止中
- `409 Conflict` - バージョン不一致（同時ロールバックの競合）

---

#### GET /plots/{plotId}/rollback-logs
ロールバック監査ログ一覧取得（要認証・Plot所有者または管理者）

ロールバック操作の監査ログを閲覧する。「誰が、いつ、どのスナップショットに復元したか」の履歴を確認できる。

**Query Parameters**:
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| limit | integer | 20 | 100 |
| offset | integer | 0 | - |

**Response**: `RollbackLogListResponse`

**Error**:
- `403 Forbidden` - Plot所有者または管理者ではない
- `404 Not Found` - Plotが存在しない

---

### Images

#### POST /images
画像アップロード（要認証）

**Request**: `multipart/form-data`
- `file`: 画像ファイル

**制限**:
- 最大ファイルサイズ: 5MB
- 許可形式: .jpg, .png, .gif, .webp
- 自動リサイズ: 最大幅1920px、アスペクト比維持

**Response**: `201 Created` → `ImageUploadResponse`

```json
{
  "url": "/api/v1/images/abc123.jpg",
  "filename": "abc123.jpg",
  "width": 1920,
  "height": 1080
}
```

---

#### GET /images/{filename}
画像取得

**Response**: `image/jpeg | image/png | image/gif | image/webp`

---

### SNS

#### GET /plots/{plotId}/stars
スター一覧取得

**Response**: `StarListResponse`

---

#### POST /plots/{plotId}/stars
スター追加（要認証）

**Response**: `201 Created`

**Error**: `409 Conflict` - 既にスター済み

---

#### DELETE /plots/{plotId}/stars
スター削除（要認証）

**Response**: `204 No Content`

**Error**: `404 Not Found` - スターしていない

---

#### POST /plots/{plotId}/fork
フォーク作成（要認証）

**Request Body**:
```json
{
  "title": "新しいPlotのタイトル（省略可）"
}
```

**Response**: `201 Created` → `PlotResponse`

---

#### POST /threads
スレッド作成（要認証）

**Request Body**:
```json
{
  "plotId": "uuid",
  "sectionId": "uuid (省略可)"
}
```

**Response**: `201 Created` → `ThreadResponse`

---

#### GET /threads/{threadId}/comments
コメント一覧取得

**Query Parameters**:
| Parameter | Type | Default |
|-----------|------|---------|
| limit | integer | 50 |
| offset | integer | 0 |

**Response**: `CommentListResponse`

---

#### POST /threads/{threadId}/comments
コメント投稿（要認証）

**Request Body**:
```json
{
  "content": "string (max 5000)",
  "parentCommentId": "uuid (省略可)"
}
```

**Response**: `201 Created` → `CommentResponse`

**Error**: `400 Bad Request` - 本文が5000文字を超えている

---

### Search

#### GET /search
Plot検索（ILIKE部分一致検索、title / description 対象）

**Query Parameters**:
| Parameter | Type | Required | Default | Max |
|-----------|------|----------|---------|-----|
| q | string | Yes | - | - |
| limit | integer | No | 20 | 100 |
| offset | integer | No | 0 | - |

**Response**: `SearchResponse`

---

### Admin

#### POST /admin/bans
ユーザーBAN（要管理者権限）

**Request Body**:
```json
{
  "plotId": "uuid",
  "userId": "uuid",
  "reason": "string (省略可)"
}
```

**Response**: `201 Created`

---

#### DELETE /admin/bans
BAN解除（要管理者権限）

**Request Body**:
```json
{
  "plotId": "uuid",
  "userId": "uuid"
}
```

**Response**: `204 No Content`

---

#### POST /plots/{plotId}/pause
編集一時停止（要管理者権限）

**Request Body**:
```json
{
  "reason": "string (省略可)"
}
```

**Response**: `200 OK`

---

#### DELETE /plots/{plotId}/pause
編集再開（要管理者権限）

**Response**: `200 OK`

---

### Auth

#### GET /auth/me
現在のユーザー情報取得（要認証）

**Response**: `UserResponse`

---

#### GET /auth/users/{username}
ユーザー情報取得

**Response**: `UserProfileResponse`

---

#### GET /auth/users/{username}/plots
ユーザーのPlot一覧

**Response**: `PlotListResponse`

---

#### GET /auth/users/{username}/contributions
ユーザーのコントリビューション一覧

**Response**: `PlotListResponse`

---

## Response Schemas

### PlotResponse
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "tags": ["string"],
  "ownerId": "uuid",
  "starCount": 42,
  "isStarred": false,
  "isPaused": false,
  "thumbnailUrl": "string | null",
  "version": 0,
  "createdAt": "2026-02-16T00:00:00Z",
  "updatedAt": "2026-02-16T00:00:00Z"
}
```

**フィールド補足**:
- `thumbnailUrl`: `ImageUploadResponse.url` の値（`/api/v1/images/{filename}` 形式）がそのまま格納される。`<img src={thumbnailUrl} />` で直接使用可能。

### PlotDetailResponse
`PlotResponse` +:
```json
{
  "sections": [SectionResponse],
  "owner": {
    "id": "uuid",
    "displayName": "string",
    "avatarUrl": "string | null"
  } | null
}
```

### PlotListResponse
```json
{
  "items": [PlotResponse],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

### SectionResponse
```json
{
  "id": "uuid",
  "plotId": "uuid",
  "title": "string",
  "content": { "type": "doc", "content": [...] } | null,
  "orderIndex": 0,
  "version": 5,
  "createdAt": "2026-02-16T00:00:00Z",
  "updatedAt": "2026-02-16T00:00:00Z"
}
```

### SectionListResponse
```json
{
  "items": [SectionResponse],
  "total": 10
}
```

### HistoryListResponse
```json
{
  "items": [
    {
      "id": "uuid",
      "sectionId": "uuid",
      "operationType": "insert",
      "payload": {} | null,
      "user": { "id": "uuid", "displayName": "string", "avatarUrl": "string | null" },
      "version": 5,
      "createdAt": "2026-02-16T00:00:00Z"
    }
  ],
  "total": 50
}
```

### DiffResponse
```json
{
  "fromVersion": 1,
  "toVersion": 2,
  "additions": [
    { "start": 0, "end": 10, "text": "追加されたテキスト" }
  ],
  "deletions": [
    { "start": 20, "end": 30, "text": "削除されたテキスト" }
  ]
}
```

### SnapshotResponse
```json
{
  "id": "uuid",
  "plotId": "uuid",
  "version": 1,
  "createdAt": "2026-02-16T00:00:00Z"
}
```

### SnapshotListResponse
```json
{
  "items": [SnapshotResponse],
  "total": 50
}
```

### SnapshotDetailResponse
```json
{
  "id": "uuid",
  "plotId": "uuid",
  "version": 1,
  "content": {
    "plot": {
      "title": "...",
      "description": "...",
      "tags": [...]
    },
    "sections": [
      {
        "id": "uuid",
        "title": "...",
        "content": { "type": "doc", "content": [...] } | null,
        "orderIndex": 0,
        "version": 5
      }
    ]
  } | null,
  "createdAt": "2026-02-16T00:00:00Z"
}
```

### RollbackLogResponse
```json
{
  "id": "uuid",
  "plotId": "uuid",
  "snapshotId": "uuid | null",
  "snapshotVersion": 5,
  "user": { "id": "uuid", "displayName": "string", "avatarUrl": "string | null" },
  "reason": "string | null",
  "createdAt": "2026-02-19T00:00:00Z"
}
```

**フィールド補足**:
- `snapshotVersion`: `rollback_logs` テーブルの `snapshot_version` カラムから直接取得。スナップショット間引き（`snapshot_id` が `SET NULL`）後もバージョン情報を保持するため、非正規化してテーブルに記録している。

### RollbackLogListResponse
```json
{
  "items": [RollbackLogResponse],
  "total": 10
}
```

### ImageUploadResponse
```json
{
  "url": "/api/v1/images/abc123.jpg",
  "filename": "abc123.jpg",
  "width": 1920,
  "height": 1080
}
```

### StarListResponse
```json
{
  "items": [
    {
      "user": { "id": "uuid", "displayName": "string", "avatarUrl": "string | null" },
      "createdAt": "2026-02-16T00:00:00Z"
    }
  ],
  "total": 42
}
```

### ThreadResponse
```json
{
  "id": "uuid",
  "plotId": "uuid",
  "sectionId": "uuid | null",
  "commentCount": 10,
  "createdAt": "2026-02-16T00:00:00Z"
}
```

### CommentResponse
```json
{
  "id": "uuid",
  "threadId": "uuid",
  "content": "string",
  "parentCommentId": "uuid | null",
  "user": { "id": "uuid", "displayName": "string", "avatarUrl": "string | null" },
  "createdAt": "2026-02-16T00:00:00Z"
}
```

### CommentListResponse
```json
{
  "items": [CommentResponse],
  "total": 50
}
```

### SearchResponse
```json
{
  "items": [PlotResponse],
  "total": 100,
  "query": "検索クエリ"
}
```

### UserResponse
```json
{
  "id": "uuid",
  "email": "string",
  "displayName": "string",
  "avatarUrl": "string | null",
  "createdAt": "2026-02-16T00:00:00Z"
}
```

### UserProfileResponse
```json
{
  "id": "uuid",
  "displayName": "string",
  "avatarUrl": "string | null",
  "plotCount": 10,
  "contributionCount": 50,
  "createdAt": "2026-02-16T00:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Validation error: title exceeds 200 characters"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "This plot is paused"
}
```

### 404 Not Found
```json
{
  "detail": "Plot not found"
}
```

### 409 Conflict
```json
{
  "detail": "Already starred"
}
```

