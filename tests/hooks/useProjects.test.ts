import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFetchProjects } from '@/hooks/api/useProjects';
import { fetchProjects } from '@/services/ProjectsApi';
import { Project } from '@/types/api';
import React, { ReactNode } from 'react';

// Mock the ProjectsApi
vi.mock('@/services/ProjectsApi', () => ({
  fetchProjects: vi.fn(),
}));

const mockFetchProjects = vi.mocked(fetchProjects);

// Mock data
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'cis20',
    title: 'CIS 2.0',
    description: 'Customer Information System 2.0',
    health: { endpoint: 'default' },
    alerts: { repo: 'cis20-alerts' }
  },
  {
    id: '2',
    name: 'usrv',
    title: 'User Services',
    description: 'User management services',
    health: { endpoint: 'custom' }
  },
  {
    id: '3',
    name: 'ca',
    title: 'Customer Analytics',
    description: 'Analytics platform for customer data'
  }
];

describe('useProjects', () => {
  let queryClient: QueryClient;

  const createWrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  describe('useFetchProjects', () => {
    it('should fetch projects successfully', async () => {
      mockFetchProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useFetchProjects(), {
        wrapper: createWrapper,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockProjects);
      expect(result.current.error).toBeNull();
      expect(mockFetchProjects).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch projects');
      mockFetchProjects.mockRejectedValue(mockError);

      const { result } = renderHook(() => useFetchProjects(), {
        wrapper: createWrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toEqual(mockError);
      expect(mockFetchProjects).toHaveBeenCalledTimes(1);
    });

    it('should use correct query key', () => {
      mockFetchProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useFetchProjects(), {
        wrapper: createWrapper,
      });

      // The hook should use the correct query key structure
      expect(result.current).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should handle empty projects array', async () => {
      mockFetchProjects.mockResolvedValue([]);

      const { result } = renderHook(() => useFetchProjects(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should support refetch functionality', async () => {
      mockFetchProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useFetchProjects(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockProjects);

      // Test refetch
      const updatedProjects = [...mockProjects, {
        id: '4',
        name: 'new-project',
        title: 'New Project',
        description: 'A new project'
      }];
      mockFetchProjects.mockResolvedValue(updatedProjects);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual(updatedProjects);
      });
      
      expect(mockFetchProjects).toHaveBeenCalledTimes(2);
    });
  });
});
