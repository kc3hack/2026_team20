import type { PlotResponse, SectionResponse, ThreadResponse, CommentResponse, HistoryEntry, DiffResponse, SearchResponse, ImageUploadResponse } from '@/lib/api/types';

// Data imports from correct paths
import { mockPlotList, filterMockPlots, getMockPlotById } from './data/plots';
import { getMockSectionsByPlotId, getMockSectionById } from './data/sections';
import { mockComments, getMockStarsByPlotId, getMockThreadsByPlotId, getMockCommentsByThreadId } from './data/sns';
import { generateMockDiff, getMockHistoryByPlotId } from './data/history';
import { searchMockPlots, getMockSuggestions } from './data/search';
import type { StarData } from './data/sns';

// Mock user (always logged in)
const mockUser = {
  id: 'user-1',
  username: 'developer1',
  display_name: 'Test User',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Generate ID
let idCounter = 1000;
function generateId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

// Check authorization (always true for mock)
export function checkPermission(): boolean {
  return true;
}

// Plot operations
export function listPlots(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  starred?: boolean;
  sort?: 'created_at' | 'updated_at' | 'title' | 'star_count';
  order?: 'asc' | 'desc';
  author?: string;
  tag?: string;
}): { items: PlotResponse[]; total: number } {
  let result = filterMockPlots({
    limit: params?.limit,
    offset: params?.offset,
    sort: params?.sort,
    order: params?.order,
    author: params?.author,
    tag: params?.tag,
  });

  if (params?.search) {
    const searchLower = params.search.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(searchLower)
    );
  }

  return { items: result, total: result.length };
}

export function getPlot(id: string): PlotResponse | undefined {
  return mockPlotList.find(p => p.id === id);
}

export function createPlot(data: {
  title: string;
  tags?: string[];
}): PlotResponse {
  const newPlot: PlotResponse = {
    id: generateId('plot'),
    title: data.title,
    description: null,
    tags: data.tags || [],
    ownerId: mockUser.id,
    starCount: 0,
    isStarred: false,
    isPaused: false,
    thumbnailUrl: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return newPlot;
}

export function updatePlot(id: string, data: {
  title?: string;
  tags?: string[];
}): PlotResponse {
  const plot = mockPlotList.find(p => p.id === id);
  if (!plot) throw new Error('Plot not found');

  return {
    ...plot,
    ...(data.title !== undefined && { title: data.title }),
    ...(data.tags !== undefined && { tags: data.tags }),
    updatedAt: new Date().toISOString(),
  };
}

export function deletePlot(id: string): void {
  // No-op for mock
}

// Section operations
export function listSections(plotId: string): SectionResponse[] {
  return getMockSectionsByPlotId(plotId).sort((a, b) => a.orderIndex - b.orderIndex);
}

export function getSection(id: string): SectionResponse | undefined {
  return getMockSectionById(id);
}

export function createSection(plotId: string, data: {
  title: string;
  content?: string;
}): SectionResponse {
  const plotSections = getMockSectionsByPlotId(plotId);
  const newSection: SectionResponse = {
    id: generateId('section'),
    plot_id: plotId,
    title: data.title,
    content: data.content ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: data.content }] }] } : null,
    orderIndex: plotSections.length,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return newSection;
}

export function updateSection(id: string, data: {
  title?: string;
  content?: string;
}): SectionResponse {
  const section = getMockSectionById(id);
  if (!section) throw new Error('Section not found');

  return {
    ...section,
    ...(data.title !== undefined && { title: data.title }),
    ...(data.content !== undefined && { content: { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: data.content }] }] } }),
    updatedAt: new Date().toISOString(),
  };
}

export function deleteSection(id: string): void {
  // No-op for mock
}

// Reorder sections
export function reorderSections(plotId: string, sectionIds: string[]): SectionResponse[] {
  const plotSections = getMockSectionsByPlotId(plotId);
  
  return sectionIds
    .map((id, index) => {
      const section = plotSections.find(s => s.id === id);
      if (!section) return null;
      return { ...section, orderIndex: index };
    })
    .filter((s): s is SectionResponse => s !== null);
}

