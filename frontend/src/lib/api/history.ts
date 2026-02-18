/**
 * History Repository
 *
 * Handles all history-related API operations with Mock/Real mode switching.
 */

import { apiClient } from "./client";
import type {
  HistoryListResponse,
  HistoryEntry,
  DiffResponse,
} from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Type definitions for function parameters
interface ListHistoryInput {
  plot_id: string;
  section_id?: string;
  limit?: number;
  offset?: number;
}

interface SaveOperationInput {
  plot_id: string;
  section_id?: string;
  operation_type: "create" | "update" | "delete";
  payload: Record<string, unknown>;
}

interface GetDiffInput {
  history_id: string;
}

interface RollbackInput {
  history_id: string;
}

/**
 * List history entries for a plot
 */
export const listHistory = async ({
  plot_id,
  section_id,
  limit,
  offset,
}: ListHistoryInput): Promise<HistoryListResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.listHistory({ plotId: plot_id, sectionId: section_id, limit, offset });
  }

  const searchParams = new URLSearchParams();
  if (section_id) searchParams.set("section_id", section_id);
  if (limit) searchParams.set("limit", limit.toString());
  if (offset) searchParams.set("offset", offset.toString());

  const queryString = searchParams.toString();
  const response = await apiClient<HistoryListResponse>(`/plots/${plot_id}/history${queryString ? `?${queryString}` : ""}`);
  return response;
};

/**
 * Save an operation to history
 */
export const saveOperation = async ({
  plot_id,
  section_id,
  operation_type,
  payload,
}: SaveOperationInput): Promise<HistoryEntry> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.saveOperation({
      plotId: plot_id,
      sectionId: section_id,
      operationType: operation_type,
      description: `Operation: ${operation_type}`,
    });
  }

  const body = {
    section_id,
    operation_type,
    payload,
  };

  const response = await apiClient<HistoryEntry>(`/plots/${plot_id}/history`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response;
};

/**
 * Get diff for a history entry
 */
export const getDiff = async ({
  history_id,
}: GetDiffInput): Promise<DiffResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.getDiff({ historyId: history_id });
  }

  const response = await apiClient<DiffResponse>(`/history/${history_id}/diff`);
  return response;
};

/**
 * Rollback to a history entry
 */
export const rollback = async ({
  history_id,
}: RollbackInput): Promise<void> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    mockService.rollback({ historyId: history_id });
    return;
  }

  await apiClient<void>(`/history/${history_id}/rollback`, {
    method: "POST",
  });
};

// Export as historyRepository object for consistency
export const historyRepository = {
  list: listHistory,
  saveOperation,
  getDiff,
  rollback,
};
