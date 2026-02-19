export const APP_CONFIG = {
  GITHUB_URL: "https://github.com/kc3hack/2026_team20",
} as const;

// TODO: 他の定数は各機能実装時に担当者が追加

/** 一覧取得時のデフォルト件数 (TODO: API仕様に基づき調整) */
export const PAGE_SIZE = 20;

/** Plot・Section タイトルの最大文字数 (TODO: POST /plots, /sections で使用) */
export const MAX_TITLE_LENGTH = 200;

/** Plot 説明文の最大文字数 (TODO: POST /plots で使用) */
export const MAX_DESCRIPTION_LENGTH = 2000;

/** コメントの最大文字数 (TODO: POST /comments で使用) */
export const MAX_COMMENT_LENGTH = 5000;
