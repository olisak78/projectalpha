import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProjectLayout, ProjectLayoutProps } from '../../src/components/ProjectLayout';
import React, { ReactNode } from 'react';

// Simplified mocks to avoid memory issues
vi.mock('@/components/BreadcrumbPage', () => ({
  BreadcrumbPage: ({ children }: { children: ReactNode }) => 
    React.createElement('div', { 'data-testid': 'breadcrumb-page' }, children),
}));

vi.mock('@/components/LandscapeLinksSection', () => ({
  LandscapeLinksSection: () => 
    React.createElement('div', { 'data-testid': 'landscape-links-section' }),
}));

vi.mock('@/components/ComponentsTabContent', () => ({
  ComponentsTabContent: ({ 
    title, 
    system, 
    emptyStateMessage, 
    showLandscapeFilter,
    summary,
    isLoadingHealthSummary,
    onComponentClick
  }: any) => 
    React.createElement('div', { 'data-testid': 'components-tab-content' }, 
      React.createElement('div', { 'data-testid': 'components-title' }, title || ''),
      React.createElement('div', { 'data-testid': 'components-system' }, system),
      React.createElement('div', { 'data-testid': 'components-empty-message' }, emptyStateMessage),
      React.createElement('div', { 'data-testid': 'components-show-filter' }, showLandscapeFilter?.toString()),
      React.createElement('div', { 'data-testid': 'components-has-click-handler' }, (!!onComponentClick).toString()),
      summary && React.createElement('div', { 'data-testid': 'health-overview' },
        React.createElement('div', { 'data-testid': 'health-overview-loading' }, isLoadingHealthSummary?.toString()),
        React.createElement('div', { 'data-testid': 'health-overview-summary' }, JSON.stringify(summary || {}))
      )
    ),
}));

vi.mock('@/components/Health/HealthOverview', () => ({
  HealthOverview: ({ summary, isLoading }: any) => 
    React.createElement('div', { 'data-testid': 'health-overview' },
      React.createElement('div', { 'data-testid': 'health-overview-loading' }, isLoading?.toString()),
      React.createElement('div', { 'data-testid': 'health-overview-summary' }, JSON.stringify(summary || {}))
    ),
}));

vi.mock('@/components/Health/HealthDashboard', () => ({
  HealthDashboard: ({ projectId }: any) => 
    React.createElement('div', { 'data-testid': 'health-dashboard' },
      React.createElement('div', { 'data-testid': 'health-dashboard-project' }, projectId)
    ),
}));

vi.mock('@/pages/AlertsPage', () => ({
  default: ({ projectId, projectName, alertsUrl }: any) => 
    React.createElement('div', { 'data-testid': 'alerts-page' },
      React.createElement('div', { 'data-testid': 'alerts-project-id' }, projectId),
      React.createElement('div', { 'data-testid': 'alerts-project-name' }, projectName),
      React.createElement('div', { 'data-testid': 'alerts-url' }, alertsUrl || 'no-url')
    ),
}));

// Mock functions for testing interactions
const mockSetTabs = vi.fn();
const mockSyncTabWithUrl = vi.fn();
const mockRefetch = vi.fn();
const mockGetSelectedLandscapeForProject = vi.fn(() => 'test');
const mockSetSelectedLandscapeForProject = vi.fn();
const mockSetShowLandscapeDetails = vi.fn();

// Minimal context mocks
vi.mock('@/contexts/HeaderNavigationContext', () => ({
  useHeaderNavigation: () => ({ setTabs: mockSetTabs, activeTab: 'components' }),
}));

vi.mock('@/contexts/hooks', () => ({
  usePortalState: () => ({ 
    selectedLandscape: 'test', 
    setSelectedLandscape: vi.fn(), 
    setShowLandscapeDetails: mockSetShowLandscapeDetails,
    getSelectedLandscapeForProject: mockGetSelectedLandscapeForProject,
    setSelectedLandscapeForProject: mockSetSelectedLandscapeForProject
  }),
  useLandscapeManagement: () => ({ getFilteredLandscapeIds: vi.fn(), getProductionLandscapeIds: vi.fn() }),
  useComponentManagement: () => ({ componentFilter: '', setComponentFilter: vi.fn(), getAvailableComponents: vi.fn() }),
  useFeatureToggles: () => ({ 
    featureToggles: [], expandedToggles: {}, toggleFilter: '', setToggleFilter: vi.fn(),
    toggleFeature: vi.fn(), toggleExpanded: vi.fn(), bulkToggle: vi.fn(), 
    getGroupStatus: vi.fn(), getFilteredToggles: vi.fn() 
  }),
}));

