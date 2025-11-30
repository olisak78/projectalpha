import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AlertViewDialog } from '../../../src/components/Alerts/AlertViewDialog';

describe('AlertViewDialog Component', () => {
  const mockOnOpenChange = vi.fn();

  const mockAlert = {
    alert: 'HighCPUUsage',
    expr: 'cpu_usage_percent > 80',
    for: '5m',
    labels: {
      severity: 'critical',
      team: 'platform',
      service: 'web-server',
    },
    annotations: {
      summary: 'High CPU usage detected',
      description: 'CPU usage has been above 80% for more than 5 minutes.',
    },
  };

  const mockFile = {
    name: 'cpu-alerts.yaml',
    category: 'performance',
  };

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    alert: mockAlert,
    file: mockFile,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with alert name as title', () => {
    render(<AlertViewDialog {...defaultProps} />);

    expect(screen.getByText('HighCPUUsage')).toBeInTheDocument();
    expect(screen.getByText('cpu-alerts.yaml')).toBeInTheDocument();
    expect(screen.getByText('performance')).toBeInTheDocument();
  });

  it('should display alert expression and duration', () => {
    render(<AlertViewDialog {...defaultProps} />);

    expect(screen.getByText('Expression')).toBeInTheDocument();
    expect(screen.getByText('cpu_usage_percent > 80')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('5m')).toBeInTheDocument();
  });

  it('should display annotations when present', () => {
    render(<AlertViewDialog {...defaultProps} />);

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('High CPU usage detected')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText(/CPU usage has been above 80%/)).toBeInTheDocument();
  });

  it('should display labels as badges', () => {
    render(<AlertViewDialog {...defaultProps} />);

    expect(screen.getByText('Labels')).toBeInTheDocument();
    expect(screen.getByText('severity')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('team')).toBeInTheDocument();
    expect(screen.getByText('platform')).toBeInTheDocument();
  });

  it('should render severity badge with correct styling', () => {
    render(<AlertViewDialog {...defaultProps} />);

    const criticalBadge = screen.getByText('CRITICAL');
    expect(criticalBadge).toBeInTheDocument();
    expect(criticalBadge).toHaveClass('text-red-600');
  });

  it('should handle different severity levels', () => {
    const alertWithWarningSeverity = {
      ...mockAlert,
      labels: { ...mockAlert.labels, severity: 'warning' },
    };
    render(<AlertViewDialog {...defaultProps} alert={alertWithWarningSeverity} />);

    const warningBadge = screen.getByText('WARNING');
    expect(warningBadge).toHaveClass('text-amber-600');
  });

  it('should not render sections when data is missing', () => {
    const minimalAlert = {
      alert: 'MinimalAlert',
    };
    render(<AlertViewDialog {...defaultProps} alert={minimalAlert as any} />);

    expect(screen.getByText('MinimalAlert')).toBeInTheDocument();
    expect(screen.queryByText('Expression')).not.toBeInTheDocument();
    expect(screen.queryByText('Duration')).not.toBeInTheDocument();
    expect(screen.queryByText('Labels')).not.toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<AlertViewDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('HighCPUUsage')).not.toBeInTheDocument();
  });

  it('should handle empty labels gracefully', () => {
    const alertWithoutLabels = { ...mockAlert, labels: {} };
    render(<AlertViewDialog {...defaultProps} alert={alertWithoutLabels} />);

    expect(screen.queryByText('Labels')).not.toBeInTheDocument();
  });
});
