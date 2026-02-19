import { apiClient } from "../client";
import type {
  CreateSectionRequest,
  ReorderSectionRequest,
  SectionListResponse,
  SectionResponse,
  UpdateSectionRequest,
} from "../types";

export async function listByPlot(
  plotId: string,
  token?: string,
): Promise<SectionListResponse> {
  return apiClient<SectionListResponse>(`/plots/${plotId}/sections`, { token });
}

export async function get(sectionId: string, token?: string): Promise<SectionResponse> {
  return apiClient<SectionResponse>(`/sections/${sectionId}`, { token });
}

export async function create(
  plotId: string,
  body: CreateSectionRequest,
  token?: string,
): Promise<SectionResponse> {
  return apiClient<SectionResponse>(`/plots/${plotId}/sections`, {
    method: "POST",
    body,
    token,
  });
}

export async function update(
  sectionId: string,
  body: UpdateSectionRequest,
  token?: string,
): Promise<SectionResponse> {
  return apiClient<SectionResponse>(`/sections/${sectionId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function remove(sectionId: string, token?: string): Promise<void> {
  return apiClient<void>(`/sections/${sectionId}`, {
    method: "DELETE",
    token,
  });
}

export async function reorder(
  sectionId: string,
  body: ReorderSectionRequest,
  token?: string,
): Promise<SectionResponse> {
  return apiClient<SectionResponse>(`/sections/${sectionId}/reorder`, {
    method: "POST",
    body,
    token,
  });
}
