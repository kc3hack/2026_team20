import { apiUpload } from "../client";
import type { ImageUploadResponse } from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function upload(file: File, token?: string): Promise<ImageUploadResponse> {
  if (USE_MOCK) {
    const { mockImageUploadResponse } = await import("@/mocks/data/images");
    return mockImageUploadResponse;
  }
  return apiUpload<ImageUploadResponse>("/images", file, token);
}

export function getUrl(filename: string): string {
  return `/api/v1/images/${encodeURIComponent(filename)}`;
}
