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
  "description": "string (max 2000)",
  "tags": ["tag1", "tag2"]
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
  "content": { "type": "doc", "content": [...] }
}
```

**Response**: `201 Created` → `SectionResponse`

**Error**: `400 Bad Request` - セクション数が上限（255個）に達している

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
  "title": "string (max 200)",
  "content": { "type": "doc", "content": [...] }
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

**Response**: `200 OK`

---

### History

#### POST /sections/{sectionId}/operations
操作ログ保存（要認証）

**Request Body**:
```json
{
  "operationType": "insert | delete | update",
  "position": 10,
  "content": "追加されたテキスト",
  "length": 5
}
```

**Response**: `201 Created`

---

#### GET /sections/{sectionId}/history
履歴一覧取得（72時間以内のみ）

**Query Parameters**:
| Parameter | Type | Default |
|-----------|------|---------|
| limit | integer | 50 |
| offset | integer | 0 |

**Response**: `HistoryListResponse`

---

#### POST /sections/{sectionId}/rollback/{version}
ロールバック（要認証・72時間以内のみ）

**Response**: `200 OK` → `SectionResponse`

**Error**: `400 Bad Request` - 72時間以上前のバージョンはロールバック不可

---

#### GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}
差分取得

**Response**: `DiffResponse`

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
  "reason": "string"
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
  "reason": "string"
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
  "description": "string",
  "tags": ["string"],
  "ownerId": "uuid",
  "starCount": 42,
  "isStarred": false,
  "isPaused": false,
  "editingUsers": [
    {
      "id": "uuid",
      "displayName": "string",
      "avatarUrl": "string",
      "sectionId": "uuid"
    }
  ],
  "createdAt": "2026-02-16T00:00:00Z",
  "updatedAt": "2026-02-16T00:00:00Z"
}
```

### PlotDetailResponse
`PlotResponse` +:
```json
{
  "sections": [SectionResponse],
  "owner": {
    "id": "uuid",
    "displayName": "string",
    "avatarUrl": "string"
  }
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
  "content": { "type": "doc", "content": [...] },
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
      "payload": {},
      "user": { "id": "uuid", "displayName": "string", "avatarUrl": "string" },
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
      "user": { "id": "uuid", "displayName": "string", "avatarUrl": "string" },
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
  "sectionId": "uuid",
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
  "parentCommentId": "uuid",
  "user": { "id": "uuid", "displayName": "string", "avatarUrl": "string" },
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
  "avatarUrl": "string",
  "createdAt": "2026-02-16T00:00:00Z"
}
```

### UserProfileResponse
```json
{
  "id": "uuid",
  "displayName": "string",
  "avatarUrl": "string",
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