// Thread operations
export function listThreads(plotId?: string): { items: ThreadResponse[]; total: number } {
  if (plotId) {
    const threads = getMockThreadsByPlotId(plotId);
    return { items: threads, total: threads.length };
  }
  const allThreads: ThreadResponse[] = [];
  for (const plot of mockPlotList) {
    allThreads.push(...getMockThreadsByPlotId(plot.id));
  }
  return { items: allThreads, total: allThreads.length };
}

export function getThread(id: string): ThreadResponse | undefined {
  for (const plot of mockPlotList) {
    const threads = getMockThreadsByPlotId(plot.id);
    const thread = threads.find(t => t.id === id);
    if (thread) return thread;
  }
  return undefined;
}

export function createThread(data: {
  plot_id: string;
  title: string;
}): ThreadResponse {
  const newThread: ThreadResponse = {
    id: generateId('thread'),
    plotId: data.plot_id,
    sectionId: null,
    commentCount: 0,
    createdAt: new Date().toISOString(),
  };
  return newThread;
}

export function updateThread(id: string, data: {
  title?: string;
}): ThreadResponse {
  const thread = getThread(id);
  if (!thread) throw new Error('Thread not found');

  return {
    ...thread,
  };
}

export function deleteThread(id: string): void {
  // No-op for mock
}

// Comment operations
export function listComments(threadId: string): { items: CommentResponse[]; total: number } {
  const result = getMockCommentsByThreadId(threadId);
  return { items: result, total: result.length };
}

export function getComment(id: string): CommentResponse | undefined {
  for (const [, cmts] of mockComments.entries()) {
    const comment = cmts.find(c => c.id === id);
    if (comment) return comment;
  }
  return undefined;
}

export function createComment(data: {
  thread_id: string;
  content: string;
}): CommentResponse {
  const newComment: CommentResponse = {
    id: generateId('comment'),
    thread_id: data.thread_id,
    content: data.content,
    parentCommentId: null,
    user: {
      id: mockUser.id,
      displayName: mockUser.display_name,
      avatarUrl: mockUser.avatar_url,
    },
    createdAt: new Date().toISOString(),
  };
  return newComment;
}

export function deleteComment(id: string): void {
  // No-op for mock
}

// Star operations
export function listStars(plotId?: string): StarData[] {
  if (plotId) {
    return getMockStarsByPlotId(plotId);
  }
  const allStars: StarData[] = [];
  for (const plot of mockPlotList) {
    const stars = getMockStarsByPlotId(plot.id);
    allStars.push(...stars.filter(s => s.user_id === mockUser.id));
  }
  return allStars;
}

export function addStar(plotId: string): StarData {
  const newStar: StarData = {
    id: generateId('star'),
    plot_id: plotId,
    user_id: mockUser.id,
    created_at: new Date().toISOString(),
  };
  return newStar;
}

export function removeStar(plotId: string): void {
  // No-op for mock
}

// Search operations
export function search(query: string, filters?: {
  author?: string;
  tag?: string;
}): SearchResponse {
  const plots = searchMockPlots(query, filters);
  return {
    plots,
    total: plots.length,
    query,
  };
}

