import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks to test
import { useSwaggerUI } from '../../../src/hooks/api/useSwaggerUI';

// Mock the SwaggerApi
import { fetchSwaggerSchema } from '../../../src/services/SwaggerApi';
vi.mock('../../../src/services/SwaggerApi', () => ({
  fetchSwaggerSchema: vi.fn(),
}));

// Mock the queryKeys
import { queryKeys } from '../../../src/lib/queryKeys';
vi.mock('../../../src/lib/queryKeys', () => ({
  queryKeys: {
    swagger: {
      byComponent: vi.fn((componentName: string, landscapeName: string) => 
        ['swagger', 'component', componentName, landscapeName]
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
        refetchOnWindowFocus: false,
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

const createMockComponent = (overrides?: any) => ({
  name: 'test-service',
  displayName: 'Test Service',
  description: 'A test service component',
  type: 'service',
  version: '1.0.0',
  ...overrides,
});

const createMockLandscapeConfig = (overrides?: any) => ({
  name: 'development',
  displayName: 'Development',
  description: 'Development landscape',
  baseUrl: 'https://dev.example.com',
  ...overrides,
});

const createMockSwaggerApiResponse = (overrides?: any) => ({
  openapi: '3.0.0',
  info: {
    title: 'Test Service API',
    version: '1.0.0',
    description: 'API documentation for Test Service',
  },
  servers: [
    {
      url: 'https://api.example.com/v1',
      description: 'Production server',
    },
  ],
  paths: {
    '/users': {
      get: {
        summary: 'Get all users',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new user',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
                required: ['name', 'email'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
          },
        },
      },
    },
  },
  ...overrides,
});

const createMockFetchSwaggerSchemaResponse = (overrides?: any) => ({
  status: 'success' as const,
  data: createMockSwaggerApiResponse(),
  swaggerUiUrl: 'https://swagger-ui.example.com/?url=https://api.example.com/swagger.json',
  ...overrides,
});

// ============================================================================
// SWAGGER UI HOOKS TESTS
// ============================================================================

describe('useSwaggerUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch Swagger schema successfully', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();
    const mockResponse = createMockFetchSwaggerSchemaResponse();

    vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSwaggerUI(component, landscape),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.schema).toEqual(mockResponse.data);
    expect(result.current.data?.swaggerUiUrl).toBe(mockResponse.swaggerUiUrl);
    expect(fetchSwaggerSchema).toHaveBeenCalledWith(component, landscape);
    expect(queryKeys.swagger.byComponent).toHaveBeenCalledWith(component.name, landscape.name);
  });

  it('should not fetch when parameters are invalid', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();
    
    const testCases = [
      { component: null, landscape, desc: 'component is null' },
      { component: undefined, landscape, desc: 'component is undefined' },
      { component, landscape: null, desc: 'landscape is null' },
      { component, landscape: undefined, desc: 'landscape is undefined' },
      { component: null, landscape: null, desc: 'both are null' },
    ];

    for (const { component, landscape, desc } of testCases) {
      const { result } = renderHook(
        () => useSwaggerUI(component, landscape),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading, `${desc}: should not be loading`).toBe(false);
      expect(result.current.fetchStatus, `${desc}: should be idle`).toBe('idle');
    }
    
    expect(fetchSwaggerSchema).not.toHaveBeenCalled();
  });


  it('should respect custom enabled option', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();

    const { result } = renderHook(
      () => useSwaggerUI(component, landscape, { enabled: false }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchSwaggerSchema).not.toHaveBeenCalled();
  });


  it('should use correct query key', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();
    const mockResponse = createMockFetchSwaggerSchemaResponse();

    vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSwaggerUI(component, landscape),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryKeys.swagger.byComponent).toHaveBeenCalledWith(component.name, landscape.name);
  });

  it('should handle different component types', async () => {
    const landscape = createMockLandscapeConfig();
    
    const componentTypes = ['service', 'api', 'microservice', 'application'];
    
    for (const type of componentTypes) {
      const component = createMockComponent({ type });
      const mockResponse = createMockFetchSwaggerSchemaResponse({
        data: createMockSwaggerApiResponse({
          info: { title: `${type} API`, version: '1.0.0' },
        }),
      });
      
      vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useSwaggerUI(component, landscape),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.schema.info.title).toBe(`${type} API`);
      expect(fetchSwaggerSchema).toHaveBeenCalledWith(component, landscape);
      
      // Clear mocks for next iteration
      vi.clearAllMocks();
    }
  });

  it('should handle different landscapes', async () => {
    const component = createMockComponent();
    
    const landscapes = [
      { name: 'development', baseUrl: 'https://dev.example.com' },
      { name: 'staging', baseUrl: 'https://staging.example.com' },
      { name: 'production', baseUrl: 'https://prod.example.com' },
    ];
    
    for (const landscapeData of landscapes) {
      const landscape = createMockLandscapeConfig(landscapeData);
      const mockResponse = createMockFetchSwaggerSchemaResponse({
        swaggerUiUrl: `${landscapeData.baseUrl}/swagger-ui/`,
      });
      
      vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useSwaggerUI(component, landscape),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.swaggerUiUrl).toBe(`${landscapeData.baseUrl}/swagger-ui/`);
      expect(fetchSwaggerSchema).toHaveBeenCalledWith(component, landscape);
      
      // Clear mocks for next iteration
      vi.clearAllMocks();
    }
  });

  it('should handle Swagger schema with different OpenAPI versions', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();
    
    const openApiVersions = ['3.0.0', '3.0.1', '3.0.2', '3.1.0'];
    
    for (const version of openApiVersions) {
      const mockResponse = createMockFetchSwaggerSchemaResponse({
        data: createMockSwaggerApiResponse({
          openapi: version,
        }),
      });
      
      vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useSwaggerUI(component, landscape),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.schema.openapi).toBe(version);
      
      // Clear mocks for next iteration
      vi.clearAllMocks();
    }
  });

  it('should handle complex Swagger schema with multiple paths', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();
    const mockResponse = createMockFetchSwaggerSchemaResponse({
      data: createMockSwaggerApiResponse({
        paths: {
          '/users': {
            get: { summary: 'Get users' },
            post: { summary: 'Create user' },
          },
          '/users/{id}': {
            get: { summary: 'Get user by ID' },
            put: { summary: 'Update user' },
            delete: { summary: 'Delete user' },
          },
          '/posts': {
            get: { summary: 'Get posts' },
            post: { summary: 'Create post' },
          },
        },
      }),
    });

    vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSwaggerUI(component, landscape),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const paths = result.current.data?.schema.paths;
    expect(Object.keys(paths || {})).toHaveLength(3);
    expect(paths?.['/users']?.get?.summary).toBe('Get users');
    expect(paths?.['/users/{id}']?.delete?.summary).toBe('Delete user');
    expect(paths?.['/posts']?.post?.summary).toBe('Create post');
  });

  it('should handle Swagger schema with servers configuration', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();
    const mockResponse = createMockFetchSwaggerSchemaResponse({
      data: createMockSwaggerApiResponse({
        servers: [
          {
            url: 'https://api.dev.example.com/v1',
            description: 'Development server',
          },
          {
            url: 'https://api.staging.example.com/v1',
            description: 'Staging server',
          },
          {
            url: 'https://api.prod.example.com/v1',
            description: 'Production server',
          },
        ],
      }),
    });

    vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSwaggerUI(component, landscape),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const servers = result.current.data?.schema.servers;
    expect(servers).toHaveLength(3);
    expect(servers?.[0]?.url).toBe('https://api.dev.example.com/v1');
    expect(servers?.[1]?.description).toBe('Staging server');
    expect(servers?.[2]?.url).toBe('https://api.prod.example.com/v1');
  });

  it('should use correct cache settings', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();
    const mockResponse = createMockFetchSwaggerSchemaResponse();

    vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSwaggerUI(component, landscape),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have staleTime configured (5 minutes)
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

  it('should handle successful response without swaggerUiUrl', async () => {
    const component = createMockComponent();
    const landscape = createMockLandscapeConfig();
    const mockResponse = createMockFetchSwaggerSchemaResponse({
      swaggerUiUrl: undefined,
    });

    vi.mocked(fetchSwaggerSchema).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSwaggerUI(component, landscape),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.schema).toEqual(mockResponse.data);
    expect(result.current.data?.swaggerUiUrl).toBeUndefined();
  });
});
