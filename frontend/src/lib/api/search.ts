/**
 * Search Repository
 * 
 * Handles all search-related API operations with Mock/Real mode switching.
 */

import {
  apiClient,
} from "./client";
import type {
  SearchResponse,
} from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Type definitions for function parameters
interface SearchInput {
  query: string;
  tags?: string[];
  author?: string;
  limit?: number;
  offset?: number;
}

interface SuggestionsInput {
  query: string;
  limit?: number;
}

/**
 * Search plots
 */
export const search = async ({
  query,
  tags,
  author,
  limit,
  offset,
}: SearchInput): Promise<SearchResponse> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.search({ query, tags, author, limit, offset });
  }

  const searchParams = new URLSearchParams();
  if (query) searchParams.set("q", query);
  if (tags && tags.length > 0) {
    tags.forEach((tag) => searchParams.append("tag", tag));
  }
  if (author) searchParams.set("author", author);
  if (limit) searchParams.set("limit", limit.toString());
  if (offset) searchParams.set("offset", offset.toString());

  const queryString = searchParams.toString();
  const response = await apiClient<SearchResponse>(`/search${queryString ? `?${queryString}` : ""}`);
  return response;
};

/**
 * Get search suggestions
 */
export const suggestions = async ({
  query,
  limit,
}: SuggestionsInput): Promise<string[]> => {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.suggestions({ query, limit });
  }

  const searchParams = new URLSearchParams();
  if (query) searchParams.set("q", query);
  if (limit) searchParams.set("limit", limit.toString());

  const queryString = searchParams.toString();
  const response = await apiClient<string[]>(`/search/suggestions${queryString ? `?${queryString}` : ""}`);
  return response;
};

// Export as searchRepository object for consistency
export const searchRepository = {
  search,
  suggestions,
};