vi.mock('@/hooks/useTabRouting', () => ({
  useTabRouting: () => ({ currentTabFromUrl: 'components', syncTabWithUrl: mockSyncTabWithUrl }),
}));

vi.mock('@/hooks/api/useComponents', () => ({
  useComponentsByProject: () => ({ 
    data: [
      { id: 'comp-1', name: 'test-component', title: 'Test Component', project_id: 'test-project' }
    ], 
    isLoading: false, 
    error: null, 
    refetch: mockRefetch 
  }),
}));

vi.mock('@/hooks/api/useLandscapes', () => ({
  useLandscapesByProject: () => ({ data: [] }),
}));

vi.mock('@/hooks/api/useTeams', () => ({
  useTeams: () => ({ data: { teams: [] } }),
}));

vi.mock('@/hooks/api/useHealth', () => ({
  useHealth: () => ({ 
    healthChecks: [], 
    summary: { total: 10, up: 8, down: 2, error: 0, avgResponseTime: 150 }, 
    isLoading: false 
  }),
}));

// Create configurable mocks for dynamic testing
const mockUseHeaderNavigation = vi.fn(() => ({ setTabs: mockSetTabs, activeTab: 'components' }));
const mockUseComponentsByProject = vi.fn(() => ({ 
  data: [
    { id: 'comp-1', name: 'test-component', title: 'Test Component', project_id: 'test-project' }
  ], 
  isLoading: false, 
  error: null, 
  refetch: mockRefetch 
}));
const mockUseLandscapesByProject = vi.fn(() => ({ data: [] }));
const mockUseTeams = vi.fn(() => ({ data: { teams: [] } }));
const mockUseHealth = vi.fn(() => ({ 
  healthChecks: [], 
  summary: { total: 10, up: 8, down: 2, error: 0, avgResponseTime: 150 }, 
  isLoading: false 
}));

// Add missing component mocks
vi.mock('@/components/ViewSwitcher', () => ({
  ViewSwitcher: () => React.createElement('div', { 'data-testid': 'view-switcher' }),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => 
    React.createElement('div', { 'data-testid': 'badge' }, children),
}));

vi.mock('@/components/HealthStatusFilter', () => ({
  HealthStatusFilter: () => React.createElement('div', { 'data-testid': 'health-status-filter' }),
}));

vi.mock('@/contexts/ComponentDisplayContext', () => ({
  ComponentDisplayProvider: ({ children }: { children: ReactNode }) => 
    React.createElement('div', { 'data-testid': 'component-display-provider' }, children),
}));

