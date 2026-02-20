import { apiClient } from "../client";
import type {
  CreateSectionRequest,
  ReorderSectionRequest,
  SectionListResponse,
  SectionResponse,
  UpdateSectionRequest,
} from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function listByPlot(plotId: string, token?: string): Promise<SectionListResponse> {
  if (USE_MOCK) {
    const { mockSections } = await import("@/mocks/data/sections");
    const items = mockSections.filter((s) => s.plotId === plotId);
    return { items, total: items.length };
  }
  return apiClient<SectionListResponse>(`/plots/${plotId}/sections`, { token });
}

export async function get(sectionId: string, token?: string): Promise<SectionResponse> {
  if (USE_MOCK) {
    const { mockSections } = await import("@/mocks/data/sections");
    const section = mockSections.find((s) => s.id === sectionId);
    if (!section) throw new Error(`Section not found: ${sectionId}`);
    return section;
  }
  return apiClient<SectionResponse>(`/sections/${sectionId}`, { token });
}

export async function create(
  plotId: string,
  body: CreateSectionRequest,
  token?: string,
): Promise<SectionResponse> {
  if (USE_MOCK) {
    return {
      id: `mock-section-${Date.now()}`,
      plotId,
      title: body.title,
      content: body.content ?? null,
      orderIndex: body.orderIndex ?? 0,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
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
  if (USE_MOCK) {
    const { mockSections } = await import("@/mocks/data/sections");
    const existing = mockSections.find((s) => s.id === sectionId) ?? mockSections[0];
    return {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };
  }
  return apiClient<SectionResponse>(`/sections/${sectionId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function remove(sectionId: string, token?: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
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
  if (USE_MOCK) {
    const { mockSections } = await import("@/mocks/data/sections");
    const existing = mockSections.find((s) => s.id === sectionId) ?? mockSections[0];
    return {
      ...existing,
      orderIndex: body.newOrder,
      updatedAt: new Date().toISOString(),
    };
  }
  return apiClient<SectionResponse>(`/sections/${sectionId}/reorder`, {
    method: "POST",
    body,
    token,
  });
}
