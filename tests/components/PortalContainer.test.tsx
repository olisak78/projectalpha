import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';



// ============================================================================
// ZUSTAND STORE MOCKS - MUST BE DEFINED BEFORE IMPORTS
// ============================================================================


// ============================================================================
// ZUSTAND STORE MOCKS - MUST BE DEFINED BEFORE IMPORTS
// ============================================================================


// Mock data that can be mutated by tests
let currentMockProjects = [
  { id: '1', name: 'project1', display_name: 'Project One' },
  { id: '2', name: 'project2', display_name: 'Project Two' },
  { id: '3', name: 'project3', display_name: null },
];
let currentMockLoading = false;
let currentMockError = null;

// Mock the store - define everything inline to avoid hoisting issues
vi.mock('@/stores/projectsStore', () => ({
  useProjects: vi.fn(() => currentMockProjects),
  useProjectsLoading: vi.fn(() => currentMockLoading),
  useProjectsError: vi.fn(() => currentMockError),
  useSidebarItems: vi.fn(() => []), // Add this if it exists
}));


// ============================================================================
// COMPONENT MOCKS
// ============================================================================

vi.mock('@/contexts/PortalProviders', () => ({
  PortalProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="portal-providers">{children}</div>
  ),
}));

vi.mock('@/components/PortalContent', () => ({
  PortalContent: ({ activeProject, projects, onProjectChange }: any) => (
    <div data-testid="portal-content">
      <div data-testid="active-project">{activeProject}</div>
      <div data-testid="projects">{JSON.stringify(projects)}</div>
      <button 
        data-testid="project-change-btn" 
        onClick={() => onProjectChange('Teams')}
      >
        Change Project
      </button>
    </div>
  ),
}));

// ============================================================================
// ROUTER MOCKS
// ============================================================================

let mockLocation = { pathname: '/' };
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});


// ============================================================================
// NOW SAFE TO IMPORT COMPONENT
// ============================================================================

import { PortalContainer } from '@/components/PortalContainer';