// History operations
export function getHistory(plotId: string): HistoryEntry[] {
  return getMockHistoryByPlotId(plotId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function saveOperation(plotId: string, data: {
  operation: 'create' | 'update' | 'delete';
  section_id?: string;
  section_title?: string;
  description: string;
}): HistoryEntry {
  const entry: HistoryEntry = {
    id: generateId('history'),
    sectionId: data.section_id || '',
    operationType: data.operation as HistoryEntry['operationType'],
    payload: null,
    user: {
      id: mockUser.id,
      displayName: mockUser.display_name,
      avatarUrl: mockUser.avatar_url,
    },
    created_at: new Date().toISOString(),
  };
  return entry;
}

export function getDiff(plotId: string, entryId: string): DiffResponse {
  return generateMockDiff(plotId, entryId);
}

// User operations
export function getCurrentUser(): typeof mockUser {
  return mockUser;
}

// Admin operations
export function banUser(plotId: string, userId: string): void {
  // No-op for mock
}

export function unbanUser(plotId: string, userId: string): void {
  // No-op for mock
}

// Image operations
export function uploadImage(file: File): Promise<ImageUploadResponse> {
  return Promise.resolve({
    url: URL.createObjectURL(file),
    filename: file.name,
    width: 800,
    height: 600,
  });
}

export function deleteImage(url: string): void {
  // No-op for mock
}

// Reset function for testing
export function resetMockData(): void {
  idCounter = 1000;
}

// Mock service object for repository access
// All functions accept single object parameter to match repository expectations
export const mockService = {
  // Plots
  filterPlots: (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    starred?: boolean;
    sort?: 'created_at' | 'updated_at' | 'title' | 'star_count';
    order?: 'asc' | 'desc';
    author?: string;
    tag?: string;
  }) => listPlots(params),
  getPlot: (id: string) => getPlot(id),
  createPlot: (data: { title: string; tags?: string[] }) => createPlot(data),
  updatePlot: (data: { id: string; title?: string; tags?: string[] }) => 
    updatePlot(data.id, { title: data.title, tags: data.tags }),
  deletePlot: (data: { id: string }) => deletePlot(data.id),
  
  // Sections - accept single object parameter
  listSections: (data: { plotId: string }) => listSections(data.plotId),
  getSection: (data: { sectionId: string }) => getSection(data.sectionId),
  createSection: (data: { plotId: string; title: string; content?: string }) => 
    createSection(data.plotId, { title: data.title, content: data.content }),
  updateSection: (data: { sectionId: string; title?: string; content?: string }) => 
    updateSection(data.sectionId, { title: data.title, content: data.content }),
  deleteSection: (data: { sectionId: string }) => deleteSection(data.sectionId),
  reorderSections: (data: { plotId: string; section_ids: string[] }) => reorderSections(data.plotId, data.section_ids),
  
  // Threads - accept single object parameter
  listThreads: (data?: { plotId?: string; sectionId?: string }) => listThreads(data?.plotId),
  getThread: (data: { threadId: string }) => getThread(data.threadId),
  createThread: (data: { plotId: string; title: string }) => 
    createThread({ plot_id: data.plotId, title: data.title }),
  updateThread: (data: { threadId: string; title?: string }) => 
    updateThread(data.threadId, { title: data.title }),
  deleteThread: (data: { threadId: string }) => deleteThread(data.threadId),
  
  // Comments - accept single object parameter
  listComments: (data: { threadId: string }) => listComments(data.threadId),
  getComment: (data: { commentId: string }) => getComment(data.commentId),
  createComment: (data: { threadId: string; content: string }) => 
    createComment({ thread_id: data.threadId, content: data.content }),
  deleteComment: (data: { commentId: string }) => deleteComment(data.commentId),
  
  // Stars - accept single object parameter
  listStars: (data?: { plotId?: string }) => listStars(data?.plotId),
  addStar: (data: { plotId: string }) => addStar(data.plotId),
  removeStar: (data: { plotId: string }) => removeStar(data.plotId),
  toggleStar: (data: { plotId: string }) => {
    return { starred: true };
  },
  
  // Search - accept single object parameter
  search: (data: { query: string; tags?: string[]; author?: string; limit?: number; offset?: number }) => 
    search(data.query, { author: data.author }),
  suggestions: (data: { query: string; limit?: number }): string[] => 
    getMockSuggestions(data.query),
  
  // History - accept single object parameter
  listHistory: (data?: { plotId?: string; sectionId?: string; limit?: number; offset?: number }) => {
    const result = data?.plotId ? getHistory(data.plotId) : [];
    const limit = data?.limit || 20;
    const offset = data?.offset || 0;
    return { items: result.slice(offset, offset + limit), total: result.length };
  },
  saveOperation: (data: { 
    plotId: string; 
    sectionId?: string; 
    operationType: 'create' | 'update' | 'delete';
    payload?: unknown;
    description: string;
  }) => saveOperation(data.plotId, {
    operation: data.operationType,
    section_id: data.sectionId,
    description: data.description,
  }),
  getDiff: (data: { 
    historyId: string;
    plotId?: string;
    fromVersion?: number; 
    toVersion?: number;
  }) => getDiff(
    data.plotId || 'unknown',
    data.historyId
  ),
  rollback: (data: { historyId: string }) => {
    // No-op for mock - just return success
    return { success: true };
  },
  
  // Images - accept single object parameter
  uploadImage: (data: { file: File }) => uploadImage(data.file),
  deleteImage: (data: { imageId: string }) => deleteImage(data.imageId),
  
  // Reset
  resetMockData,
};
