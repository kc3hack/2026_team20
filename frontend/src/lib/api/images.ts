import { apiUpload } from "./client";
import type { ImageUploadResponse } from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const imageRepository = {
  /**
   * 画像アップロード
   * POST /images
   */
  async upload(params: { file: File }): Promise<ImageUploadResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.uploadImage({ file: params.file });
    }

    return apiUpload<ImageUploadResponse>("/images", params.file);
  },

  /**
   * 画像URL構築
   * GET /images/{filename} に対応するURLを返す
   */
  getImageUrl(filename: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    return `${baseUrl}/images/${filename}`;
  },
};
