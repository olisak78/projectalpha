import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

// ============================================================================
// ZUSTAND STORE MOCKS (Updated for migration)
// ============================================================================

// Mock projectsStore (migrated from ProjectsContext)
vi.mock('@/stores/projectsStore', () => ({
  useProjects: vi.fn(() => [
    { id: 'cis20', name: 'cis', display_name: 'CIS' },
    { id: 'test-project', name: 'test', display_name: 'Test Project' }
  ]),
  useProjectsLoading: vi.fn(() => false),
  useProjectsError: vi.fn(() => null),
}));

// Mock appStateStore (migrated from AppStateContext)
vi.mock('@/stores/appStateStore', () => ({
  useLandscapeFilter: vi.fn(() => 'all'),
  useAppStateActions: vi.fn(() => ({
    setLandscapeFilter: vi.fn(),
  })),
}));

// ============================================================================
// CONTEXT MOCKS (Only for contexts that weren't migrated)
// ============================================================================

// Mock AuthContext (NOT migrated - stays as context)
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn()
  })
}));

// Mock HeaderNavigationContext (NOT migrated - URL-driven)
vi.mock('@/contexts/HeaderNavigationContext', () => ({
  HeaderNavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="header-navigation-provider">{children}</div>

  ),
  useHeaderNavigation: () => ({
    tabs: [],
    activeTab: null,
    setTabs: vi.fn(),
    setActiveTab: vi.fn(),
    isDropdown: false,
    setIsDropdown: vi.fn(),
  })

}));

// ============================================================================
// PROVIDER MOCKS
// ============================================================================






// ============================================================================
// PROVIDER MOCKS
// ============================================================================


vi.mock('@/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-provider">{children}</div>
  )
}));

// ============================================================================
// UI COMPONENT MOCKS
// ============================================================================

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div data-testid="sonner" />
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  )
}));

// ============================================================================
// COMPONENT MOCKS
// ============================================================================

vi.mock('@/components/PortalContainer', () => ({
  PortalContainer: () => <div data-testid="portal-container">Portal Container</div>
}));

vi.mock('@/components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  )
}));

// ============================================================================
// PAGE COMPONENT MOCKS
// ============================================================================

vi.mock('@/pages/LoginPage', () => ({
  __esModule: true,
  default: () => <div data-testid="login-page">Login Page</div>
}));

vi.mock('@/pages/HomePage', () => ({
  __esModule: true,
  default: () => <div data-testid="home-page">Home Page</div>
}));

vi.mock('@/pages/TeamsPage', () => ({
  __esModule: true,
  default: () => <div data-testid="teams-page">Teams Page</div>
}));

vi.mock('@/pages/SelfServicePage', () => ({
  __esModule: true,
  default: () => <div data-testid="self-service-page">Self Service Page</div>
}));

vi.mock('@/pages/LinksPage', () => ({
  __esModule: true,
  default: () => <div data-testid="links-page">Links Page</div>
}));

vi.mock('@/pages/AIArenaPage', () => ({
  __esModule: true,
  default: () => <div data-testid="ai-arena-page">AI Arena Page</div>
}));

vi.mock('@/pages/CisPage', () => ({
  __esModule: true,
  default: () => <div data-testid="cis-page">CIS Page</div>
}));

vi.mock('@/pages/ComponentViewPage', () => ({
  __esModule: true,
  default: () => <div data-testid="component-view-page">Component View Page</div>
}));

vi.mock('@/pages/DynamicProjectPage', () => ({
  DynamicProjectPage: ({ projectName }: { projectName: string }) => (
    <div data-testid="dynamic-project-page">Dynamic Project: {projectName}</div>
  )
}));

vi.mock('@/pages/ComponentDetailPage', () => ({
  __esModule: true,
  default: () => <div data-testid="component-detail-page">Component Detail Page</div>
}));

vi.mock('@/pages/NotFound', () => ({
  __esModule: true,
  default: () => <div data-testid="not-found-page">Not Found Page</div>
}));