vi.mock('@/services/LandscapesApi', () => ({
  getDefaultLandscapeId: vi.fn(() => 'default-landscape'),
}));

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('ProjectLayout', () => {
  let queryClient: QueryClient;

  const defaultProps: ProjectLayoutProps = {
    projectName: 'Test Project',
    projectId: 'test-project',
    tabs: ['components'],
  };

  const renderComponent = (props: Partial<ProjectLayoutProps> = {}) => {
    return render(
      React.createElement(MemoryRouter, {},
        React.createElement(QueryClientProvider, { client: queryClient },
          React.createElement(ProjectLayout, { ...defaultProps, ...props })
        )
      )
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render core layout structure', () => {
      renderComponent();
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
      expect(screen.getByTestId('landscape-links-section')).toBeInTheDocument();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should render with custom children', () => {
      renderComponent({
        children: React.createElement('div', { 'data-testid': 'custom-child' }, 'Custom Content')
      });
      expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    });
  });

  describe('Props and Configuration', () => {
    it('should use default values when optional props not provided', () => {
      renderComponent();
      expect(screen.getByTestId('components-title')).toHaveTextContent('');
      expect(screen.getByTestId('components-system')).toHaveTextContent('services');
      expect(screen.getByTestId('components-show-filter')).toHaveTextContent('false');
    });

    it('should use custom prop values when provided', () => {
      renderComponent({
        system: 'microservices',
        emptyStateMessage: 'Custom empty message',
        showLandscapeFilter: true
      });
      expect(screen.getByTestId('components-system')).toHaveTextContent('microservices');
      expect(screen.getByTestId('components-empty-message')).toHaveTextContent('Custom empty message');
      expect(screen.getByTestId('components-show-filter')).toHaveTextContent('true');
    });

    it('should handle different tab configurations', () => {
      renderComponent({ tabs: ['components', 'health', 'alerts'] });
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
    });

    it('should provide onComponentClick handler', () => {
      renderComponent();
      expect(screen.getByTestId('components-has-click-handler')).toHaveTextContent('true');
    });
  });

  describe('Health Integration', () => {
    it('should show health overview when summary data is available', () => {
      renderComponent();
      expect(screen.getByTestId('health-overview')).toBeInTheDocument();
      
      const healthSummary = screen.getByTestId('health-overview-summary');
      expect(healthSummary.textContent).toContain('total');
    });

    it('should handle health loading state', () => {
      mockUseHealth.mockReturnValue({
        healthChecks: [],
        summary: null,
        isLoading: true
      });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should sync tabs with URL', () => {
      renderComponent({ tabs: ['components', 'health'] });
      expect(mockSyncTabWithUrl).toHaveBeenCalled();
    });

    it('should handle different active tab states', () => {
      mockUseHeaderNavigation.mockReturnValue({ setTabs: mockSetTabs, activeTab: 'health' });
      
      renderComponent({
        tabs: ['components', 'health'],
        defaultTab: 'health'
      });
      
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
    });
  });

  describe('Landscape Data Scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle landscapes with different route configurations', () => {
      mockUseLandscapesByProject.mockReturnValue({
        data: [
          { 
            id: 'land-1', 
            name: 'Production', 
            technical_name: 'prod',
            environment: 'production',
            isCentral: true,
            metadata: { route: 'prod.example.com' }
          } as any,
          { 
            id: 'land-2', 
            name: 'Staging', 
            technical_name: 'staging',
            isCentral: false,
            landscape_url: 'staging-fallback.example.com'
          } as any
        ]
      });
      
      renderComponent();
      expect(screen.getByTestId('landscape-links-section')).toBeInTheDocument();
    });

    it('should handle no selected landscape scenario', () => {
      mockGetSelectedLandscapeForProject.mockReturnValue(null as any);
      
      renderComponent();
      expect(screen.getByText('Select a landscape to view components')).toBeInTheDocument();
    });

    it('should handle invalid selected landscape scenario', () => {
      mockGetSelectedLandscapeForProject.mockReturnValue('invalid-landscape-id');
      mockUseLandscapesByProject.mockReturnValue({
        data: [
          { id: 'valid-landscape', name: 'Valid', technical_name: 'valid', isCentral: false } as any
        ]
      });
      
      renderComponent();
      expect(screen.getByTestId('landscape-links-section')).toBeInTheDocument();
    });
  });

  describe('Component Data Scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle components with central-service flag', () => {
      mockUseComponentsByProject.mockReturnValue({
        data: [
          { id: 'comp-1', name: 'central-comp', 'central-service': true } as any,
          { id: 'comp-2', name: 'regular-comp', 'central-service': false } as any
        ],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should handle different component loading states', () => {
      mockUseComponentsByProject.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch
      });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should handle components error state', () => {
      mockUseComponentsByProject.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to load components') as any,
        refetch: mockRefetch
      });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });
  });

  describe('Team Data Scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle teams with different metadata configurations', () => {
      mockUseTeams.mockReturnValue({
        data: {
          teams: [
            { id: 'team-1', title: 'Team Alpha', name: 'alpha', metadata: { color: '#ff0000' } },
            { id: 'team-2', name: 'beta', metadata: { color: '#00ff00' } },
            { id: 'team-3', name: 'gamma' } // No metadata
          ]
        }
      });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should handle null teams data', () => {
      mockUseTeams.mockReturnValue({
        data: null
      });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });
  });

  describe('Health Data Integration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle health checks with component mapping', () => {
      mockUseHealth.mockReturnValue({
        healthChecks: [
          { componentId: 'comp-1', status: 'up', responseTime: 100 },
          { componentId: 'comp-2', status: 'down', responseTime: 0 },
          { componentId: 'comp-3', status: 'error', responseTime: null }
        ],
        summary: { total: 3, up: 1, down: 1, error: 1, avgResponseTime: 50 },
        isLoading: false
      });
      
      renderComponent();
      expect(screen.getByTestId('health-overview')).toBeInTheDocument();
    });

    it('should handle health disabled when no landscapes', () => {
      mockUseLandscapesByProject.mockReturnValue({ data: [] });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });
  });

  describe('Landscape Effects and Central Logic', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should set default landscape when none selected', () => {
      mockGetSelectedLandscapeForProject.mockReturnValue(null);
      mockUseLandscapesByProject.mockReturnValue({
        data: [
          { id: 'land-1', name: 'Production', technical_name: 'prod', isCentral: true }
        ]
      });
      
      renderComponent();
      expect(screen.getByTestId('landscape-links-section')).toBeInTheDocument();
    });

    it('should handle central vs non-central landscape detection', () => {
      mockUseLandscapesByProject.mockReturnValue({
        data: [
          { id: 'land-1', name: 'Central', technical_name: 'central', isCentral: true },
          { id: 'land-2', name: 'Regional', technical_name: 'regional', isCentral: false }
        ]
      });
      mockGetSelectedLandscapeForProject.mockReturnValue('land-1');
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should handle no central landscapes available', () => {
      mockUseLandscapesByProject.mockReturnValue({
        data: [
          { id: 'land-1', name: 'Regional1', technical_name: 'reg1', isCentral: false },
          { id: 'land-2', name: 'Regional2', technical_name: 'reg2', isCentral: false }
        ]
      });
      
      renderComponent();
      expect(screen.queryByTestId('health-status-filter')).not.toBeInTheDocument();
    });
  });

  describe('View Controls and UI Elements', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render view controls when components and landscapes are available', () => {
      mockUseLandscapesByProject.mockReturnValue({
        data: [
          { id: 'land-1', name: 'Production', technical_name: 'prod', isCentral: true }
        ]
      });
      mockGetSelectedLandscapeForProject.mockReturnValue('land-1');
      mockUseComponentsByProject.mockReturnValue({
        data: [
          { id: 'comp-1', name: 'test-component-1', title: 'Test Component 1', project_id: 'test-project' },
          { id: 'comp-2', name: 'test-component-2', title: 'Test Component 2', project_id: 'test-project' }
        ],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });
      
      renderComponent();
      
      expect(screen.getByTestId('view-switcher')).toBeInTheDocument();
      expect(screen.getByText('Components')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveTextContent(/\d+/);
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle landscape groups with different environments', () => {
      mockUseLandscapesByProject.mockReturnValue({
        data: [
          { id: 'land-1', name: 'Prod', technical_name: 'prod', environment: 'production', isCentral: true },
          { id: 'land-2', name: 'Dev', technical_name: 'dev', environment: 'development', isCentral: false },
          { id: 'land-3', name: 'Test', technical_name: 'test', environment: null, isCentral: false }
        ]
      });
      
      renderComponent();
      expect(screen.getByTestId('landscape-links-section')).toBeInTheDocument();
    });

    it('should handle visibleComponents filtering with central and non-central landscapes', () => {
      mockUseLandscapesByProject.mockReturnValue({
        data: [
          { id: 'land-1', name: 'Central', technical_name: 'central', isCentral: true }
        ]
      });
      mockGetSelectedLandscapeForProject.mockReturnValue('land-1');
      mockUseComponentsByProject.mockReturnValue({
        data: [
          { id: 'comp-1', name: 'central-comp', 'central-service': true },
          { id: 'comp-2', name: 'regular-comp', 'central-service': false }
        ],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should handle all props with custom values', () => {
      renderComponent({
        projectName: 'Custom Project',
        projectId: 'custom-project-123',
        defaultTab: 'health',
        tabs: ['components', 'health', 'alerts'],
        componentsTitle: 'Custom Components Title',
        emptyStateMessage: 'Custom empty state message',
        system: 'distributed-services',
        showLandscapeFilter: true,
        alertsUrl: 'https://custom-alerts.example.com'
      });
      
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
    });

    it('should handle null/empty data scenarios', () => {
      mockUseLandscapesByProject.mockReturnValue({ data: null });
      mockUseComponentsByProject.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });
      
      renderComponent();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });
  });
});
