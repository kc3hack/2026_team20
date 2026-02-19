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
  "tags": ["tag1", "tag2"] (省略可)
}
```

**Response**: `201 Created` → `PlotResponse`

---

#### GET /plots/{plotId}
Plot詳細取得

**Response**: `PlotDetailResponse`

---

#### PUT /plots/{plotId}
Plot更新（要認証・作成者のみ）

**Request Body**: `UpdatePlotRequest`
```json
{
  "title": "string (max 200) (省略可)",
  "description": "string (max 2000) (省略可)",
  "tags": ["tag1", "tag2"] (省略可)
}
```

**Response**: `200 OK` → `PlotResponse`

---

#### DELETE /plots/{plotId}
Plot削除（要認証・作成者のみ）

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

### Document

#### GET /plots/{plotId}/document
ドキュメント全文取得

**Response**: `DocumentResponse`

---

#### PUT /plots/{plotId}/document
ドキュメント全文更新（要認証）

**Request Body**:
```json
{
  "content": "Markdown + 色拡張テキスト全文"
}
```

**Response**: `200 OK` → `DocumentResponse`

**Error**: `403 Forbidden` - Plotが一時停止中

---

### History

#### POST /plots/{plotId}/operations
操作ログ保存（要認証・バッチ送信対応）

Hot Operation として72時間TTLで保持される。クライアント側でバッファリングしバッチ送信する。

**Request Body**:
```json
{
  "operations": [
    {
      "operationType": "insert | delete | update",
      "position": 10,
      "content": "追加されたテキスト (省略可)",
      "length": 5,
      "timestamp": "2026-02-18T12:00:00Z"
    }
  ]
}
```

**Response**: `201 Created`

---

#### GET /plots/{plotId}/history
履歴一覧取得（72時間以内のHot Operationのみ）

**Query Parameters**:
| Parameter | Type | Default |
|-----------|------|---------|
| limit | integer | 50 |
| offset | integer | 0 |

**Response**: `HistoryListResponse`

---

#### POST /plots/{plotId}/rollback/{snapshotId}
ロールバック（要認証）

指定されたスナップショット時点のドキュメント内容に復元する。

**Response**: `200 OK` → `DocumentResponse`

**Error**: `404 Not Found` - 指定されたスナップショットが存在しない

---

#### GET /plots/{plotId}/diff/{fromSnapshotId}/{toSnapshotId}
差分取得

2つのスナップショット間のドキュメント差分を返す。

**Response**: `DiffResponse`

---

### Snapshots

#### GET /plots/{plotId}/snapshots
スナップショット一覧取得

Cold Snapshot の一覧を取得する。永続保持されたドキュメント全文スナップショット。

**Query Parameters**:
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| limit | integer | 20 | 100 |
| offset | integer | 0 | - |

**Response**: `SnapshotListResponse`

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

ドキュメント全文を含むPlot全体をコピーする。

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
  "plotId": "uuid"
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
Plot検索（PostgreSQL全文検索）

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
  "editingUsers": [
    {
      "id": "uuid",
      "displayName": "string",
      "avatarUrl": "string | null"
    }
  ],
  "createdAt": "2026-02-16T00:00:00Z",
  "updatedAt": "2026-02-16T00:00:00Z"
}
```

### PlotDetailResponse
`PlotResponse` +：
```json
{
  "document": DocumentResponse,
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

### DocumentResponse
```json
{
  "id": "uuid",
  "plotId": "uuid",
  "content": "Markdown + 色拡張テキスト全文",
  "updatedAt": "2026-02-18T00:00:00Z"
}
```

### SnapshotResponse
```json
{
  "id": "uuid",
  "plotId": "uuid",
  "content": "ドキュメント全文スナップショット",
  "createdBy": "system | userId",
  "createdAt": "2026-02-18T00:00:00Z"
}
```

### SnapshotListResponse
```json
{
  "items": [SnapshotResponse],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

### HistoryListResponse
```json
{
  "items": [
    {
      "id": "uuid",
      "plotId": "uuid",
      "operationType": "insert",
      "payload": {} | null,
      "user": { "id": "uuid", "displayName": "string", "avatarUrl": "string | null" },
      "snapshotId": "uuid | null",
      "createdAt": "2026-02-16T00:00:00Z"
    }
  ],
  "total": 50
}
```

### DiffResponse
```json
{
  "fromSnapshotId": "uuid",
  "toSnapshotId": "uuid",
  "additions": [
    { "start": 0, "end": 10, "text": "追加されたテキスト" }
  ],
  "deletions": [
    { "start": 20, "end": 30, "text": "削除されたテキスト" }
  ]
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
