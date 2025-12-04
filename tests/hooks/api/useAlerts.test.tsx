import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks to test
import { useAlerts, useCreateAlertPR } from '../../../src/hooks/api/useAlerts';

// Mock the AlertsApi service
import { fetchAlerts, createAlertPR } from '../../../src/services/AlertsApi';
vi.mock('../../../src/services/AlertsApi', () => ({
  fetchAlerts: vi.fn(),
  createAlertPR: vi.fn(),
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

const createMockAlert = (overrides?: any) => ({
  id: 'alert-123',
  name: 'Test Alert',
  description: 'A test alert',
  severity: 'warning',
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const createMockAlertFile = (overrides?: any) => ({
  path: 'alerts/test-alert.yaml',
  content: 'alert: test',
  sha: 'abc123',
  ...overrides,
});

const createMockAlertsResponse = (overrides?: any) => ({
  alerts: [createMockAlert(), createMockAlert({ id: 'alert-456', name: 'Another Alert' })],
  files: [createMockAlertFile()],
  total: 2,
  ...overrides,
});

const createMockCreateAlertPRPayload = (overrides?: any) => ({
  title: 'Add new alert',
  description: 'Adding a new monitoring alert',
  files: [
    {
      path: 'alerts/new-alert.yaml',
      content: 'alert: new-alert',
    },
  ],
  ...overrides,
});

const createMockCreateAlertPRResponse = (overrides?: any) => ({
  pr_url: 'https://github.com/example/repo/pull/123',
  pr_number: 123,
  status: 'created',
  ...overrides,
});

// ============================================================================
// ALERTS HOOKS TESTS
// ============================================================================

describe('useAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch alerts successfully', async () => {
    const projectId = 'project-123';
    const mockResponse = createMockAlertsResponse();

    vi.mocked(fetchAlerts).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAlerts(projectId), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.alerts).toHaveLength(2);
    expect(fetchAlerts).toHaveBeenCalledWith(projectId);
  });

  it('should not fetch when projectId is empty', async () => {
    const { result } = renderHook(() => useAlerts(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchAlerts).not.toHaveBeenCalled();
  });

  it('should not fetch when projectId is undefined', async () => {
    const { result } = renderHook(() => useAlerts(undefined as any), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchAlerts).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    const projectId = 'project-123';
    const error = new Error('Failed to fetch alerts');
    vi.mocked(fetchAlerts).mockRejectedValue(error);

    const { result } = renderHook(() => useAlerts(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should return empty alerts array when no data', async () => {
    const projectId = 'project-123';
    const mockResponse = createMockAlertsResponse({
      alerts: [],
      files: [],
      total: 0,
    });

    vi.mocked(fetchAlerts).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAlerts(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.alerts).toHaveLength(0);
    expect(result.current.data?.total).toBe(0);
  });

  it('should use correct query key', async () => {
    const projectId = 'project-123';
    const mockResponse = createMockAlertsResponse();

    vi.mocked(fetchAlerts).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAlerts(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Query key should be ['alerts', projectId]
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });
});

describe('useCreateAlertPR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create alert PR successfully', async () => {
    const projectId = 'project-123';
    const payload = createMockCreateAlertPRPayload();
    const mockResponse = createMockCreateAlertPRResponse();

    vi.mocked(createAlertPR).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateAlertPR(projectId), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(createAlertPR).toHaveBeenCalledWith(projectId, payload);
  });

  it('should handle mutation errors', async () => {
    const projectId = 'project-123';
    const payload = createMockCreateAlertPRPayload();
    const error = new Error('Failed to create PR');

    vi.mocked(createAlertPR).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateAlertPR(projectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should invalidate alerts query on success', async () => {
    const projectId = 'project-123';
    const payload = createMockCreateAlertPRPayload();
    const mockResponse = createMockCreateAlertPRResponse();

    vi.mocked(createAlertPR).mockResolvedValue(mockResponse);

    // Create a spy on the query client
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateAlertPR(projectId), {
      wrapper,
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['alerts', projectId],
    });
  });

  it('should handle multiple mutations', async () => {
    const projectId = 'project-123';
    const payload1 = createMockCreateAlertPRPayload({ title: 'First PR' });
    const payload2 = createMockCreateAlertPRPayload({ title: 'Second PR' });
    const mockResponse1 = createMockCreateAlertPRResponse({ pr_number: 123 });
    const mockResponse2 = createMockCreateAlertPRResponse({ pr_number: 124 });

    vi.mocked(createAlertPR)
      .mockResolvedValueOnce(mockResponse1)
      .mockResolvedValueOnce(mockResponse2);

    const { result } = renderHook(() => useCreateAlertPR(projectId), {
      wrapper: createWrapper(),
    });

    // First mutation
    result.current.mutate(payload1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse1);

    // Reset mutation state
    result.current.reset();

    // Second mutation
    result.current.mutate(payload2);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse2);

    expect(createAlertPR).toHaveBeenCalledTimes(2);
    expect(createAlertPR).toHaveBeenNthCalledWith(1, projectId, payload1);
    expect(createAlertPR).toHaveBeenNthCalledWith(2, projectId, payload2);
  });

  it('should handle empty payload', async () => {
    const projectId = 'project-123';
    const payload = createMockCreateAlertPRPayload({ files: [] });
    const error = new Error('No files provided');

    vi.mocked(createAlertPR).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateAlertPR(projectId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});