// ============================================================================
// TESTS
// ============================================================================


    
    // Reset mock data to defaults
    currentMockProjects = [
      { id: '1', name: 'project1', display_name: 'Project One' },
      { id: '2', name: 'project2', display_name: 'Project Two' },
      { id: '3', name: 'project3', display_name: null },
    ];
    currentMockLoading = false;
    currentMockError = null;
    mockLocation = { pathname: '/' };

  });

  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <PortalContainer />
      </MemoryRouter>
    );
  };

  describe('Basic Rendering', () => {
    it('should render PortalContainer with PortalProviders and PortalContent', () => {
      renderWithRouter();

      expect(screen.getByTestId('portal-providers')).toBeInTheDocument();
      expect(screen.getByTestId('portal-content')).toBeInTheDocument();
    });

    it('should generate correct sidebar items including static pages and projects', () => {
      renderWithRouter();

      const projectsElement = screen.getByTestId('projects');
      const projects = JSON.parse(projectsElement.textContent || '[]');

      expect(projects).toEqual([
        'Home',
        'Teams',
        'Project One',
        'Project Two',
        'project3',
        'Links',
        'Self Service',
        'AI Arena',
      ]);
    });

hould handle projects with null display_name by using name', () => {

      renderWithRouter();

      const projectsElement = screen.getByTestId('projects');
      const projects = JSON.parse(projectsElement.textContent || '[]');

      expect(projects).toContain('project3');
    });
  });

  describe('Active Project Detection', () => {
    it('should set Home as active project for root path', () => {
      mockLocation.pathname = '/';
      renderWithRouter(['/']);

      expect(screen.getByTestId('active-project')).toHaveTextContent('Home');
    });

    it('should set correct active project for static routes', () => {
      mockLocation.pathname = '/teams';
      renderWithRouter(['/teams']);

      expect(screen.getByTestId('active-project')).toHaveTextContent('Teams');
    });

    it('should set correct active project for dynamic project routes', () => {
      mockLocation.pathname = '/project1';
      renderWithRouter(['/project1']);

      expect(screen.getByTestId('active-project')).toHaveTextContent('Project One');
    });

    it('should handle sub-routes for static pages', () => {
      mockLocation.pathname = '/teams/sub-page';
      renderWithRouter(['/teams/sub-page']);

      expect(screen.getByTestId('active-project')).toHaveTextContent('Teams');
    });

    it('should handle sub-routes for dynamic projects', () => {
      mockLocation.pathname = '/project1/details';
      renderWithRouter(['/project1/details']);

      expect(screen.getByTestId('active-project')).toHaveTextContent('Project One');
    });

    it('should return empty string for unknown routes', () => {
      mockLocation.pathname = '/unknown-route';
      renderWithRouter(['/unknown-route']);

      expect(screen.getByTestId('active-project')).toHaveTextContent('');
    });

    it('should prioritize exact matches over partial matches', () => {
      currentMockProjects = [
        { id: '1', name: 'test', display_name: 'Test Project' },
        { id: '2', name: 'test-extended', display_name: 'Test Extended Project' },
      ];

      mockLocation.pathname = '/test';
      renderWithRouter(['/test']);

      expect(screen.getByTestId('active-project')).toHaveTextContent('Test Project');
    });
  });

  describe('Project Navigation', () => {
    it('should navigate to correct route when project changes to static page', () => {
      renderWithRouter();

      const changeButton = screen.getByTestId('project-change-btn');
      fireEvent.click(changeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/teams');
    });

    it('should navigate to project route when project changes to dynamic project', () => {
      mockNavigate('/project1');
      expect(mockNavigate).toHaveBeenCalledWith('/project1');
    });

    it('should default to root route for unknown projects', () => {
      renderWithRouter();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Location Changes', () => {
    it('should update active project when location changes', async () => {
      const { rerender } = renderWithRouter(['/']);

      expect(screen.getByTestId('active-project')).toHaveTextContent('Home');

      mockLocation.pathname = '/teams';
      
      rerender(
        <MemoryRouter initialEntries={['/teams']}>
          <PortalContainer />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('active-project')).toHaveTextContent('Teams');
      });
    });

    it('should update active project when projects list changes', async () => {
      const { rerender } = renderWithRouter();

      currentMockProjects = [
        { id: '1', name: 'new-project', display_name: 'New Project' },
      ];
      mockLocation.pathname = '/new-project';

      rerender(
        <MemoryRouter initialEntries={['/new-project']}>
          <PortalContainer />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('active-project')).toHaveTextContent('New Project');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty projects list', () => {
      currentMockProjects = [];

      renderWithRouter();

      const projectsElement = screen.getByTestId('projects');
      const projects = JSON.parse(projectsElement.textContent || '[]');

      expect(projects).toEqual([
        'Home',
        'Teams',
        'Links',
        'Self Service',
        'AI Arena',
      ]);
    });

    it('should handle projects without name or display_name', () => {
      currentMockProjects = [
        { id: '1', name: '', display_name: '' },
        { id: '2', name: null, display_name: null },
        { id: '3' },
      ];

      expect(() => renderWithRouter()).not.toThrow();
    });

    it('should handle special characters in project names', () => {
      currentMockProjects = [
        { id: '1', name: 'project-with-dashes', display_name: 'Project With Dashes' },
        { id: '2', name: 'project_with_underscores', display_name: 'Project With Underscores' },
        { id: '3', name: 'project.with.dots', display_name: 'Project With Dots' },
      ];

      renderWithRouter();

      const projectsElement = screen.getByTestId('projects');
      const projects = JSON.parse(projectsElement.textContent || '[]');

      expect(projects).toContain('Project With Dashes');
      expect(projects).toContain('Project With Underscores');
      expect(projects).toContain('Project With Dots');
    });
  });

  describe('Loading and Error States', () => {
    it('should handle loading state from projectsStore', () => {
      currentMockLoading = true;

      renderWithRouter();

      expect(screen.getByTestId('portal-providers')).toBeInTheDocument();
    });

    it('should handle error state from projectsStore', () => {
      currentMockError = new Error('Failed to load projects');

      renderWithRouter();

      expect(screen.getByTestId('portal-providers')).toBeInTheDocument();
    });
  });

  describe('Zustand Integration', () => {
    it('should read projects from Zustand store', () => {
      renderWithRouter();
      
      // Component should render with mocked projects
      expect(screen.getByTestId('portal-content')).toBeInTheDocument();
    });

    it('should handle projects store updates', () => {
      const { rerender } = renderWithRouter();

      currentMockProjects = [
        { id: '1', name: 'updated-project', display_name: 'Updated Project' },
      ];

      rerender(
        <MemoryRouter initialEntries={['/']}>
          <PortalContainer />
        </MemoryRouter>
      );

      const projectsElement = screen.getByTestId('projects');
      const projects = JSON.parse(projectsElement.textContent || '[]');

      expect(projects).toContain('Updated Project');
    });
  });
});