import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HealthRow } from '../../../src/components/Health/HealthRow';
import type { ComponentHealthCheck } from '../../../src/types/health';
import '@testing-library/jest-dom/vitest';

// Mock components
vi.mock('../../../src/components/Health/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('../../../src/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock('../../../src/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button data-testid="button" onClick={onClick}>{children}</button>
  ),
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render component information', () => {
    render(
      <table>
        <tbody>
          <HealthRow {...defaultProps} />
        </tbody>
      </table>
    );

    expect(screen.getByText('Accounts Service')).toBeTruthy();
    expect(screen.getByText('accounts-service')).toBeTruthy();
    expect(screen.getByTestId('status-badge')).toBeTruthy();
  });

  it('should format response time correctly', () => {
    render(
      <table>
        <tbody>
          <HealthRow {...defaultProps} />
        </tbody>
      </table>
    );
    expect(screen.getByText('150ms')).toBeTruthy();
  });

  it('should display team name when provided', () => {
    render(<HealthRow {...defaultProps} teamName="Team Alpha" />);
    expect(screen.getByTestId('badge')).toBeTruthy();
    expect(screen.getByText('Team Alpha')).toBeTruthy();
  });

  it('should handle component click when status is UP', () => {
    const mockOnComponentClick = vi.fn();
    render(
      <HealthRow
        {...defaultProps}
        componentName="accounts-service"
        onComponentClick={mockOnComponentClick}
      />
    );

    const row = screen.getByRole('row');
    fireEvent.click(row);
    expect(mockOnComponentClick).toHaveBeenCalledWith('accounts-service');
  });

  it('should render external link buttons', () => {
    render(
      <HealthRow
        {...defaultProps}
        githubUrl="https://github.com/example/repo"
        sonarUrl="https://sonar.example.com/project"
      />
    );

    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
