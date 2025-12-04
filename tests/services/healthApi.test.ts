import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildHealthEndpoint,
  buildHealthEndpointWithSubdomain,
  buildSystemInfoEndpoint,
  buildSystemInfoEndpointWithSubdomain,
  fetchHealthStatus,
  fetchSystemInformation,
  fetchAllHealthStatuses,
  fetchComponentHealth,
  type SystemInformation
} from '../../src/services/healthApi';
import { apiClient } from '../../src/services/ApiClient';
import type { Component, HealthResponse, ComponentHealthCheck, LandscapeConfig } from '../../src/types/health';

// Mock the ApiClient
vi.mock('../../src/services/ApiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('healthApi', () => {
  let mockComponent: Component;
  let mockLandscape: LandscapeConfig;
  let mockHealthResponse: HealthResponse;
  let mockSystemInfo: SystemInformation;

  beforeEach(() => {
    // Mock console methods to avoid noise in test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Setup mock data
    mockComponent = {
      id: 'comp-123',
      name: 'accounts-service',
      title: 'Accounts Service',
      description: 'Service for managing accounts',
      project_id: 'proj-123',
      owner_id: 'owner-123',
      metadata: {
        subdomain: 'sap-provisioning'
      }
    };

    mockLandscape = {
      name: 'eu10-canary',
      route: 'sap.hana.ondemand.com'
    };

    mockHealthResponse = {
      status: 'UP',
      components: {
        db: {
          status: 'UP',
          description: 'Database is healthy'
        }
      }
    };

    mockSystemInfo = {
      gitProperties: {
        'git.commit.id': 'abc123',
        'git.build.time': '2023-01-01T00:00:00Z',
        'git.commit.time': '2023-01-01T00:00:00Z'
      },
      buildProperties: {
        group: 'com.sap',
        artifact: 'accounts-service',
        time: 1672531200000,
        version: '1.0.0',
        name: 'accounts-service'
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // URL BUILDING FUNCTIONS
  // ============================================================================

  describe('URL Building Functions', () => {
    it('should build health and system info endpoints correctly', () => {
      // Test basic health endpoint
      expect(buildHealthEndpoint(mockComponent, mockLandscape))
        .toBe('https://accounts-service.cfapps.sap.hana.ondemand.com/health');

      // Test health endpoint with subdomain
      expect(buildHealthEndpointWithSubdomain(mockComponent, mockLandscape, 'sap-provisioning'))
        .toBe('https://sap-provisioning.accounts-service.cfapps.sap.hana.ondemand.com/health');

      // Test system info endpoint with default and custom paths
      expect(buildSystemInfoEndpoint(mockComponent, mockLandscape))
        .toBe('https://accounts-service.cfapps.sap.hana.ondemand.com/systemInformation/public');
      expect(buildSystemInfoEndpoint(mockComponent, mockLandscape, '/version'))
        .toBe('https://accounts-service.cfapps.sap.hana.ondemand.com/version');

      // Test system info endpoint with subdomain
      expect(buildSystemInfoEndpointWithSubdomain(mockComponent, mockLandscape, 'sap-provisioning', '/version'))
        .toBe('https://sap-provisioning.accounts-service.cfapps.sap.hana.ondemand.com/version');
    });

    it('should handle component names with uppercase letters and different landscapes', () => {
      const componentWithUppercase = { ...mockComponent, name: 'Accounts-Service' };
      const differentLandscape = { ...mockLandscape, route: 'eu20.hana.ondemand.com' };
      
      expect(buildHealthEndpoint(componentWithUppercase, differentLandscape))
        .toBe('https://accounts-service.cfapps.eu20.hana.ondemand.com/health');
    });
  });

  // ============================================================================
  // HEALTH STATUS FETCHING
  // ============================================================================

  describe('fetchHealthStatus', () => {
    it('should fetch health status successfully and handle AbortSignal', async () => {
      const mockApiResponse = { ...mockHealthResponse, componentSuccess: true };
      const controller = new AbortController();
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiResponse);

      const result = await fetchHealthStatus('https://test.com/health', controller.signal);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockApiResponse);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(apiClient.get).toHaveBeenCalledWith('/cis-public/proxy', {
        params: { url: 'https://test.com/health' },
        signal: controller.signal,
      });
    });

    it('should handle various error scenarios', async () => {
      // Test component failure with status code
      vi.mocked(apiClient.get).mockResolvedValueOnce({ componentSuccess: false, statusCode: 500 });
      let result = await fetchHealthStatus('https://test.com/health');
      expect(result.status).toBe('error');
      expect(result.error).toBe('Health check failed with status 500');

      // Test component failure without status code
      vi.mocked(apiClient.get).mockResolvedValueOnce({ componentSuccess: false });
      result = await fetchHealthStatus('https://test.com/health');
      expect(result.status).toBe('error');
      expect(result.error).toBe('Health check failed with status unknown');

      // Test network errors
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));
      result = await fetchHealthStatus('https://test.com/health');
      expect(result.status).toBe('error');
      expect(result.error).toBe('Network error');

      // Test unknown errors
      vi.mocked(apiClient.get).mockRejectedValueOnce('Unknown error');
      result = await fetchHealthStatus('https://test.com/health');
      expect(result.status).toBe('error');
      expect(result.error).toBe('Unknown error');
    });
  });

  // ============================================================================
  // SYSTEM INFORMATION FETCHING
  // ============================================================================

  describe('fetchSystemInformation', () => {
    it('should fetch system information from /systemInformation/public successfully', async () => {
      const mockApiResponse = { ...mockSystemInfo, componentSuccess: true };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiResponse);

      const result = await fetchSystemInformation(mockComponent, mockLandscape);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockApiResponse);
      expect(result.url).toBe('https://accounts-service.cfapps.sap.hana.ondemand.com/systemInformation/public');
    });

    it('should fallback to subdomain endpoint when primary fails', async () => {
      const mockApiResponse = { ...mockSystemInfo, componentSuccess: true };
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce(mockApiResponse);

      const result = await fetchSystemInformation(mockComponent, mockLandscape);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockApiResponse);
      expect(result.url).toBe('https://sap-provisioning.accounts-service.cfapps.sap.hana.ondemand.com/systemInformation/public');
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });

    it('should fallback to /version endpoint when /systemInformation/public fails', async () => {
      const mockApiResponse = { ...mockSystemInfo, componentSuccess: true };
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockRejectedValueOnce(new Error('Subdomain failed'))
        .mockResolvedValueOnce(mockApiResponse);

      const result = await fetchSystemInformation(mockComponent, mockLandscape);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockApiResponse);
      expect(result.url).toBe('https://accounts-service.cfapps.sap.hana.ondemand.com/version');
      expect(apiClient.get).toHaveBeenCalledTimes(3);
    });

    it('should fallback to /version with subdomain when all other attempts fail', async () => {
      const mockApiResponse = { ...mockSystemInfo, componentSuccess: true };
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockRejectedValueOnce(new Error('Subdomain failed'))
        .mockRejectedValueOnce(new Error('Version failed'))
        .mockResolvedValueOnce(mockApiResponse);

      const result = await fetchSystemInformation(mockComponent, mockLandscape);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockApiResponse);
      expect(result.url).toBe('https://sap-provisioning.accounts-service.cfapps.sap.hana.ondemand.com/version');
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });

    it('should handle component without subdomain metadata', async () => {
      const componentWithoutSubdomain = { ...mockComponent, metadata: {} };
      const mockApiResponse = { ...mockSystemInfo, componentSuccess: true };
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce(mockApiResponse);

      const result = await fetchSystemInformation(componentWithoutSubdomain, mockLandscape);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockApiResponse);
      expect(result.url).toBe('https://accounts-service.cfapps.sap.hana.ondemand.com/version');
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle component with non-string subdomain', async () => {
      const componentWithInvalidSubdomain = { 
        ...mockComponent, 
        metadata: { subdomain: 123 } 
      };
      const mockApiResponse = { ...mockSystemInfo, componentSuccess: true };
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce(mockApiResponse);

      const result = await fetchSystemInformation(componentWithInvalidSubdomain, mockLandscape);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockApiResponse);
      expect(result.url).toBe('https://accounts-service.cfapps.sap.hana.ondemand.com/version');
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });

    it('should return error when all endpoints fail', async () => {
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockRejectedValueOnce(new Error('Subdomain failed'))
        .mockRejectedValueOnce(new Error('Version failed'))
        .mockRejectedValueOnce(new Error('Version subdomain failed'));

      const result = await fetchSystemInformation(mockComponent, mockLandscape);

      expect(result.status).toBe('error');
      expect(result.error).toBe('All system info endpoints failed');
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });

    it('should handle componentSuccess false responses', async () => {
      vi.mocked(apiClient.get)
        .mockResolvedValueOnce({ componentSuccess: false })
        .mockResolvedValueOnce({ componentSuccess: false })
        .mockResolvedValueOnce({ componentSuccess: false })
        .mockResolvedValueOnce({ componentSuccess: false });

      const result = await fetchSystemInformation(mockComponent, mockLandscape);

      expect(result.status).toBe('error');
      expect(result.error).toBe('All system info endpoints failed');
    });

    it('should handle AbortSignal', async () => {
      const controller = new AbortController();
      const mockApiResponse = { ...mockSystemInfo, componentSuccess: true };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiResponse);

      const result = await fetchSystemInformation(mockComponent, mockLandscape, controller.signal);

      expect(result.status).toBe('success');
      expect(apiClient.get).toHaveBeenCalledWith('/cis-public/proxy', {
        params: { url: 'https://accounts-service.cfapps.sap.hana.ondemand.com/systemInformation/public' },
        signal: controller.signal,
      });
    });
  });

  // ============================================================================
  // FETCH ALL HEALTH STATUSES
  // ============================================================================

  describe('fetchAllHealthStatuses', () => {
    let mockComponents: Component[];

    beforeEach(() => {
      mockComponents = [
        {
          id: 'comp-1',
          name: 'service-1',
          title: 'Service 1',
          description: 'First service',
          project_id: 'proj-1',
          owner_id: 'owner-1'
        },
        {
          id: 'comp-2',
          name: 'service-2',
          title: 'Service 2',
          description: 'Second service',
          project_id: 'proj-2',
          owner_id: 'owner-2',
          metadata: {
            subdomain: 'custom-subdomain'
          }
        }
      ];
    });

    it('should fetch health for all components successfully', async () => {
      const mockHealthResponse1 = { status: 'UP', componentSuccess: true };
      const mockHealthResponse2 = { status: 'DOWN', componentSuccess: true };

      vi.mocked(apiClient.get)
        .mockResolvedValueOnce(mockHealthResponse1)
        .mockResolvedValueOnce(mockHealthResponse2);

      const result = await fetchAllHealthStatuses(mockComponents, mockLandscape);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        componentId: 'comp-1',
        componentName: 'service-1',
        landscape: 'eu10-canary',
        status: 'UP',
        response: mockHealthResponse1
      });
      expect(result[1]).toMatchObject({
        componentId: 'comp-2',
        componentName: 'service-2',
        landscape: 'eu10-canary',
        status: 'DOWN',
        response: mockHealthResponse2
      });
    });

    it('should handle primary endpoint failure and fallback to subdomain', async () => {
      const mockHealthResponse = { status: 'UP', componentSuccess: true };

      vi.mocked(apiClient.get)
        .mockResolvedValueOnce({ status: 'UP', componentSuccess: true }) // service-1 success
        .mockRejectedValueOnce(new Error('Primary failed')) // service-2 primary fails
        .mockResolvedValueOnce(mockHealthResponse); // service-2 fallback succeeds

      const result = await fetchAllHealthStatuses(mockComponents, mockLandscape);

      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({
        componentId: 'comp-2',
        componentName: 'service-2',
        healthUrl: 'https://custom-subdomain.service-2.cfapps.sap.hana.ondemand.com/health',
        status: 'UP',
        response: mockHealthResponse
      });
    });

    it('should handle components without subdomain metadata', async () => {
      const componentWithoutSubdomain = {
        id: 'comp-3',
        name: 'service-3',
        title: 'Service 3',
        description: 'Third service',
        project_id: 'proj-3',
        owner_id: 'owner-3'
      };

      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Health check failed'));

      const result = await fetchAllHealthStatuses([componentWithoutSubdomain], mockLandscape);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        componentId: 'comp-3',
        componentName: 'service-3',
        status: 'ERROR',
        error: 'Health check failed'
      });
    });

    it('should handle all health checks failing', async () => {
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Service 1 failed'))
        .mockRejectedValueOnce(new Error('Service 2 primary failed'))
        .mockRejectedValueOnce(new Error('Service 2 fallback failed'));

      const result = await fetchAllHealthStatuses(mockComponents, mockLandscape);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        componentId: 'comp-1',
        status: 'ERROR',
        error: 'Service 1 failed'
      });
      expect(result[1]).toMatchObject({
        componentId: 'comp-2',
        status: 'ERROR',
        error: 'Service 2 primary failed'
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce('Unexpected error type');

      const result = await fetchAllHealthStatuses([mockComponents[0]], mockLandscape);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        componentId: 'comp-1',
        status: 'ERROR',
        error: 'Unknown error'
      });
    });

    it('should handle AbortSignal', async () => {
      const controller = new AbortController();
      const mockHealthResponse = { status: 'UP', componentSuccess: true };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockHealthResponse);

      const result = await fetchAllHealthStatuses([mockComponents[0]], mockLandscape, controller.signal);

      expect(result).toHaveLength(1);
      expect(apiClient.get).toHaveBeenCalledWith('/cis-public/proxy', {
        params: { url: 'https://service-1.cfapps.sap.hana.ondemand.com/health' },
        signal: controller.signal,
      });
    });

    it('should handle empty components array', async () => {
      const result = await fetchAllHealthStatuses([], mockLandscape);
      expect(result).toHaveLength(0);
    });

    it('should set lastChecked timestamp', async () => {
      const mockHealthResponse = { status: 'UP', componentSuccess: true };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockHealthResponse);

      const beforeTime = new Date();
      const result = await fetchAllHealthStatuses([mockComponents[0]], mockLandscape);
      const afterTime = new Date();

      expect(result[0].lastChecked).toBeInstanceOf(Date);
      expect(result[0].lastChecked!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result[0].lastChecked!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  // ============================================================================
  // FETCH COMPONENT HEALTH (NEW ENDPOINT)
  // ============================================================================

  describe('fetchComponentHealth', () => {
    it('should fetch component health successfully', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockHealthResponse);

      const result = await fetchComponentHealth('comp-123', 'landscape-456');

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockHealthResponse);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(apiClient.get).toHaveBeenCalledWith('/components/health', {
        params: {
          'component-id': 'comp-123',
          'landscape-id': 'landscape-456'
        },
        signal: undefined,
      });
    });

    it('should handle component health fetch with AbortSignal', async () => {
      const controller = new AbortController();
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockHealthResponse);

      const result = await fetchComponentHealth('comp-123', 'landscape-456', controller.signal);

      expect(result.status).toBe('success');
      expect(apiClient.get).toHaveBeenCalledWith('/components/health', {
        params: {
          'component-id': 'comp-123',
          'landscape-id': 'landscape-456'
        },
        signal: controller.signal,
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValueOnce(networkError);

      const result = await fetchComponentHealth('comp-123', 'landscape-456');

      expect(result.status).toBe('error');
      expect(result.error).toBe('Network error');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle unknown errors', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce('Unknown error');

      const result = await fetchComponentHealth('comp-123', 'landscape-456');

      expect(result.status).toBe('error');
      expect(result.error).toBe('Failed to fetch component health');
    });

    it('should measure response time accurately', async () => {
      // Mock a delayed response
      vi.mocked(apiClient.get).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockHealthResponse), 100))
      );

      const result = await fetchComponentHealth('comp-123', 'landscape-456');

      expect(result.status).toBe('success');
      expect(result.responseTime).toBeGreaterThanOrEqual(100);
    });
  });
});
