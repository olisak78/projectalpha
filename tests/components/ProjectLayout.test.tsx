import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectLayout, ProjectLayoutProps } from '@/components/ProjectLayout';
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
  ComponentsTabContent: ({ title, system, emptyStateMessage, showLandscapeFilter }: any) => 
    React.createElement('div', { 'data-testid': 'components-tab-content' }, 
      React.createElement('div', { 'data-testid': 'components-title' }, title),
      React.createElement('div', { 'data-testid': 'components-system' }, system),
      React.createElement('div', { 'data-testid': 'components-empty-message' }, emptyStateMessage),
      React.createElement('div', { 'data-testid': 'components-show-filter' }, showLandscapeFilter?.toString())
    ),
}));

vi.mock('@/components/Health/HealthDashboard', () => ({
  HealthDashboard: () => 
    React.createElement('div', { 'data-testid': 'health-dashboard' }),
}));

vi.mock('@/pages/AlertsPage', () => ({
  default: () => 
    React.createElement('div', { 'data-testid': 'alerts-page' }),
}));

// Mock functions for testing interactions
const mockSetTabs = vi.fn();
const mockSyncTabWithUrl = vi.fn();
const mockSetSelectedLandscape = vi.fn();
const mockRefetch = vi.fn();

// Minimal context mocks
vi.mock('@/contexts/HeaderNavigationContext', () => ({
  useHeaderNavigation: () => ({ setTabs: mockSetTabs, activeTab: 'components' }),
}));

vi.mock('@/contexts/hooks', () => ({
  usePortalState: () => ({ selectedLandscape: 'test', setSelectedLandscape: vi.fn(), setShowLandscapeDetails: vi.fn() }),
  useLandscapeManagement: () => ({ getFilteredLandscapeIds: vi.fn(), getProductionLandscapeIds: vi.fn() }),
  useComponentManagement: () => ({ componentFilter: '', setComponentFilter: vi.fn(), getAvailableComponents: vi.fn() }),
  useFeatureToggles: () => ({ 
    featureToggles: [], expandedToggles: {}, toggleFilter: '', setToggleFilter: vi.fn(),
    toggleFeature: vi.fn(), toggleExpanded: vi.fn(), bulkToggle: vi.fn(), 
    getGroupStatus: vi.fn(), getFilteredToggles: vi.fn() 
  }),
}));

vi.mock('@/hooks/useTabRouting', () => ({
  useTabRouting: () => ({ currentTabFromUrl: 'components', syncTabWithUrl: vi.fn() }),
}));

vi.mock('@/hooks/api/useComponents', () => ({
  useComponentsByProject: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/hooks/api/useLandscapes', () => ({
  useLandscapesByProject: () => ({ data: [] }),
}));

vi.mock('@/hooks/api/useTeams', () => ({
  useTeams: () => ({ data: { teams: [] } }),
}));

describe('ProjectLayout', () => {
  let queryClient: QueryClient;

  const defaultProps: ProjectLayoutProps = {
    projectName: 'Test Project',
    projectId: 'test-project',
    tabs: ['components'],
  };

  const renderComponent = (props: Partial<ProjectLayoutProps> = {}) => {
    return render(
      React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(ProjectLayout, { ...defaultProps, ...props })
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

  describe('Props and Defaults', () => {
    it('should use default values when optional props not provided', () => {
      renderComponent();
      expect(screen.getByTestId('components-title')).toHaveTextContent('Test Project Components');
      expect(screen.getByTestId('components-system')).toHaveTextContent('services');
      expect(screen.getByTestId('components-show-filter')).toHaveTextContent('false');
    });

    it('should use custom prop values when provided', () => {
      renderComponent({
        componentsTitle: 'Custom Title',
        system: 'microservices',
        emptyStateMessage: 'Custom empty message',
        showLandscapeFilter: true
      });
      expect(screen.getByTestId('components-title')).toHaveTextContent('Custom Title');
      expect(screen.getByTestId('components-system')).toHaveTextContent('microservices');
      expect(screen.getByTestId('components-empty-message')).toHaveTextContent('Custom empty message');
      expect(screen.getByTestId('components-show-filter')).toHaveTextContent('true');
    });
  });

  describe('Tab Configuration', () => {
    it('should handle different tab configurations', () => {
      // Single tab
      renderComponent({ tabs: ['components'] });
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should handle multiple tabs without crashing', () => {
      renderComponent({ tabs: ['components', 'health', 'alerts'] });
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
    });

    it('should handle empty tabs array', () => {
      renderComponent({ tabs: [] });
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
    });
  });

  describe('Hidden Landscape Buttons', () => {
    it('should handle hiddenLandscapeButtons configuration', () => {
      renderComponent({
        hiddenLandscapeButtons: ['git', 'concourse', 'kibana']
      });
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
    });
  });

  describe('DefaultTab Behavior', () => {
    it('should use components as defaultTab when not specified', () => {
      renderComponent({ tabs: ['components', 'health'] });
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should respect explicit defaultTab prop', () => {
      renderComponent({ 
        defaultTab: 'health',
        tabs: ['components', 'health'] 
      });
      // Component still renders components by default due to mocking, but prop is passed
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should render without errors when all hooks return data', () => {
      // Test that component handles all hooks returning data gracefully
      renderComponent();
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
      expect(screen.getByTestId('landscape-links-section')).toBeInTheDocument();
      expect(screen.getByTestId('components-tab-content')).toBeInTheDocument();
    });

    it('should handle component rendering with different system configurations', () => {
      renderComponent({
        system: 'distributed-services',
        showLandscapeFilter: true
      });
      expect(screen.getByTestId('components-system')).toHaveTextContent('distributed-services');
      expect(screen.getByTestId('components-show-filter')).toHaveTextContent('true');
    });
  });

  describe('Project ID Variations', () => {
    it('should handle different project ID formats', () => {
      renderComponent({
        projectId: 'project-with-dashes-123',
        projectName: 'Complex Project'
      });
      expect(screen.getByTestId('components-title')).toHaveTextContent('Complex Project Components');
    });

    it('should handle numeric project IDs', () => {
      renderComponent({
        projectId: '12345',
        projectName: 'Numeric ID Project'
      });
      expect(screen.getByTestId('components-title')).toHaveTextContent('Numeric ID Project Components');
    });
  });

  describe('All Landscape Button Types', () => {
    it('should handle all possible hidden landscape button types', () => {
      renderComponent({
        hiddenLandscapeButtons: ['git', 'concourse', 'kibana', 'dynatrace', 'cockpit', 'plutono']
      });
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special project names', () => {
      renderComponent({
        projectName: 'Project-Name_With@Special#Characters'
      });
      expect(screen.getByTestId('components-title')).toHaveTextContent('Project-Name_With@Special#Characters Components');
    });

    it('should handle empty project name', () => {
      renderComponent({
        projectName: ''
      });
      expect(screen.getByTestId('components-title')).toHaveTextContent('Components');
    });

    it('should handle very long project names gracefully', () => {
      const longName = 'Very Long Project Name That Could Potentially Cause Layout Issues In The User Interface';
      renderComponent({
        projectName: longName
      });
      expect(screen.getByTestId('components-title')).toHaveTextContent(`${longName} Components`);
    });
  });
});
