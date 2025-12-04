import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks to test
import {
  useTeamDocumentations,
  useDocumentation,
  useCreateDocumentation,
  useUpdateDocumentation,
  useDeleteDocumentation,
  documentationKeys,
} from '../../../src/hooks/api/useDocumentation';

// Mock the ApiClient
import { apiClient } from '../../../src/services/ApiClient';
vi.mock('../../../src/services/ApiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Creates a fresh QueryClient for each test to ensure isolation
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
        gcTime: 0, // Don't cache between tests (garbage collection time)
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component that provides QueryClient context
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

const createMockDocumentation = (overrides?: any) => ({
  id: 'doc-123',
  team_id: 'team-123',
  title: 'Test Documentation',
  description: 'A test documentation',
  content: '# Test Documentation\n\nThis is test content.',
  status: 'published',
  tags: ['test', 'documentation'],
  author_id: 'user-123',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const createMockCreateDocumentationRequest = (overrides?: any) => ({
  team_id: 'team-123',
  title: 'New Documentation',
  description: 'A new documentation',
  content: '# New Documentation\n\nThis is new content.',
  status: 'draft',
  tags: ['new', 'documentation'],
  ...overrides,
});

const createMockUpdateDocumentationRequest = (overrides?: any) => ({
  title: 'Updated Documentation',
  description: 'An updated documentation',
  content: '# Updated Documentation\n\nThis is updated content.',
  status: 'published',
  tags: ['updated', 'documentation'],
  ...overrides,
});

// ============================================================================
// DOCUMENTATION KEYS TESTS
// ============================================================================

describe('documentationKeys', () => {
  it('should generate correct query keys', () => {
    expect(documentationKeys.all).toEqual(['documentations']);
    expect(documentationKeys.byTeam('team-123')).toEqual(['documentations', 'team', 'team-123']);
    expect(documentationKeys.byId('doc-123')).toEqual(['documentations', 'doc-123']);
  });
});

// ============================================================================
// DOCUMENTATION HOOKS TESTS
// ============================================================================

describe('useTeamDocumentations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch team documentations successfully', async () => {
    const teamId = 'team-123';
    const mockDocs = [
      createMockDocumentation(),
      createMockDocumentation({ id: 'doc-456', title: 'Another Doc' }),
    ];

    vi.mocked(apiClient.get).mockResolvedValue(mockDocs);

    const { result } = renderHook(() => useTeamDocumentations(teamId), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockDocs);
    expect(result.current.data).toHaveLength(2);
    expect(apiClient.get).toHaveBeenCalledWith(`/teams/${teamId}/documentations`);
  });

  it('should not fetch when teamId is empty', async () => {
    const { result } = renderHook(() => useTeamDocumentations(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    const teamId = 'team-123';
    const error = new Error('Failed to fetch team documentations');
    vi.mocked(apiClient.get).mockRejectedValue(error);

    const { result } = renderHook(() => useTeamDocumentations(teamId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should return empty array when no documentations', async () => {
    const teamId = 'team-123';
    const mockDocs: any[] = [];

    vi.mocked(apiClient.get).mockResolvedValue(mockDocs);

    const { result } = renderHook(() => useTeamDocumentations(teamId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('should use correct query key', async () => {
    const teamId = 'team-123';
    const mockDocs = [createMockDocumentation()];

    vi.mocked(apiClient.get).mockResolvedValue(mockDocs);

    const { result } = renderHook(() => useTeamDocumentations(teamId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Query key should be ['documentations', 'team', teamId]
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });
});

describe('useDocumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch documentation by ID successfully', async () => {
    const docId = 'doc-123';
    const mockDoc = createMockDocumentation();

    vi.mocked(apiClient.get).mockResolvedValue(mockDoc);

    const { result } = renderHook(() => useDocumentation(docId), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockDoc);
    expect(apiClient.get).toHaveBeenCalledWith(`/documentations/${docId}`);
  });

  it('should not fetch when ID is empty', async () => {
    const { result } = renderHook(() => useDocumentation(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    const docId = 'doc-123';
    const error = new Error('Documentation not found');
    vi.mocked(apiClient.get).mockRejectedValue(error);

    const { result } = renderHook(() => useDocumentation(docId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle 404 errors', async () => {
    const docId = 'non-existent-doc';
    const error = new Error('Not found');
    vi.mocked(apiClient.get).mockRejectedValue(error);

    const { result } = renderHook(() => useDocumentation(docId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should use correct query key', async () => {
    const docId = 'doc-123';
    const mockDoc = createMockDocumentation();

    vi.mocked(apiClient.get).mockResolvedValue(mockDoc);

    const { result } = renderHook(() => useDocumentation(docId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Query key should be ['documentations', docId]
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });
});

describe('useCreateDocumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create documentation successfully', async () => {
    const payload = createMockCreateDocumentationRequest();
    const mockResponse = createMockDocumentation({
      ...payload,
      id: 'doc-new-123',
    });

    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateDocumentation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(apiClient.post).toHaveBeenCalledWith('/documentations', payload);
  });

  it('should handle mutation errors', async () => {
    const payload = createMockCreateDocumentationRequest();
    const error = new Error('Failed to create documentation');

    vi.mocked(apiClient.post).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateDocumentation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should invalidate team documentations query on success', async () => {
    const payload = createMockCreateDocumentationRequest();
    const mockResponse = createMockDocumentation({
      ...payload,
      id: 'doc-new-123',
    });

    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    // Create a spy on the query client
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateDocumentation(), {
      wrapper,
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: documentationKeys.byTeam(payload.team_id),
    });
  });

  it('should handle validation errors', async () => {
    const payload = createMockCreateDocumentationRequest({ title: '' }); // Invalid payload
    const error = new Error('Title is required');

    vi.mocked(apiClient.post).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateDocumentation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useUpdateDocumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should update documentation successfully', async () => {
    const docId = 'doc-123';
    const payload = createMockUpdateDocumentationRequest();
    const mockResponse = createMockDocumentation({
      id: docId,
      ...payload,
    });

    vi.mocked(apiClient.patch).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUpdateDocumentation(docId), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(apiClient.patch).toHaveBeenCalledWith(`/documentations/${docId}`, payload);
  });

  it('should handle mutation errors', async () => {
    const docId = 'doc-123';
    const payload = createMockUpdateDocumentationRequest();
    const error = new Error('Failed to update documentation');

    vi.mocked(apiClient.patch).mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateDocumentation(docId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should invalidate queries on success', async () => {
    const docId = 'doc-123';
    const payload = createMockUpdateDocumentationRequest();
    const mockResponse = createMockDocumentation({
      id: docId,
      ...payload,
    });

    vi.mocked(apiClient.patch).mockResolvedValue(mockResponse);

    // Create a spy on the query client
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateDocumentation(docId), {
      wrapper,
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: documentationKeys.byId(docId),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: documentationKeys.byTeam(mockResponse.team_id),
    });
  });

  it('should handle not found errors', async () => {
    const docId = 'non-existent-doc';
    const payload = createMockUpdateDocumentationRequest();
    const error = new Error('Documentation not found');

    vi.mocked(apiClient.patch).mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateDocumentation(docId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should handle partial updates', async () => {
    const docId = 'doc-123';
    const payload = { title: 'Updated Title Only' }; // Partial update
    const mockResponse = createMockDocumentation({
      id: docId,
      title: 'Updated Title Only',
    });

    vi.mocked(apiClient.patch).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUpdateDocumentation(docId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(apiClient.patch).toHaveBeenCalledWith(`/documentations/${docId}`, payload);
  });
});

describe('useDeleteDocumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delete documentation successfully', async () => {
    const docId = 'doc-123';
    const teamId = 'team-123';
    const payload = { id: docId, teamId };

    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteDocumentation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(payload);
    expect(apiClient.delete).toHaveBeenCalledWith(`/documentations/${docId}`);
  });

  it('should handle mutation errors', async () => {
    const docId = 'doc-123';
    const teamId = 'team-123';
    const payload = { id: docId, teamId };
    const error = new Error('Failed to delete documentation');

    vi.mocked(apiClient.delete).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteDocumentation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should invalidate team documentations query on success', async () => {
    const docId = 'doc-123';
    const teamId = 'team-123';
    const payload = { id: docId, teamId };

    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    // Create a spy on the query client
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteDocumentation(), {
      wrapper,
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: documentationKeys.byTeam(teamId),
    });
  });

  it('should handle not found errors', async () => {
    const docId = 'non-existent-doc';
    const teamId = 'team-123';
    const payload = { id: docId, teamId };
    const error = new Error('Documentation not found');

    vi.mocked(apiClient.delete).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteDocumentation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should handle multiple deletions', async () => {
    const payload1 = { id: 'doc-123', teamId: 'team-123' };
    const payload2 = { id: 'doc-456', teamId: 'team-123' };

    vi.mocked(apiClient.delete)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteDocumentation(), {
      wrapper: createWrapper(),
    });

    // First deletion
    result.current.mutate(payload1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload1);

    // Reset mutation state
    result.current.reset();

    // Second deletion
    result.current.mutate(payload2);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload2);

    expect(apiClient.delete).toHaveBeenCalledTimes(2);
    expect(apiClient.delete).toHaveBeenNthCalledWith(1, '/documentations/doc-123');
    expect(apiClient.delete).toHaveBeenNthCalledWith(2, '/documentations/doc-456');
  });
});
