import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectsProvider, useProjectsContext } from '@/contexts/ProjectsContext';
import { useFetchProjects } from '@/hooks/api/useProjects';
import { Project } from '@/types/api';
import { ReactNode } from 'react';

// Mock the useProjects hook
vi.mock('@/hooks/api/useProjects', () => ({
  useFetchProjects: vi.fn(),
}));

const mockUseFetchProjects = vi.mocked(useFetchProjects);

// Mock data
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'cis20',
    title: 'CIS 2.0',
    description: 'Customer Information System 2.0'
  },
  {
    id: '2',
    name: 'usrv',
    title: 'User Services',
    description: 'User management services'
  },
  {
    id: '3',
    name: 'ca',
    title: 'Customer Analytics',
    description: 'Analytics platform for customer data'
  },
  {
    id: '4',
    name: 'other-project',
    title: 'Other Project',
    description: 'Some other project'
  }
];

// Test component to access context
const TestComponent = () => {
  const { projects, isLoading, error, sidebarItems } = useProjectsContext();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{error ? 'error' : 'no-error'}</div>
      <div data-testid="projects-count">{projects.length}</div>
      <div data-testid="sidebar-items-count">{sidebarItems.length}</div>
      <div data-testid="projects">
        {projects.map(project => (
          <div key={project.id} data-testid={`project-${project.name}`}>
            {project.title}
          </div>
        ))}
      </div>
      <div data-testid="sidebar-items">
        {sidebarItems.map((item, index) => (
          <div key={index} data-testid={`sidebar-item-${index}`}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('ProjectsContext', () => {
  let queryClient: QueryClient;

  const renderWithProviders = (children: ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProjectsProvider>
          {children}
        </ProjectsProvider>
      </QueryClientProvider>
    );
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

  describe('ProjectsProvider', () => {
    it('should provide projects data when loaded successfully', async () => {
      mockUseFetchProjects.mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        remove: vi.fn(),
      });

      renderWithProviders(<TestComponent />);

      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      expect(screen.getByTestId('projects-count')).toHaveTextContent('4');
      
      // Check that projects are rendered
      expect(screen.getByTestId('project-cis20')).toHaveTextContent('CIS 2.0');
      expect(screen.getByTestId('project-usrv')).toHaveTextContent('User Services');
      expect(screen.getByTestId('project-ca')).toHaveTextContent('Customer Analytics');
      expect(screen.getByTestId('project-other-project')).toHaveTextContent('Other Project');
    });

    it('should provide loading state', () => {
      mockUseFetchProjects.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: false,
        status: 'pending',
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'fetching',
        isInitialLoading: true,
        isLoadingError: false,
        isPaused: false,
        isPending: true,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        remove: vi.fn(),
      });

      renderWithProviders(<TestComponent />);

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      expect(screen.getByTestId('projects-count')).toHaveTextContent('0');
    });

    it('should provide error state', () => {
      const mockError = new Error('Failed to fetch projects');
      mockUseFetchProjects.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: vi.fn(),
        isError: true,
        isSuccess: false,
        status: 'error',
        dataUpdatedAt: 0,
        errorUpdatedAt: Date.now(),
        failureCount: 1,
        failureReason: mockError,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: true,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        remove: vi.fn(),
      });

      renderWithProviders(<TestComponent />);

      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('error')).toHaveTextContent('error');
      expect(screen.getByTestId('projects-count')).toHaveTextContent('0');
    });

    it('should generate correct sidebar items with proper project ordering', () => {
      mockUseFetchProjects.mockReturnValue({
        data: mockProjects,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        remove: vi.fn(),
      });

      renderWithProviders(<TestComponent />);

      // Should have static items + project titles in correct order (default projects first)
      const expectedSidebarItems = [
        'Home',
        'Teams',
        'CIS 2.0',        // cis20 - default project (first in defaultProjectNames)
        'Customer Analytics', // ca - default project (second in defaultProjectNames)
        'User Services',  // usrv - default project (third in defaultProjectNames)
        'Other Project',  // other-project - regular project
        'Links',
        'Self Service',
        'AI Arena'
      ];

      expect(screen.getByTestId('sidebar-items-count')).toHaveTextContent('9');
      
      expectedSidebarItems.forEach((item, index) => {
        expect(screen.getByTestId(`sidebar-item-${index}`)).toHaveTextContent(item);
      });
    });

    it('should order default projects (cis20, ca, usrv) at the top', () => {
      // Create test data with projects in random order to verify sorting
      const unorderedProjects: Project[] = [
        {
          id: '4',
          name: 'other-project',
          title: 'Other Project',
          description: 'Some other project'
        },
        {
          id: '2',
          name: 'usrv',
          title: 'User Services',
          description: 'User management services'
        },
        {
          id: '5',
          name: 'another-project',
          title: 'Another Project',
          description: 'Another regular project'
        },
        {
          id: '3',
          name: 'ca',
          title: 'Customer Analytics',
          description: 'Analytics platform for customer data'
        },
        {
          id: '1',
          name: 'cis20',
          title: 'CIS 2.0',
          description: 'Customer Information System 2.0'
        }
      ];

      mockUseFetchProjects.mockReturnValue({
        data: unorderedProjects,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        remove: vi.fn(),
      });

      renderWithProviders(<TestComponent />);

      const projectsContainer = screen.getByTestId('projects');
      const projectElements = projectsContainer.children;

      // Verify the order: default projects first (cis20, ca, usrv), then others
      expect(projectElements[0]).toHaveAttribute('data-testid', 'project-cis20');
      expect(projectElements[1]).toHaveAttribute('data-testid', 'project-ca');
      expect(projectElements[2]).toHaveAttribute('data-testid', 'project-usrv');
      expect(projectElements[3]).toHaveAttribute('data-testid', 'project-other-project');
      expect(projectElements[4]).toHaveAttribute('data-testid', 'project-another-project');
    });

    it('should handle empty projects array', () => {
      mockUseFetchProjects.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        remove: vi.fn(),
      });

      renderWithProviders(<TestComponent />);

      expect(screen.getByTestId('projects-count')).toHaveTextContent('0');
      
      // Should still have static sidebar items
      const expectedSidebarItems = [
        'Home',
        'Teams',
        'Links',
        'Self Service',
        'AI Arena'
      ];

      expect(screen.getByTestId('sidebar-items-count')).toHaveTextContent('5');
    });

    it('should prefer project title over name in sidebar', () => {
      const projectsWithMissingTitle: Project[] = [
        {
          id: '1',
          name: 'project-name',
          title: 'Project Title',
          description: 'Project with title'
        },
        {
          id: '2',
          name: 'project-no-title',
          title: '',
          description: 'Project without title'
        }
      ];

      mockUseFetchProjects.mockReturnValue({
        data: projectsWithMissingTitle,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle',
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPending: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        remove: vi.fn(),
      });

      renderWithProviders(<TestComponent />);

      // Should use title when available, fallback to name when title is empty
      expect(screen.getByTestId('sidebar-item-2')).toHaveTextContent('Project Title');
      expect(screen.getByTestId('sidebar-item-3')).toHaveTextContent('project-no-title');
    });
  });

  describe('useProjectsContext', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useProjectsContext must be used within a ProjectsProvider');
      
      consoleSpy.mockRestore();
    });
  });
});
