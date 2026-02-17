# Code Review for `31-chore-setup-fastapi-uvicorn-and-sqlalchemy-at-mainpy`

## Summary
FastAPIバックエンドの初期構成として、遅延初期化パターン・JWKS認証・SQLAlchemy接続管理・ミドルウェア構成が一通り揃っている。ハッカソン初期実装としては十分な品質であり、本番を意識した設計判断が随所に見られる。

---

## 🔍 Issues / Concerns

### 【中】`@lru_cache` によるリソース管理の落とし穴（database.py / supabase.py）

`@lru_cache` でEngine・sessionmaker・Supabaseクライアントをキャッシュしているが、**テスト時やgraceful shutdown時にキャッシュをクリアする手段がない**。

- テストでDB接続先を差し替えたい場合、`get_engine.cache_clear()` を呼ぶ必要がある
- lifespanのshutdown時にEngineの `dispose()` と `cache_clear()` を呼ぶことが推奨される

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    get_engine().dispose()
    get_engine.cache_clear()
    get_session_local.cache_clear()
```

> **リスク**: 低（ハッカソン規模では問題になりにくい）。ただし本番移行時は対応必須。

### 【中】`get_db()` の戻り値型 `Generator[Session]`

`Generator[Session]` は引数が1つだが、正確には `Generator[Session, None, None]` とすべき。型チェッカーで警告が出る可能性がある。

### 【低】`supabase.py` の `__getattr__` パターン

モジュールレベルの `__getattr__` で `supabase_client` を遅延提供するパターンは：
- IDEの補完が効かない
- `from app.supabase import supabase_client` で型情報が失われる
- チームメンバーが混乱する可能性がある

直接 `get_supabase_client()` を呼ぶ方が明示的。

### 【低】ヘルスチェックが同期関数

FastAPIでは同期関数はスレッドプールで実行される。ヘルスチェックのような軽量エンドポイントは `async def` にすべき。Kubernetes等のProbeが高頻度で叩く場合、スレッドプール枯渇のリスクがわずかにある。

### 【低】`api.py` が実質空ファイル

ルーターのincludeがすべてコメントアウトされている。意図的（段階的実装）であれば問題ないが、TODOコメントで意図を明記すると良い。

---

## ✨ Good Points

- **遅延初期化パターンの一貫性**: database.py / supabase.py ともに `@lru_cache` で統一されており、環境変数未設定時にimport段階でクラッシュしない
- **`SecretStr` の使用**: `supabase_secret_key` 等で `SecretStr` を使い、ログやtracebackへの秘密情報漏洩を防止
- **`pool_pre_ping=True`**: Supabase Transaction Pooler経由のDB接続では必須級の設定
- **SSL強制**: debug以外で `sslmode: require` を強制
- **Request IDミドルウェア**: バリデーション付きでリクエストトレーサビリティを確保
- **JWKS鍵キャッシュ（10分TTL）**: 鍵ローテーションに追従しつつ、毎リクエストでのJWKSフェッチを回避
- **`get_optional_user` の提供**: 認証任意エンドポイント用のDI関数を用意
- **例外ハンドラーの階層化**: HTTP例外・バリデーション例外・未処理例外を分けてハンドリング
- **画像ディレクトリ作成のPermissionError処理**: クラッシュせず警告のみにする判断

---

## 💡 Suggestions

| 優先度 | 提案 | 工数 |
|--------|------|------|
| 中 | lifespan shutdown時にEngine.dispose()とcache_clear()を追加 | Quick |
| 中 | `Generator[Session]` → `Generator[Session, None, None]` に修正 | Quick |
| 低 | ヘルスチェックを `async def` に変更 | Quick |
| 低 | `supabase.py` の `__getattr__` を削除し、`get_supabase_client()` 直接利用に統一 | Quick |
| 低 | `api.py` のコメントアウト部分にTODOコメントで意図を明記 | Quick |
| 後回し | CORS origins を `config.py` で管理する仕組みを追加 | Short |
| 後回し | JWKSキャッシュの更新失敗時のフォールバックを検討 | Medium |

---

**総評**: ハッカソンの初期実装としては高品質。本番運用を意識した設計判断が多く、技術的負債が少ない構成になっている。上記の指摘は大半がQuickで対応可能な軽微なものであり、ブロッカーとなる問題はない。
