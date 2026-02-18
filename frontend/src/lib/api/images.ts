/**
 * Images Repository
 * 
 * Handles all image-related API operations with Mock/Real mode switching.
 */

import {
  apiUpload,
  apiClient,
} from "./client";
import type {
  ImageUploadResponse,
} from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Type definitions for function parameters
interface UploadImageInput {
  file: File;
  plotId?: string;
}

interface DeleteImageInput {
  imageId: string;
}

/**
 * Upload an image
 */
export const uploadImage = async ({
  file,
  plotId,
}: UploadImageInput): Promise<ImageUploadResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.uploadImage({ file });
  }

  const formData = new FormData();
  formData.append("file", file);
  if (plotId) {
    formData.append("plotId", plotId);
  }

  const response = await apiUpload<ImageUploadResponse>("/images", file);
  return response;
};

/**
 * Delete an image
 */
export const deleteImage = async ({
  imageId,
}: DeleteImageInput): Promise<void> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    await mockService.deleteImage({ imageId });
    return;
  }

  await apiClient<void>(`/images/${imageId}`, {
    method: "DELETE",
  });
};

// Export as imageRepository object for consistency
export const imageRepository = {
  upload: uploadImage,
  delete: deleteImage,
};
