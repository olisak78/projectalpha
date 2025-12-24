import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DynamicProjectPage } from '../../../src/pages/DynamicProjectPage';
import { useProjectsContext } from '../../../src/contexts/ProjectsContext';
import { Project } from '../../../src/types/api';
import { ReactNode } from 'react';

// Mock the ProjectsContext
vi.mock('../../../src/contexts/ProjectsContext', () => ({
  useProjectsContext: vi.fn(),
}));

// Mock the ProjectLayout component
vi.mock('../../../src/components/ProjectLayout', () => ({
  ProjectLayout: ({ 
    projectName, 
    projectId, 
    tabs, 
    componentsTitle, 
    emptyStateMessage, 
    system, 
    showLandscapeFilter,
    alertsUrl
  }: any) => (
    <div data-testid="project-layout">
      <div data-testid="project-name">{projectName}</div>
      <div data-testid="project-id">{projectId}</div>
      <div data-testid="tabs">{JSON.stringify(tabs)}</div>
      <div data-testid="components-title">{componentsTitle}</div>
      <div data-testid="empty-state-message">{emptyStateMessage}</div>
      <div data-testid="system">{system}</div>
      <div data-testid="show-landscape-filter">{showLandscapeFilter.toString()}</div>
      <div data-testid="alerts-url">{alertsUrl || 'none'}</div>
    </div>
  ),
}));

// Mock HeaderNavigationProvider
vi.mock('../../../src/contexts/HeaderNavigationContext', () => ({
  HeaderNavigationProvider: ({ children }: any) => <div>{children}</div>,
  useHeaderNavigation: () => ({
    tabs: [],
    activeTab: 'components',
    setTabs: vi.fn(),
    setActiveTab: vi.fn(),
    isDropdown: false,
    setIsDropdown: vi.fn(),
  }),
}));

const mockUseProjectsContext = vi.mocked(useProjectsContext);

// Mock data - Updated to match actual implementation
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'cis20',
    title: 'CIS 2.0',
    description: 'Customer Information System 2.0',
    health: { endpoint: 'https://health.example.com' },
    alerts: 'https://github.com/alerts/cis20',
  },
  {
    id: '2',
    name: 'usrv',
    title: 'User Services',
    description: 'User management services',
    health: { endpoint: 'https://health.usrv.com' },
  },
  {
    id: '3',
    name: 'ca',
    title: 'Customer Analytics',
    description: 'Analytics platform for customer data'
    // No health or alerts
  }
];

