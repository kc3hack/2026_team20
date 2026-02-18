/**
 * Section Repository
 * 
 * Handles all section-related API operations with Mock/Real mode switching.
 */

import {
  apiClient,
} from "./client";
import type {
  SectionResponse,
  SectionListResponse,
  CreateSectionRequest,
  UpdateSectionRequest,
  ReorderSectionRequest,
} from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Type definitions for function parameters
interface ListSectionsParams {
  plotId: string;
}

interface CreateSectionInput {
  plotId: string;
  title: string;
  content: string;
}

interface UpdateSectionInput {
  sectionId: string;
  title?: string;
  content?: string;
}

interface ReorderSectionInput {
  plotId: string;
  sectionIds: string[];
}

interface DeleteSectionInput {
  sectionId: string;
  plotId: string;
}

interface GetSectionInput {
  sectionId: string;
}

/**
 * List all sections for a plot
 */
export const listSections = async ({
  plotId,
}: ListSectionsParams): Promise<SectionListResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    const items = mockService.listSections({ plotId });
    return { items, total: items.length };
  }

  const response = await apiClient<SectionListResponse>(`/plots/${plotId}/sections`);
  return response;
};

/**
 * Create a new section
 */
export const createSection = async ({
  plotId,
  title,
  content,
}: CreateSectionInput): Promise<SectionResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.createSection({ plotId, title, content });
  }

  const body: CreateSectionRequest = {
    title,
    content,
  };

  const response = await apiClient<SectionResponse>(`/plots/${plotId}/sections`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response;
};

/**
 * Get a single section by ID
 */
export const getSection = async ({
  sectionId,
}: GetSectionInput): Promise<SectionResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    const section = mockService.getSection({ sectionId });
    if (!section) throw new Error(`Section ${sectionId} not found`);
    return section;
  }

  const response = await apiClient<SectionResponse>(`/sections/${sectionId}`);
  return response;
};

/**
 * Update a section
 */
export const updateSection = async ({
  sectionId,
  title,
  content,
}: UpdateSectionInput): Promise<SectionResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.updateSection({ sectionId, title, content });
  }

  const body: UpdateSectionRequest = {
    title,
    content,
  };

  const response = await apiClient<SectionResponse>(`/sections/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return response;
};

/**
 * Delete a section
 */
export const deleteSection = async ({
  sectionId,
}: DeleteSectionInput): Promise<void> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    mockService.deleteSection({ sectionId });
    return;
  }

  await apiClient<void>(`/sections/${sectionId}`, {
    method: "DELETE",
  });
};

/**
 * Reorder sections within a plot
 */
export const reorderSections = async ({
  plotId,
  sectionIds,
}: ReorderSectionInput): Promise<SectionListResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    const items = mockService.reorderSections({ plotId, section_ids: sectionIds });
    return { items, total: items.length };
  }

  const body: ReorderSectionRequest = {
    section_ids: sectionIds,
  };

  const response = await apiClient<SectionListResponse>(`/plots/${plotId}/sections/reorder`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response;
};

// Export as sectionRepository object for consistency
export const sectionRepository = {
  list: listSections,
  create: createSection,
  get: getSection,
  update: updateSection,
  delete: deleteSection,
  reorder: reorderSections,
};
