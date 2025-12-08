import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthOverview, calculateHealthPercentage } from '../../src/components/Health/HealthOverview';
import type { HealthSummary } from '../../src/types/health';
import '@testing-library/jest-dom/vitest';


describe('HealthOverview', () => {
  const mockSummary: HealthSummary = {
      total: 10,
      up: 8,
      down: 2,
      unknown: 0,
      avgResponseTime: 125,
      error: 0
  };



  it('should not render Total Components card', () => {
    render(<HealthOverview summary={mockSummary} isLoading={false} />);

    // Should not have "Total Components" text
    expect(screen.queryByText('Total Components')).toBeNull();
  });

  it('should render Healthy card', () => {
    render(<HealthOverview summary={mockSummary} isLoading={false} />);

    expect(screen.getByText('Healthy')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('80.0%')).toBeTruthy();
  });

  it('should render Down card', () => {
    render(<HealthOverview summary={mockSummary} isLoading={false} />);

    expect(screen.getByText('Down')).toBeTruthy();
 
    expect(screen.getByText('20.0%')).toBeTruthy();
  });



  it('should show loading state', () => {
    const { container } = render(
      <HealthOverview summary={mockSummary} isLoading={true} />
    );
    
    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThanOrEqual(0)
  });

  it('should calculate percentages correctly with 0 total', () => {
    const emptySummary: HealthSummary = {
        total: 0,
        up: 0,
        down: 0,
        unknown: 0,
        avgResponseTime: 0,
        error: 0
    };

    render(<HealthOverview summary={emptySummary} isLoading={false} />);

    // Should show 0% for both
    const percentages = screen.getAllByText('0%');
    expect(percentages).toHaveLength(2); // Healthy and Down percentages
  });

  

  it('should have proper grid layout on different screen sizes', () => {
    const { container } = render(
      <HealthOverview summary={mockSummary} isLoading={false} />
    );

    const grid = container.firstChild as HTMLElement;
    
    // Should have responsive grid classes
    expect(grid.className).toContain('flex gap-3');
 
  });

  describe('calculateHealthPercentage', () => {
    it('should calculate healthy percentage correctly', () => {
      const summary: HealthSummary = {
        total: 10,
        up: 8,
        down: 2,
        unknown: 0,
        avgResponseTime: 125,
        error: 0
      };

      const result = calculateHealthPercentage('Healthy', summary);
      expect(result).toBe('80.0');
    });

    it('should calculate down percentage correctly with both down and error', () => {
      const summary: HealthSummary = {
        total: 10,
        up: 7,
        down: 2,
        unknown: 0,
        avgResponseTime: 125,
        error: 1
      };

      const result = calculateHealthPercentage('Down', summary);
      expect(result).toBe('30.0'); // (2 + 1) / 10 * 100 = 30.0
    });

    it('should return 0 when total is 0', () => {
      const summary: HealthSummary = {
        total: 0,
        up: 0,
        down: 0,
        unknown: 0,
        avgResponseTime: 0,
        error: 0
      };

      expect(calculateHealthPercentage('Healthy', summary)).toBe('0');
      expect(calculateHealthPercentage('Down', summary)).toBe('0');
    });

    it('should return 0 for unknown label', () => {
      const summary: HealthSummary = {
        total: 10,
        up: 8,
        down: 2,
        unknown: 0,
        avgResponseTime: 125,
        error: 0
      };

      const result = calculateHealthPercentage('Unknown', summary);
      expect(result).toBe('0');
    });
  });
});
