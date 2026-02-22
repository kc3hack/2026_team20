# 1. 依存関係のインストールとビルド (Builder Stage)
FROM node:20-alpine AS builder

WORKDIR /app

# pnpmのインストール
RUN corepack enable pnpm

# パッケージ定義ファイルをコピー
COPY package.json pnpm-lock.yaml ./

# 依存関係のインストール
RUN pnpm install --frozen-lockfile

# ソースコードをコピーしてビルド
COPY . .
RUN pnpm build

# 2. 本番実行環境 (Runner Stage)
FROM node:20-alpine AS runner

WORKDIR /app

# プロダクション環境に設定
ENV NODE_ENV=production
# Next.js のテレメトリ無効化 (任意)
ENV NEXT_TELEMETRY_DISABLED=1

# セキュリティのため、非rootユーザーを作成して実行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Publicディレクトリの静的ファイルをコピー
COPY --from=builder /app/public ./public

# standaloneビルドされた出力ファイルをコピー (Next.js 側で設定済み前提)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ユーザーの切り替え
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# standaloneモードのエントリーポイントを実行
CMD ["node", "server.js"]
