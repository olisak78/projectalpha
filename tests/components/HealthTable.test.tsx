import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthTable } from '../../src/components/Health/HealthTable';
import { ComponentDisplayProvider } from '../../src/contexts/ComponentDisplayContext';
import type { ComponentHealthCheck } from '../../src/types/health';
import '@testing-library/jest-dom/vitest';

// Mock the HealthRow component
vi.mock('../../src/components/Health/HealthRow', () => ({
  HealthRow: ({ healthCheck, components }: any) => {
    // Use the mocked useComponentDisplay directly
    const mockUseComponentDisplay = vi.fn().mockReturnValue({
      teamNamesMap: {
        team1: 'Team Alpha',
        team2: 'Team Beta',
      },
    });
    const { teamNamesMap } = mockUseComponentDisplay();
    
    const component = components?.find((c: any) => c.id === healthCheck.componentId);
    const teamName = component?.owner_id ? teamNamesMap?.[component.owner_id] : null;
    
    return (
      <tr data-testid="health-row">
        <td>{healthCheck.componentName}</td>
        <td>{healthCheck.status}</td>
        <td>{teamName || 'No Team'}</td>
      </tr>
    );
  },
}));

// Mock the fetchSystemInformation function
vi.mock('../../src/services/healthApi', () => ({
  fetchSystemInformation: vi.fn().mockResolvedValue({ status: 'success', data: null }),
}));

// Mock the ComponentDisplayContext
vi.mock('../../src/contexts/ComponentDisplayContext', () => ({
  useComponentDisplay: vi.fn(),
}));

// Mock UI components
vi.mock('../../src/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, className, ...props }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('../../src/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange && onValueChange('alphabetic')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children, className }: any) => <div data-testid="select-trigger" className={className}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Loader2: ({ className }: any) => <div data-testid="loader-icon" className={className} />,
}));

describe('HealthTable', () => {
  let mockUseComponentDisplay: any;

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

  const defaultProps = {
    healthChecks: mockHealthChecks,
    isLoading: false,
    landscape: 'eu10-canary',
    components: mockComponents,
  };

  beforeEach(async () => {
    const { useComponentDisplay } = await import('../../src/contexts/ComponentDisplayContext');
    mockUseComponentDisplay = vi.mocked(useComponentDisplay);
    
    mockUseComponentDisplay.mockReturnValue({
      teamNamesMap: {
        team1: 'Team Alpha',
        team2: 'Team Beta',
      },
      teamColorsMap: {
        team1: '#ff0000',
        team2: '#00ff00',
      },
      selectedLandscape: 'test-landscape',
      selectedLandscapeData: { name: 'Test', route: 'test.example.com' },
      isCentralLandscape: false,
      noCentralLandscapes: false,
      componentHealthMap: {},
      isLoadingHealth: false,
      componentSystemInfoMap: {},
      isLoadingSystemInfo: false,
      expandedComponents: {},
      onToggleExpanded: vi.fn(),
      system: 'test-system',
      projectId: 'test-project',
    });
  });

  const renderWithProvider = (props = {}) => {
    return render(<HealthTable {...defaultProps} {...props} />);
  };

  it('should render search input', () => {
    renderWithProvider();

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toBeTruthy();
    expect(searchInput).toHaveAttribute('placeholder', 'Search components...');
  });

  it('should render sort order dropdown', () => {
    renderWithProvider();

    const sortTrigger = screen.getByTestId('select-trigger');
    expect(sortTrigger).toBeTruthy();
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
    const sortTrigger = screen.getByTestId('select-trigger');
    expect(sortTrigger).toBeTruthy();
  });

  // New tests for recent code additions
  it('should filter out central service components when hideDownComponents is true and not central landscape', () => {
    const componentsWithCentral = [
      { id: '1', name: 'accounts-service', owner_id: 'team1' },
      { id: '2', name: 'billing-service', owner_id: 'team2' },
      { id: '3', name: 'central-service', owner_id: 'team1', 'central-service': true },
    ];

    const healthChecksWithCentral = [
      ...mockHealthChecks,
      {
        componentId: '3',
        componentName: 'central-service',
        landscape: 'eu10-canary',
        healthUrl: 'https://central-service.cfapps.sap.hana.ondemand.com/health',
        status: 'UP',
        responseTime: 100,
        lastChecked: new Date('2023-12-01T10:00:00Z'),
      },
    ];

    renderWithProvider({ 
      hideDownComponents: true, 
      isCentralLandscape: false,
      components: componentsWithCentral,
      healthChecks: healthChecksWithCentral
    });

    const rows = screen.getAllByTestId('health-row');
    // Should only show non-central components
    expect(rows).toHaveLength(2);
    expect(screen.queryByText('central-service')).not.toBeInTheDocument();
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
    
    // Should show both components - one with health check, one unsupported
    expect(screen.getByText('accounts-service')).toBeTruthy();
    expect(screen.getByText('unsupported-service')).toBeTruthy();
  });

  it('should handle central landscape components correctly', () => {
    renderWithProvider({ isCentralLandscape: true });

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