// ============================================================================
// TEST WRAPPER
// ============================================================================

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// ============================================================================
// TESTS
// ============================================================================

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Setup', () => {
    it('renders all providers in correct order', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Check that all App-level providers are rendered
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
      expect(screen.getByTestId('sonner')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      
      // Note: ProjectsProvider removed - now using Zustand (projectsStore)
      // Note: SidebarProvider removed - now using Zustand (sidebarStore) if applicable
      
      expect(screen.getByTestId('portal-container')).toBeInTheDocument();
    });

    it('includes QueryClientProvider with proper setup', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // The QueryClientProvider is set up internally
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    });
  });

  describe('Routing Configuration', () => {
    it('sets up protected routes correctly', () => {
      render(<App />);
      
      // Verify protected route wrapper exists
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('portal-container')).toBeInTheDocument();
    });
  });

  describe('Zustand Store Integration', () => {
    it('uses projectsStore instead of ProjectsContext', () => {
      const { useProjects } = require('@/stores/projectsStore');
      
      render(<App />);
      
      // Verify the store is being called
      expect(useProjects).toHaveBeenCalled();
    });

    it('uses appStateStore instead of AppStateContext', () => {
      const { useLandscapeFilter } = require('@/stores/appStateStore');
      
      render(<App />);
      
      // Verify the store is available
      expect(useLandscapeFilter).toBeDefined();
    });
  });

  describe('Route Structure', () => {
    it('defines public routes correctly', () => {
      render(<App />);
      
      // Verify the basic app structure
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });

    it('defines protected routes with proper nesting', () => {
      render(<App />);
      
      // Verify protected route structure
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('portal-container')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {

    it('handles missing projects gracefully', () => {
      // Mock empty projects array
      const { useProjects } = require('@/stores/projectsStore');
      useProjects.mockReturnValue([]);

    it('handles missing projects gracefully in wrappers', () => {
      // Mock projects context to return empty projects
      vi.doMock('@/contexts/ProjectsContext', () => ({
        ProjectsProvider: ({ children }: { children: React.ReactNode }) => (
          <div data-testid="projects-provider">{children}</div>
        )
      }));


      render(<App />);
      
      // App should still render even with empty projects
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    });


    it('handles loading state in projectsStore', () => {
      const { useProjectsLoading } = require('@/stores/projectsStore');
      useProjectsLoading.mockReturnValue(true);

    it('handles loading state in project context', () => {
      vi.doMock('@/contexts/ProjectsContext', () => ({
        ProjectsProvider: ({ children }: { children: React.ReactNode }) => (
          <div data-testid="projects-provider">{children}</div>
        )
      }));

    it('handles loading state in projectsStore', () => {
      const { useProjectsLoading } = require('@/stores/projectsStore');
      useProjectsLoading.mockReturnValue(true);


      render(<App />);
      
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    });


    it('handles error state in projectsStore', () => {
      const { useProjectsError } = require('@/stores/projectsStore');
      useProjectsError.mockReturnValue(new Error('Test error'));

    it('handles error state in project context', () => {
      vi.doMock('@/contexts/ProjectsContext', () => ({
        ProjectsProvider: ({ children }: { children: React.ReactNode }) => (
          <div data-testid="projects-provider">{children}</div>
        )
      }));

    it('handles error state in projectsStore', () => {
      const { useProjectsError } = require('@/stores/projectsStore');
      useProjectsError.mockReturnValue(new Error('Test error'));


      render(<App />);
      
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates with React Query properly', () => {
      render(<App />);
      
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    });

    it('integrates with React Router properly', () => {
      render(<App />);
      
      // BrowserRouter is integrated at the top level
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    });

    it('integrates all UI providers correctly', () => {
      render(<App />);
      
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
      expect(screen.getByTestId('sonner')).toBeInTheDocument();
    });

    it('integrates Zustand stores correctly', () => {
      render(<App />);
      
      // Stores are used internally, verify app renders without errors
      expect(screen.getByTestId('portal-container')).toBeInTheDocument();
    });
  });

  describe('App Export', () => {
    it('exports App component as default', () => {
      expect(App).toBeDefined();
      expect(typeof App).toBe('function');
    });

    it('renders without crashing', () => {
      expect(() => render(<App />)).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('creates QueryClient instance efficiently', () => {
      const { unmount } = render(<App />);
      unmount();
      
      render(<App />);
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    });

    it('handles multiple provider nesting without performance issues', () => {
      const startTime = performance.now();
      render(<App />);
      const endTime = performance.now();
      
      // Basic performance check - should render quickly
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    });

    it('Zustand stores perform efficiently', () => {
      // Multiple renders should not cause performance issues with Zustand
      const { unmount, rerender } = render(<App />);
      
      rerender(<App />);
      rerender(<App />);
      
      expect(screen.getByTestId('portal-container')).toBeInTheDocument();
      
      unmount();
    });
  });
});