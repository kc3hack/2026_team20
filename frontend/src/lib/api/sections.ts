import { apiClient } from "./client";
import type {
  SectionResponse,
  SectionListResponse,
  CreateSectionRequest,
  UpdateSectionRequest,
} from "./types";
import type { Content } from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const sectionRepository = {
  /**
   * セクション一覧取得
   * GET /plots/{plotId}/sections
   */
  async list(params: { plotId: string }): Promise<SectionListResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      const items = mockService.listSections({ plotId: params.plotId });
      return { items, total: items.length };
    }

    return apiClient<SectionListResponse>(
      `/plots/${params.plotId}/sections`,
      {},
    );
  },

  /**
   * セクション作成
   * POST /plots/{plotId}/sections
   */
  async create(params: {
    plotId: string;
    title: string;
    content?: Content;
  }): Promise<SectionResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.createSection({
        plotId: params.plotId,
        title: params.title,
        content: params.content ? JSON.stringify(params.content) : undefined,
      });
    }

    const body: CreateSectionRequest = {
      title: params.title,
      content: params.content,
    };

    return apiClient<SectionResponse>(`/plots/${params.plotId}/sections`, {
      method: "POST",
      // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: body as any,
    });
  },

  /**
   * セクション詳細取得
   * GET /sections/{sectionId}
   */
  async get(params: { sectionId: string }): Promise<SectionResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      const section = mockService.getSection({ sectionId: params.sectionId });
      if (!section) throw new Error(`Section ${params.sectionId} not found`);
      return section;
    }

    return apiClient<SectionResponse>(
      `/sections/${params.sectionId}`,
      {},
    );
  },

  /**
   * セクション更新
   * PUT /sections/{sectionId}
   */
  async update(params: {
    sectionId: string;
    title?: string;
    content?: Content;
  }): Promise<SectionResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.updateSection({
        sectionId: params.sectionId,
        title: params.title,
        content: params.content ? JSON.stringify(params.content) : undefined,
      });
    }

    const body: UpdateSectionRequest = {
      title: params.title,
      content: params.content ? JSON.stringify(params.content) : undefined,
    };

    return apiClient<SectionResponse>(`/sections/${params.sectionId}`, {
      method: "PUT",
      // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: body as any,
    });
  },

  /**
   * セクション削除
   * DELETE /sections/{sectionId}
   */
  async delete(params: { sectionId: string }): Promise<void> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      mockService.deleteSection({ sectionId: params.sectionId });
      return;
    }

    await apiClient<void>(`/sections/${params.sectionId}`, {
      method: "DELETE",
    });
  },

  /**
   * セクション並び替え
   * POST /sections/{sectionId}/reorder
   */
  async reorder(params: {
    sectionId: string;
    newOrder: number;
  }): Promise<void> {
    if (isMock) {
      return;
    }

    await apiClient<void>(`/sections/${params.sectionId}/reorder`, {
      method: "POST",
      // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: { newOrder: params.newOrder } as any,
    });
  },
};
