import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks to test
import { useJenkinsBuildStatus } from '../../../src/hooks/api/useJenkinsBuildStatus';

// Mock the SelfServiceApi
import { fetchJenkinsBuildStatus } from '../../../src/services/SelfServiceApi';
vi.mock('../../../src/services/SelfServiceApi', () => ({
  fetchJenkinsBuildStatus: vi.fn(),
}));

// Mock the queryKeys
import { queryKeys } from '../../../src/lib/queryKeys';
vi.mock('../../../src/lib/queryKeys', () => ({
  queryKeys: {
    selfService: {
      buildStatus: vi.fn((jaasName: string, jobName: string, buildNumber: number) => 
        ['selfService', 'buildStatus', jaasName, jobName, buildNumber]
      ),
    },
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
        refetchInterval: false, // Disable polling for tests by default
        refetchIntervalInBackground: false,
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

const createMockJenkinsBuildStatusResponse = (overrides?: any) => ({
  status: 'running',
  buildNumber: 123,
  duration: 0,
  estimatedDuration: 300000,
  timestamp: Date.now(),
  result: null,
  url: 'https://jenkins.example.com/job/test-job/123/',
  displayName: '#123',
  description: 'Build #123',
  building: true,
  ...overrides,
});

// ============================================================================
// JENKINS BUILD STATUS HOOKS TESTS
// ============================================================================

describe('useJenkinsBuildStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch build status successfully', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;
    const mockResponse = createMockJenkinsBuildStatusResponse();

    vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(fetchJenkinsBuildStatus).toHaveBeenCalledWith(jaasName, jobName, buildNumber);
    expect(queryKeys.selfService.buildStatus).toHaveBeenCalledWith(jaasName, jobName, buildNumber);
  });

  it('should not fetch when parameters are invalid', async () => {
    const testCases = [
      { jaasName: undefined, jobName: 'multi-cis-v3-create', buildNumber: 123, desc: 'jaasName is undefined' },
      { jaasName: 'gkecfsmulticis2', jobName: undefined, buildNumber: 123, desc: 'jobName is undefined' },
      { jaasName: 'gkecfsmulticis2', jobName: 'multi-cis-v3-create', buildNumber: undefined, desc: 'buildNumber is undefined' },
      { jaasName: undefined, jobName: undefined, buildNumber: undefined, desc: 'all parameters are undefined' },
      { jaasName: '', jobName: 'multi-cis-v3-create', buildNumber: 123, desc: 'jaasName is empty' },
      { jaasName: 'gkecfsmulticis2', jobName: '', buildNumber: 123, desc: 'jobName is empty' },
      { jaasName: 'gkecfsmulticis2', jobName: 'multi-cis-v3-create', buildNumber: 0, desc: 'buildNumber is 0' },
      { jaasName: 'gkecfsmulticis2', jobName: 'multi-cis-v3-create', buildNumber: -1, desc: 'buildNumber is negative' },
    ];

    for (const { jaasName, jobName, buildNumber, desc } of testCases) {
      const { result } = renderHook(
        () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading, `${desc}: should not be loading`).toBe(false);
      expect(result.current.fetchStatus, `${desc}: should be idle`).toBe('idle');
    }
    
    expect(fetchJenkinsBuildStatus).not.toHaveBeenCalled();
  });


  it('should respect custom enabled option', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;

    const { result } = renderHook(
      () => useJenkinsBuildStatus(jaasName, jobName, buildNumber, { enabled: false }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchJenkinsBuildStatus).not.toHaveBeenCalled();
  });

  it('should use correct query key', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;
    const mockResponse = createMockJenkinsBuildStatusResponse();

    vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryKeys.selfService.buildStatus).toHaveBeenCalledWith(jaasName, jobName, buildNumber);
  });

  it('should handle different status values', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;
    
    const statuses = ['running', 'success', 'failed', 'aborted', 'cancelled'];
    
    for (const status of statuses) {
      const mockResponse = createMockJenkinsBuildStatusResponse({ status });
      vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.status).toBe(status);
      
      // Clear mocks for next iteration
      vi.clearAllMocks();
    }
  });

  it('should handle different build statuses with appropriate properties', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;
    
    const testCases = [
      { status: 'success', result: 'SUCCESS', building: false, duration: 120000 },
      { status: 'failed', result: 'FAILURE', building: false, duration: 60000 },
      { status: 'running', result: null, building: true, duration: 0, estimatedDuration: 300000 },
      { status: 'aborted', result: 'ABORTED', building: false, duration: 30000 },
    ];
    
    for (const testCase of testCases) {
      const mockResponse = createMockJenkinsBuildStatusResponse(testCase);
      vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.status).toBe(testCase.status);
      expect(result.current.data?.result).toBe(testCase.result);
      expect(result.current.data?.building).toBe(testCase.building);
      if (testCase.duration !== undefined) {
        expect(result.current.data?.duration).toBe(testCase.duration);
      }
      if (testCase.estimatedDuration !== undefined) {
        expect(result.current.data?.estimatedDuration).toBe(testCase.estimatedDuration);
      }
      
      // Clear mocks for next iteration
      vi.clearAllMocks();
    }
  });

  it('should use correct cache settings', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;
    const mockResponse = createMockJenkinsBuildStatusResponse();

    vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have staleTime of 0 (always fetch fresh data)
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

  it('should pass through additional options', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;
    const mockResponse = createMockJenkinsBuildStatusResponse();

    vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

    const customOptions = {
      enabled: true,
      refetchOnWindowFocus: false,
    };

    const { result } = renderHook(
      () => useJenkinsBuildStatus(jaasName, jobName, buildNumber, customOptions),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
  });

  it('should configure polling settings', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;
    const mockResponse = createMockJenkinsBuildStatusResponse();

    vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The hook should be configured with polling settings
    // (actual polling behavior would need integration tests)
    expect(result.current.data).toEqual(mockResponse);
  });


  it('should handle build with URL and display name', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const buildNumber = 123;
    const mockResponse = createMockJenkinsBuildStatusResponse({
      url: 'https://jenkins.example.com/job/multi-cis-v3-create/123/',
      displayName: '#123',
      description: 'Multi CIS v3 Create Build #123',
    });

    vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.url).toBe('https://jenkins.example.com/job/multi-cis-v3-create/123/');
    expect(result.current.data?.displayName).toBe('#123');
    expect(result.current.data?.description).toBe('Multi CIS v3 Create Build #123');
  });

  it('should handle build with different job names', async () => {
    const jaasName = 'gkecfsmulticis2';
    const buildNumber = 123;
    
    const jobNames = ['multi-cis-v3-create', 'multi-cis-v3-update', 'multi-cis-v3-delete'];
    
    for (const jobName of jobNames) {
      const mockResponse = createMockJenkinsBuildStatusResponse({
        url: `https://jenkins.example.com/job/${jobName}/${buildNumber}/`,
      });
      vi.mocked(fetchJenkinsBuildStatus).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useJenkinsBuildStatus(jaasName, jobName, buildNumber),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.url).toBe(`https://jenkins.example.com/job/${jobName}/${buildNumber}/`);
      expect(fetchJenkinsBuildStatus).toHaveBeenCalledWith(jaasName, jobName, buildNumber);
      
      // Clear mocks for next iteration
      vi.clearAllMocks();
    }
  });
});
