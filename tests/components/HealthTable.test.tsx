import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthTable } from '../../src/components/Health/HealthTable';
import { ComponentDisplayProvider } from '../../src/contexts/ComponentDisplayContext';
import type { ComponentHealthCheck } from '../../src/types/health';
import '@testing-library/jest-dom/vitest';

// Mock the HealthRow component
vi.mock('../../src/components/Health/HealthRow', () => ({
  HealthRow: ({ healthCheck, teamName }: any) => (
    <tr data-testid="health-row">
      <td>{healthCheck.componentName}</td>
      <td>{healthCheck.status}</td>
      <td>{teamName || 'No Team'}</td>
    </tr>
  ),
}));

// Mock the fetchSystemInformation function
vi.mock('../../src/services/healthApi', () => ({
  fetchSystemInformation: vi.fn().mockResolvedValue({ status: 'success', data: null }),
}));

describe('HealthTable', () => {
  const mockHealthChecks: ComponentHealthCheck[] = [
    {
      componentId: '1',
      componentName: 'accounts-service',
      landscape: 'eu10-canary',
      healthUrl: 'https://accounts-service.cfapps.sap.hana.ondemand.com/health',
      status: 'UP',
      responseTime: 150,
      lastChecked: new Date('2023-12-01T10:00:00Z'),
    },
    {
      componentId: '2',
      componentName: 'billing-service',
      landscape: 'eu10-canary',
      healthUrl: 'https://billing-service.cfapps.sap.hana.ondemand.com/health',
      status: 'DOWN',
      responseTime: 0,
      lastChecked: new Date('2023-12-01T10:00:00Z'),
      error: 'Connection refused',
    },
  ];

  const mockComponents = [
    { id: '1', name: 'accounts-service', owner_id: 'team1' },
    { id: '2', name: 'billing-service', owner_id: 'team2' },
  ];

  const mockContextProps = {
    selectedLandscape: 'test-landscape',
    selectedLandscapeData: { name: 'Test', route: 'test.example.com' },
    isCentralLandscape: false,
    teamNamesMap: {
      team1: 'Team Alpha',
      team2: 'Team Beta',
    },
    teamColorsMap: {
      team1: '#ff0000',
      team2: '#00ff00',
    },
    componentHealthMap: {},
    isLoadingHealth: false,
    componentSystemInfoMap: {},
    isLoadingSystemInfo: false,
    expandedComponents: {},
    onToggleExpanded: vi.fn(),
    system: 'test-system',
  };

  const defaultProps = {
    healthChecks: mockHealthChecks,
    isLoading: false,
    landscape: 'eu10-canary',
    components: mockComponents,
  };

  const renderWithProvider = (props = {}) => {
    return render(
      <ComponentDisplayProvider {...mockContextProps}>
        <HealthTable {...defaultProps} {...props} />
      </ComponentDisplayProvider>
    );
  };

  it('should render search input', () => {
    renderWithProvider();

    const searchInput = screen.getByPlaceholderText('Search components...');
    expect(searchInput).toBeTruthy();
  });

  it('should render sort order dropdown', () => {
    renderWithProvider();

    const sortDropdown = screen.getByText('Alphabetic');
    expect(sortDropdown).toBeTruthy();
  });

  it('should render health checks in a table', () => {
    renderWithProvider();

    // Check for table headers
    expect(screen.getByText('Component')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Response Time')).toBeTruthy();
    expect(screen.getByText('Last Checked')).toBeTruthy();
    expect(screen.getByText('Team')).toBeTruthy();

    // Check for health rows
    const rows = screen.getAllByTestId('health-row');
    expect(rows).toHaveLength(2);
  });

  it('should render loading state when isLoading is true', () => {
    renderWithProvider({ isLoading: true, healthChecks: [] });

    expect(screen.getByText('Loading components...')).toBeTruthy();
  });

  it('should sort health checks alphabetically by default', () => {
    renderWithProvider();

    const rows = screen.getAllByTestId('health-row');
    
    // Should be in alphabetical order
    expect(rows[0].textContent).toContain('accounts-service');
    expect(rows[1].textContent).toContain('billing-service');
  });

  it('should display team names from teamNamesMap', () => {
    renderWithProvider();

    expect(screen.getByText('Team Alpha')).toBeTruthy();
    expect(screen.getByText('Team Beta')).toBeTruthy();
  });

  it('should show empty state when no health checks match search', () => {
    renderWithProvider({ healthChecks: [], components: [] });

    // Should show empty state message
    const emptyMessage = screen.getByText(/No components available/);
    expect(emptyMessage).toBeTruthy();
  });

  it('should handle health checks without team assignment', () => {
    const healthChecksWithoutTeam: ComponentHealthCheck[] = [
      {
        componentId: '3',
        componentName: 'orphan-service',
        landscape: 'eu10-canary',
        healthUrl: 'https://orphan-service.cfapps.sap.hana.ondemand.com/health',
        status: 'UP',
        responseTime: 100,
        lastChecked: new Date('2023-12-01T10:00:00Z'),
      },
    ];

    const componentsWithoutTeam = [
      { id: '3', name: 'orphan-service', owner_id: null },
    ];

    renderWithProvider({
      healthChecks: healthChecksWithoutTeam,
      components: componentsWithoutTeam
    });

    // Should still render the row
    const rows = screen.getAllByTestId('health-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('No Team')).toBeTruthy();
  });

  it('should render with controls section layout matching ComponentsTabContent', () => {
    const { container } = renderWithProvider();

    // Should have flex container with gap-4 for controls
    const controlsSection = container.querySelector('.flex.items-center.gap-4');
    expect(controlsSection).toBeTruthy();

    // Search should have max-w-md
    const searchContainer = container.querySelector('.max-w-md');
    expect(searchContainer).toBeTruthy();

    // Sort dropdown should have w-[180px]
    const sortTrigger = container.querySelector('[class*="w-\\[180px\\]"]');
    expect(sortTrigger).toBeTruthy();
  });

  // New tests for recent code additions
  it('should filter out DOWN components when hideDownComponents is true', () => {
    renderWithProvider({ hideDownComponents: true });

    const rows = screen.getAllByTestId('health-row');
    // Should only show UP components
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('accounts-service');
    expect(rows[0].textContent).toContain('UP');
  });

  it('should show unsupported components as UNKNOWN status', () => {
    const componentsWithUnsupported = [
      { id: '1', name: 'accounts-service', owner_id: 'team1' },
      { id: '3', name: 'unsupported-service', owner_id: 'team1' },
    ];

    renderWithProvider({
      components: componentsWithUnsupported,
      healthChecks: [mockHealthChecks[0]] // Only first component has health check
    });

    const rows = screen.getAllByTestId('health-row');
    expect(rows).toHaveLength(2);
    
    // Second row should be the unsupported component with UNKNOWN status
    expect(rows[1].textContent).toContain('unsupported-service');
  });

  it('should handle central landscape components correctly', () => {
    const centralContextProps = {
      ...mockContextProps,
      isCentralLandscape: true,
    };

    render(
      <ComponentDisplayProvider {...centralContextProps}>
        <HealthTable {...defaultProps} isCentralLandscape={true} />
      </ComponentDisplayProvider>
    );

    // Should render normally for central landscape
    const rows = screen.getAllByTestId('health-row');
    expect(rows).toHaveLength(2);
  });

  it('should separate library and non-library components into different sections', () => {
    const mixedComponents = [
      { id: '1', name: 'accounts-service', owner_id: 'team1', 'is-library': false },
      { id: '2', name: 'billing-service', owner_id: 'team2', 'is-library': false },
      { id: '3', name: 'ui-library', owner_id: 'team1', 'is-library': true },
      { id: '4', name: 'utils-library', owner_id: 'team2', 'is-library': true },
    ];

    const mixedHealthChecks: ComponentHealthCheck[] = [
      {
        componentId: '1',
        componentName: 'accounts-service',
        landscape: 'eu10-canary',
        healthUrl: 'https://accounts-service.cfapps.sap.hana.ondemand.com/health',
        status: 'UP',
        responseTime: 150,
        lastChecked: new Date('2023-12-01T10:00:00Z'),
      },
      {
        componentId: '2',
        componentName: 'billing-service',
        landscape: 'eu10-canary',
        healthUrl: 'https://billing-service.cfapps.sap.hana.ondemand.com/health',
        status: 'DOWN',
        responseTime: 0,
        lastChecked: new Date('2023-12-01T10:00:00Z'),
        error: 'Connection refused',
      },
      {
        componentId: '3',
        componentName: 'ui-library',
        landscape: 'eu10-canary',
        healthUrl: 'https://ui-library.cfapps.sap.hana.ondemand.com/health',
        status: 'UP',
        responseTime: 120,
        lastChecked: new Date('2023-12-01T10:00:00Z'),
      },
      {
        componentId: '4',
        componentName: 'utils-library',
        landscape: 'eu10-canary',
        healthUrl: 'https://utils-library.cfapps.sap.hana.ondemand.com/health',
        status: 'UP',
        responseTime: 100,
        lastChecked: new Date('2023-12-01T10:00:00Z'),
      },
    ];

    renderWithProvider({
      healthChecks: mixedHealthChecks,
      components: mixedComponents
    });

    // Should have "Library Components" heading
    expect(screen.getByText('Library Components')).toBeTruthy();

    // Should have all 4 components rendered
    const rows = screen.getAllByTestId('health-row');
    expect(rows).toHaveLength(4);

    // Should have two separate table sections
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);

    // Verify components are in correct sections
    expect(screen.getByText('accounts-service')).toBeTruthy();
    expect(screen.getByText('billing-service')).toBeTruthy();
    expect(screen.getByText('ui-library')).toBeTruthy();
    expect(screen.getByText('utils-library')).toBeTruthy();
  });
});