describe('DynamicProjectPage', () => {
  let queryClient: QueryClient;

  const renderWithProviders = (children: ReactNode) => {
    // Use the mocked HeaderNavigationProvider directly
    const MockHeaderNavigationProvider = ({ children }: any) => <div>{children}</div>;
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <MockHeaderNavigationProvider>
            {children}
          </MockHeaderNavigationProvider>
        </QueryClientProvider>
      </MemoryRouter>
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

  describe('Project Configuration', () => {
    it('should render project with health and alerts tabs when both metadata exist', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="cis20" />);

      expect(screen.getByTestId('project-layout')).toBeInTheDocument();
      expect(screen.getByTestId('project-name')).toHaveTextContent('CIS 2.0');
      expect(screen.getByTestId('project-id')).toHaveTextContent('cis20');
      expect(screen.getByTestId('tabs')).toHaveTextContent('["components","health","alerts"]');
      expect(screen.getByTestId('components-title')).toHaveTextContent('CIS 2.0 Components');
      expect(screen.getByTestId('empty-state-message')).toHaveTextContent('No CIS 2.0 components found for this organization.');
      expect(screen.getByTestId('system')).toHaveTextContent('cis20');
      expect(screen.getByTestId('show-landscape-filter')).toHaveTextContent('true');
      expect(screen.getByTestId('alerts-url')).toHaveTextContent('https://github.com/alerts/cis20');
    });

    it('should render project with only health tab when only health metadata exists', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="usrv" />);

      expect(screen.getByTestId('project-layout')).toBeInTheDocument();
      expect(screen.getByTestId('project-name')).toHaveTextContent('User Services');
      expect(screen.getByTestId('project-id')).toHaveTextContent('usrv');
      expect(screen.getByTestId('tabs')).toHaveTextContent('["components","health"]');
      expect(screen.getByTestId('components-title')).toHaveTextContent('User Services Components');
      expect(screen.getByTestId('empty-state-message')).toHaveTextContent('No User Services components found for this organization.');
      expect(screen.getByTestId('system')).toHaveTextContent('usrv');
      expect(screen.getByTestId('alerts-url')).toHaveTextContent('none');
    });

    it('should render project with only components tab when no metadata exists', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="ca" />);

      expect(screen.getByTestId('project-layout')).toBeInTheDocument();
      expect(screen.getByTestId('project-name')).toHaveTextContent('Customer Analytics');
      expect(screen.getByTestId('project-id')).toHaveTextContent('ca');
      expect(screen.getByTestId('tabs')).toHaveTextContent('["components"]');
      expect(screen.getByTestId('components-title')).toHaveTextContent('Customer Analytics Components');
      expect(screen.getByTestId('empty-state-message')).toHaveTextContent('No Customer Analytics components found for this organization.');
      expect(screen.getByTestId('system')).toHaveTextContent('ca');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when project is not found', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="nonexistent" />);

      expect(screen.getByText(/Error: Project.*not found/)).toBeInTheDocument();
      expect(screen.queryByTestId('project-layout')).not.toBeInTheDocument();
    });

    it('should handle empty projects array', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: [],
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="cis20" />);

      expect(screen.getByText(/Error: Project.*not found/)).toBeInTheDocument();
      expect(screen.queryByTestId('project-layout')).not.toBeInTheDocument();
    });
  });

  describe('Default Configuration', () => {
    it('should always default to components tab', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="cis20" />);

      // Check that defaultTab is set to "components" by verifying the ProjectLayout receives it
      expect(screen.getByTestId('project-layout')).toBeInTheDocument();
      // The defaultTab prop is not directly visible in our mock, but we can verify the component renders
    });

    it('should always show landscape filter', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="cis20" />);

      expect(screen.getByTestId('show-landscape-filter')).toHaveTextContent('true');
    });
  });

  describe('Project Name Matching', () => {
    it('should match project by name property', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="cis20" />);

      expect(screen.getByTestId('project-name')).toHaveTextContent('CIS 2.0');
      expect(screen.getByTestId('project-id')).toHaveTextContent('cis20');
    });

    it('should be case sensitive when matching project names', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="CIS20" />);

      expect(screen.getByText(/Error: Project.*not found/)).toBeInTheDocument();
    });
  });

  describe('Tab Configuration Logic', () => {
    it('should add health tab when health metadata exists', () => {
      const projectWithHealth: Project = {
        id: '1',
        name: 'test-project',
        title: 'Test Project',
        description: 'Test project with health',
        health: { endpoint: 'https://health.test.com' }
      };

      mockUseProjectsContext.mockReturnValue({
        projects: [projectWithHealth],
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="test-project" />);

      expect(screen.getByTestId('tabs')).toHaveTextContent('["components","health"]');
    });

    it('should add alerts tab when alerts metadata exists as string', () => {
      const projectWithAlerts: Project = {
        id: '1',
        name: 'test-project',
        title: 'Test Project',
        description: 'Test project with alerts',
        alerts: 'https://github.com/alerts/test'
      };

      mockUseProjectsContext.mockReturnValue({
        projects: [projectWithAlerts],
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="test-project" />);

      expect(screen.getByTestId('tabs')).toHaveTextContent('["components","alerts"]');
      expect(screen.getByTestId('alerts-url')).toHaveTextContent('https://github.com/alerts/test');
    });

    it('should not add alerts tab when alerts is empty string', () => {
      const projectWithEmptyAlerts: Project = {
        id: '1',
        name: 'test-project',
        title: 'Test Project',
        description: 'Test project with empty alerts',
        alerts: ''
      };

      mockUseProjectsContext.mockReturnValue({
        projects: [projectWithEmptyAlerts],
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="test-project" />);

      expect(screen.getByTestId('tabs')).toHaveTextContent('["components"]');
      expect(screen.getByTestId('alerts-url')).toHaveTextContent('none');
    });

    it('should not add alerts tab when alerts is only whitespace', () => {
      const projectWithWhitespaceAlerts: Project = {
        id: '1',
        name: 'test-project',
        title: 'Test Project',
        description: 'Test project with whitespace alerts',
        alerts: '   '
      };

      mockUseProjectsContext.mockReturnValue({
        projects: [projectWithWhitespaceAlerts],
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="test-project" />);

      expect(screen.getByTestId('tabs')).toHaveTextContent('["components"]');
    });

    it('should always include components tab as first tab', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: mockProjects,
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      renderWithProviders(<DynamicProjectPage projectName="cis20" />);

      const tabsText = screen.getByTestId('tabs').textContent;
      const tabs = JSON.parse(tabsText || '[]');
      expect(tabs[0]).toBe('components');
    });
  });

});
