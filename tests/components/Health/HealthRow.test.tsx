import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HealthRow } from '../../../src/components/Health/HealthRow';
import { ComponentDisplayProvider } from '../../../src/contexts/ComponentDisplayContext';
import type { ComponentHealthCheck } from '../../../src/types/health';
import '@testing-library/jest-dom/vitest';

// Mock components
vi.mock('../../../src/components/Health/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('../../../src/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

vi.mock('../../../src/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button data-testid="button" onClick={onClick}>{children}</button>
  ),
}));

// Mock the fetchSystemInformation function
vi.mock('../../../src/services/healthApi', () => ({
  fetchSystemInformation: vi.fn().mockResolvedValue({ status: 'success', data: null }),
}));

describe('HealthRow', () => {
  const mockHealthCheck: ComponentHealthCheck = {
    componentId: 'accounts-service',
    componentName: 'Accounts Service',
    landscape: 'eu10-canary',
    healthUrl: 'https://accounts-service.cfapps.sap.hana.ondemand.com/health',
    status: 'UP',
    responseTime: 150,
    lastChecked: new Date('2023-12-01T10:00:00Z'),
  };

  const defaultProps = {
    healthCheck: mockHealthCheck,
    isExpanded: false,
    onToggle: vi.fn(),
  };

  const mockContextProps = {
    selectedLandscape: 'test-landscape',
    selectedLandscapeData: { name: 'Test', route: 'test.example.com' },
    isCentralLandscape: false,
    teamNamesMap: {},
    teamColorsMap: {},
    componentHealthMap: {},
    isLoadingHealth: false,
    componentSystemInfoMap: {},
    isLoadingSystemInfo: false,
    expandedComponents: {},
    onToggleExpanded: vi.fn(),
    system: 'test-system',
  };

  const renderWithProvider = (props = {}) => {
    return render(
      <ComponentDisplayProvider {...mockContextProps}>
        <table>
          <tbody>
            <HealthRow {...defaultProps} {...props} />
          </tbody>
        </table>
      </ComponentDisplayProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render component information', () => {
    renderWithProvider();

    expect(screen.getByText('Accounts Service')).toBeTruthy();
    expect(screen.getByText('accounts-service')).toBeTruthy();
    expect(screen.getByTestId('status-badge')).toBeTruthy();
  });

  it('should format response time correctly', () => {
    renderWithProvider();
    expect(screen.getByText('150ms')).toBeTruthy();
  });

  it('should display team name when provided', () => {
    renderWithProvider({ teamName: "Team Alpha" });
    expect(screen.getByTestId('badge')).toBeTruthy();
    expect(screen.getByText('Team Alpha')).toBeTruthy();
  });

  it('should handle component click when status is UP', () => {
    const mockOnComponentClick = vi.fn();
    renderWithProvider({
      componentName: "accounts-service",
      onComponentClick: mockOnComponentClick
    });

    const row = screen.getByRole('row');
    fireEvent.click(row);
    expect(mockOnComponentClick).toHaveBeenCalledWith('accounts-service');
  });

  it('should render external link buttons', () => {
    renderWithProvider({
      githubUrl: "https://github.com/example/repo",
      sonarUrl: "https://sonar.example.com/project"
    });

    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render central service badge when component is central service', () => {
    renderWithProvider({
      component: { 
        id: 'accounts-service', 
        name: 'Accounts Service',
        'central-service': true
      }
    });

    expect(screen.getByText('Central Service')).toBeTruthy();
  });

  it('should apply disabled styling when component is disabled', () => {
    renderWithProvider({ isDisabled: true });

    const row = screen.getByRole('row');
    expect(row.className).toContain('opacity-50');
  });

  it('should not be clickable when status is DOWN', () => {
    const mockOnComponentClick = vi.fn();
    const downHealthCheck = { ...mockHealthCheck, status: 'DOWN' as const };
    
    renderWithProvider({
      healthCheck: downHealthCheck,
      componentName: "accounts-service",
      onComponentClick: mockOnComponentClick
    });

    const row = screen.getByRole('row');
    expect(row.className).not.toContain('cursor-pointer');
  });

  it('should not render version badges when no component is provided', () => {
    renderWithProvider();

    // Should only have status badge, no version badges
    const badges = screen.queryAllByTestId('badge');
    const versionBadges = badges.filter(badge => 
      badge.textContent?.includes('App:') || badge.textContent?.includes('UI5:') || badge.textContent?.includes('Loading')
    );
    expect(versionBadges.length).toBe(0);
  });
});
