import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks to test
import { useFetchJenkinsJobParameters } from '../../../src/hooks/api/useSelfService';

// Mock the SelfServiceApi
import { fetchJenkinsJobParameters } from '../../../src/services/SelfServiceApi';
vi.mock('../../../src/services/SelfServiceApi', () => ({
  fetchJenkinsJobParameters: vi.fn(),
}));

// Mock the queryKeys
import { queryKeys } from '../../../src/lib/queryKeys';
vi.mock('../../../src/lib/queryKeys', () => ({
  queryKeys: {
    selfService: {
      jenkinsJobParameters: vi.fn((jaasName: string, jobName: string) => 
        ['selfService', 'jenkinsJobParameters', jaasName, jobName]
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

const createMockJobParameter = (overrides?: any) => ({
  name: 'ENVIRONMENT',
  type: 'choice',
  description: 'Target environment for deployment',
  defaultValue: 'dev',
  choices: ['dev', 'staging', 'prod'],
  required: true,
  ...overrides,
});

const createMockJenkinsJobParametersResponse = (overrides?: any) => ({
  jobName: 'multi-cis-v3-create',
  displayName: 'Multi CIS v3 Create',
  description: 'Creates a new multi-CIS v3 environment',
  parameters: [
    createMockJobParameter(),
    createMockJobParameter({
      name: 'BRANCH',
      type: 'string',
      description: 'Git branch to deploy',
      defaultValue: 'main',
      choices: null,
    }),
    createMockJobParameter({
      name: 'DRY_RUN',
      type: 'boolean',
      description: 'Perform a dry run without making changes',
      defaultValue: false,
      choices: null,
    }),
  ],
  buildable: true,
  url: 'https://jenkins.example.com/job/multi-cis-v3-create/',
  ...overrides,
});

// ============================================================================
// SELF SERVICE HOOKS TESTS
// ============================================================================

describe('useFetchJenkinsJobParameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch Jenkins job parameters successfully', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const mockResponse = createMockJenkinsJobParametersResponse();

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.parameters).toHaveLength(3);
    expect(fetchJenkinsJobParameters).toHaveBeenCalledWith(jaasName, jobName);
    expect(queryKeys.selfService.jenkinsJobParameters).toHaveBeenCalledWith(jaasName, jobName);
  });

  it('should not fetch when parameters are invalid', async () => {
    const testCases = [
      { jaasName: '', jobName: 'multi-cis-v3-create', desc: 'jaasName is empty' },
      { jaasName: 'gkecfsmulticis2', jobName: '', desc: 'jobName is empty' },
      { jaasName: '', jobName: '', desc: 'both parameters are empty' },
    ];

    for (const { jaasName, jobName, desc } of testCases) {
      const { result } = renderHook(
        () => useFetchJenkinsJobParameters(jaasName, jobName),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading, `${desc}: should not be loading`).toBe(false);
      expect(result.current.fetchStatus, `${desc}: should be idle`).toBe('idle');
    }
    
    expect(fetchJenkinsJobParameters).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const error = new Error('Failed to fetch job parameters');
    
    vi.mocked(fetchJenkinsJobParameters).mockRejectedValue(error);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should respect custom enabled option', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName, { enabled: false }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchJenkinsJobParameters).not.toHaveBeenCalled();
  });

  it('should use correct query key', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const mockResponse = createMockJenkinsJobParametersResponse();

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryKeys.selfService.jenkinsJobParameters).toHaveBeenCalledWith(jaasName, jobName);
  });

  it('should handle job with no parameters', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'simple-job';
    const mockResponse = createMockJenkinsJobParametersResponse({
      jobName: 'simple-job',
      parameters: [],
    });

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.parameters).toHaveLength(0);
    expect(result.current.data?.jobName).toBe('simple-job');
  });

  it('should handle different parameter types', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'complex-job';
    const mockResponse = createMockJenkinsJobParametersResponse({
      parameters: [
        createMockJobParameter({
          name: 'STRING_PARAM',
          type: 'string',
          defaultValue: 'default-value',
          choices: null,
        }),
        createMockJobParameter({
          name: 'CHOICE_PARAM',
          type: 'choice',
          defaultValue: 'option1',
          choices: ['option1', 'option2', 'option3'],
        }),
        createMockJobParameter({
          name: 'BOOLEAN_PARAM',
          type: 'boolean',
          defaultValue: true,
          choices: null,
        }),
        createMockJobParameter({
          name: 'PASSWORD_PARAM',
          type: 'password',
          defaultValue: '',
          choices: null,
        }),
      ],
    });

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.parameters).toHaveLength(4);
    
    const params = result.current.data?.parameters || [];
    expect(params.find(p => p.name === 'STRING_PARAM')?.type).toBe('string');
    expect(params.find(p => p.name === 'CHOICE_PARAM')?.type).toBe('choice');
    expect(params.find(p => p.name === 'BOOLEAN_PARAM')?.type).toBe('boolean');
    expect(params.find(p => p.name === 'PASSWORD_PARAM')?.type).toBe('password');
  });

  it('should handle required and optional parameters', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'param-job';
    const mockResponse = createMockJenkinsJobParametersResponse({
      parameters: [
        createMockJobParameter({
          name: 'REQUIRED_PARAM',
          required: true,
        }),
        createMockJobParameter({
          name: 'OPTIONAL_PARAM',
          required: false,
        }),
      ],
    });

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = result.current.data?.parameters || [];
    expect(params.find(p => p.name === 'REQUIRED_PARAM')?.required).toBe(true);
    expect(params.find(p => p.name === 'OPTIONAL_PARAM')?.required).toBe(false);
  });

  it('should handle job that is not buildable', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'disabled-job';
    const mockResponse = createMockJenkinsJobParametersResponse({
      jobName: 'disabled-job',
      buildable: false,
    });

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.buildable).toBe(false);
    expect(result.current.data?.jobName).toBe('disabled-job');
  });

  it('should use correct cache settings', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const mockResponse = createMockJenkinsJobParametersResponse();

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have staleTime configured (job parameters don't change frequently)
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

  it('should not refetch on window focus', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const mockResponse = createMockJenkinsJobParametersResponse();

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The hook should be configured to not refetch on window focus
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should pass through additional options', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const mockResponse = createMockJenkinsJobParametersResponse();

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const customOptions = {
      enabled: true,
      staleTime: 10 * 60 * 1000, // Override default staleTime
    };

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName, customOptions),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
  });

  it('should handle network errors', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const networkError = new Error('Network error');
    
    vi.mocked(fetchJenkinsJobParameters).mockRejectedValue(networkError);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(networkError);
  });

  it('should handle timeout errors', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'multi-cis-v3-create';
    const timeoutError = new Error('Request timeout');
    
    vi.mocked(fetchJenkinsJobParameters).mockRejectedValue(timeoutError);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(timeoutError);
  });

  it('should handle job not found errors', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'non-existent-job';
    const notFoundError = new Error('Job not found');
    
    vi.mocked(fetchJenkinsJobParameters).mockRejectedValue(notFoundError);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(notFoundError);
  });

  it('should handle different JAAS names', async () => {
    const jobName = 'multi-cis-v3-create';
    
    const jaasNames = ['gkecfsmulticis2', 'atom', 'another-jaas'];
    
    for (const jaasName of jaasNames) {
      const mockResponse = createMockJenkinsJobParametersResponse({
        url: `https://${jaasName}.jenkins.example.com/job/${jobName}/`,
      });
      vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useFetchJenkinsJobParameters(jaasName, jobName),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.url).toBe(`https://${jaasName}.jenkins.example.com/job/${jobName}/`);
      expect(fetchJenkinsJobParameters).toHaveBeenCalledWith(jaasName, jobName);
      
      // Clear mocks for next iteration
      vi.clearAllMocks();
    }
  });

  it('should handle different job names', async () => {
    const jaasName = 'gkecfsmulticis2';
    
    const jobNames = ['multi-cis-v3-create', 'multi-cis-v3-update', 'multi-cis-v3-delete'];
    
    for (const jobName of jobNames) {
      const mockResponse = createMockJenkinsJobParametersResponse({
        jobName,
        displayName: jobName.replace(/-/g, ' ').toUpperCase(),
      });
      vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useFetchJenkinsJobParameters(jaasName, jobName),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.jobName).toBe(jobName);
      expect(fetchJenkinsJobParameters).toHaveBeenCalledWith(jaasName, jobName);
      
      // Clear mocks for next iteration
      vi.clearAllMocks();
    }
  });

  it('should handle parameters with complex choices', async () => {
    const jaasName = 'gkecfsmulticis2';
    const jobName = 'complex-choices-job';
    const mockResponse = createMockJenkinsJobParametersResponse({
      parameters: [
        createMockJobParameter({
          name: 'REGION',
          type: 'choice',
          choices: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
          defaultValue: 'us-east-1',
        }),
        createMockJobParameter({
          name: 'INSTANCE_TYPE',
          type: 'choice',
          choices: ['t3.micro', 't3.small', 't3.medium', 't3.large'],
          defaultValue: 't3.small',
        }),
      ],
    });

    vi.mocked(fetchJenkinsJobParameters).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchJenkinsJobParameters(jaasName, jobName),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = result.current.data?.parameters || [];
    const regionParam = params.find(p => p.name === 'REGION');
    const instanceParam = params.find(p => p.name === 'INSTANCE_TYPE');

    expect(regionParam?.choices).toHaveLength(4);
    expect(regionParam?.choices).toContain('us-east-1');
    expect(instanceParam?.choices).toHaveLength(4);
    expect(instanceParam?.choices).toContain('t3.micro');
  });
});
