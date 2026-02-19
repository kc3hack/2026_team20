import { apiUpload } from "../client";
import type { ImageUploadResponse } from "../types";

export async function upload(file: File, token?: string): Promise<ImageUploadResponse> {
  return apiUpload<ImageUploadResponse>("/images", file, token);
}

export function getUrl(filename: string): string {
  return `/api/v1/images/${filename}`;
}
