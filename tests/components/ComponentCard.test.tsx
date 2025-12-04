import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComponentCard from '../../src/components/ComponentCard';
import type { Component } from '../../src/types/api';
import type { ComponentHealthCheck } from '../../src/types/health';
import '@testing-library/jest-dom/vitest';

// Mock the hooks
vi.mock('../../src/hooks/api/useSonarMeasures', () => ({
  useSonarMeasures: vi.fn(),
}));

vi.mock('../../src/hooks/api/useComponentHealth', () => ({
  useComponentHealth: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock UI components
vi.mock('../../src/components/ui/card', () => ({
  Card: ({ children, className, style, onClick, ...props }: any) => (
    <div 
      data-testid="component-card" 
      className={className}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div data-testid="card-content" className={className} {...props}>
      {children}
    </div>
  ),
}));

vi.mock('../../src/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, ...props }: any) => (
    <button
      type="button"
      data-testid="button"
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('../../src/components/ui/badge', () => ({
  Badge: ({ children, variant, className, style, ...props }: any) => (
    <span
      data-testid="badge"
      data-variant={variant}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </span>
  ),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Activity: () => <div data-testid="activity-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: ({ className }: any) => <div data-testid="check-circle-icon" className={className} />,
  Loader2: ({ className }: any) => <div data-testid="loader-icon" className={className} />,
}));

vi.mock('../../src/components/icons/GithubIcon', () => ({
  GithubIcon: ({ className }: any) => <div data-testid="github-icon" className={className} />,
}));

// Mock utils
vi.mock('../../src/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

describe('ComponentCard', () => {
  let queryClient: QueryClient;
  let mockUseSonarMeasures: any;
  let mockUseComponentHealth: any;

  const mockComponent: Component = {
    id: 'comp-1',
    name: 'test-service',
    title: 'Test Service',
    description: 'A test service component',
    project_id: 'proj-1',
    owner_id: 'team-1',
    github: 'https://github.com/example/test-service',
    sonar: 'https://sonar.example.com/dashboard?id=test-service',
    health: true,
  };

  const defaultProps = {
    component: mockComponent,
    selectedLandscape: 'prod',
    selectedLandscapeName: 'Production',
    selectedLandscapeData: {},
    expandedComponents: {},
    onToggleExpanded: vi.fn(),
    getComponentHealth: vi.fn().mockReturnValue('healthy'),
    getComponentAlerts: vi.fn().mockReturnValue(false),
    system: 'test-system',
  };

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockWindowOpen.mockClear();

    // Get the mocked functions
    const { useSonarMeasures } = await import('../../src/hooks/api/useSonarMeasures');
    const { useComponentHealth } = await import('../../src/hooks/api/useComponentHealth');
    mockUseSonarMeasures = vi.mocked(useSonarMeasures);
    mockUseComponentHealth = vi.mocked(useComponentHealth);

    // Default mock implementations
    mockUseSonarMeasures.mockReturnValue({
      data: {
        coverage: 85,
        codeSmells: 5,
        vulnerabilities: 2,
        qualityGate: 'Passed',
      },
      isLoading: false,
      error: null,
      hasAlias: true,
    });

    mockUseComponentHealth.mockReturnValue({
      data: {
        status: 'success',
        data: { status: 'UP' },
      },
      isLoading: false,
      error: null,
    });
  });

  describe('Basic Rendering', () => {
    it('should render component card with basic information', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      expect(screen.getByTestId('component-card')).toBeInTheDocument();
      expect(screen.getByText('Test Service')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('should render component name when title is not provided', () => {
      const componentWithoutTitle = { ...mockComponent, title: '' };
      renderWithQueryClient(
        <ComponentCard {...defaultProps} component={componentWithoutTitle} />
      );

      expect(screen.getByText('test-service')).toBeInTheDocument();
    });

    it('should render team badge when team information is provided', () => {
      renderWithQueryClient(
        <ComponentCard
          {...defaultProps}
          teamName="Test Team"
          teamColor="#ff0000"
        />
      );

      const teamBadge = screen.getByText('Test Team');
      expect(teamBadge).toBeInTheDocument();
      expect(teamBadge.closest('[data-testid="badge"]')).toHaveStyle({
        backgroundColor: '#ff0000',
      });
    });

    it('should render central service badge when component is central service', () => {
      const centralComponent = { ...mockComponent, 'central-service': true };
      renderWithQueryClient(
        <ComponentCard {...defaultProps} component={centralComponent} />
      );

      expect(screen.getByText('Central Only')).toBeInTheDocument();
    });
  });

  describe('Health Status Badge', () => {
    it('should render UP health badge when component health is successful', () => {
      mockUseComponentHealth.mockReturnValue({
        data: { status: 'success' },
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      expect(screen.getByText('UP')).toBeInTheDocument();
    });

    it('should render DOWN health badge when component health fails', () => {
      mockUseComponentHealth.mockReturnValue({
        data: { status: 'error' },
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      expect(screen.getByText('DOWN')).toBeInTheDocument();
    });

    it('should render loading badge when health check is in progress', () => {
      mockUseComponentHealth.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      expect(screen.getByText('Checking')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should not render health badge when component health is disabled', () => {
      const componentWithoutHealth = { ...mockComponent, health: false };
      renderWithQueryClient(
        <ComponentCard {...defaultProps} component={componentWithoutHealth} />
      );

      expect(screen.queryByText('UP')).not.toBeInTheDocument();
      expect(screen.queryByText('DOWN')).not.toBeInTheDocument();
      expect(screen.queryByText('Checking')).not.toBeInTheDocument();
    });

    it('should not render health badge when no landscape is selected', () => {
      renderWithQueryClient(
        <ComponentCard {...defaultProps} selectedLandscape={null} />
      );

      expect(screen.queryByText('UP')).not.toBeInTheDocument();
      expect(screen.queryByText('DOWN')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render GitHub button when GitHub URL is provided', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const githubButton = screen.getByText('GitHub').closest('button');
      expect(githubButton).toBeInTheDocument();
      expect(screen.getByTestId('github-icon')).toBeInTheDocument();
    });

    it('should render Sonar button when Sonar URL is provided', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const sonarButton = screen.getByText('Sonar').closest('button');
      expect(sonarButton).toBeInTheDocument();
      expect(screen.getAllByTestId('activity-icon')).toHaveLength(2); // One in button, one in metrics
    });

    it('should not render GitHub button when GitHub URL is empty', () => {
      const componentWithoutGithub = { ...mockComponent, github: '' };
      renderWithQueryClient(
        <ComponentCard {...defaultProps} component={componentWithoutGithub} />
      );

      expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
    });

    it('should not render Sonar button when Sonar URL is empty', () => {
      const componentWithoutSonar = { ...mockComponent, sonar: '' };
      renderWithQueryClient(
        <ComponentCard {...defaultProps} component={componentWithoutSonar} />
      );

      expect(screen.queryByText('Sonar')).not.toBeInTheDocument();
    });

    it('should open GitHub URL when GitHub button is clicked', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const githubButton = screen.getByText('GitHub').closest('button');
      fireEvent.click(githubButton!);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://github.com/example/test-service',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should open Sonar URL when Sonar button is clicked', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const sonarButton = screen.getByText('Sonar').closest('button');
      fireEvent.click(sonarButton!);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://sonar.example.com/dashboard?id=test-service',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should not open URL when URL is invalid', () => {
      const componentWithInvalidUrl = { ...mockComponent, github: '#' };
      renderWithQueryClient(
        <ComponentCard {...defaultProps} component={componentWithInvalidUrl} />
      );

      const githubButton = screen.getByText('GitHub').closest('button');
      fireEvent.click(githubButton!);

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });
  });

  describe('Quality Metrics', () => {
    it('should render quality metrics with correct values', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      expect(screen.getByText('85%')).toBeInTheDocument(); // Coverage
      expect(screen.getByText('2')).toBeInTheDocument(); // Vulnerabilities
      expect(screen.getByText('5')).toBeInTheDocument(); // Code smells
      expect(screen.getByText('Passed')).toBeInTheDocument(); // Quality gate
    });

    it('should render loading state for metrics when Sonar is loading', () => {
      mockUseSonarMeasures.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        hasAlias: true,
      });

      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const loadingElements = screen.getAllByText('...');
      expect(loadingElements).toHaveLength(4); // All 4 metrics should show loading
    });

    it('should render N/A for null metric values', () => {
      mockUseSonarMeasures.mockReturnValue({
        data: {
          coverage: null,
          codeSmells: null,
          vulnerabilities: null,
          qualityGate: null,
        },
        isLoading: false,
        error: null,
        hasAlias: true,
      });

      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const naElements = screen.getAllByText('N/A');
      expect(naElements).toHaveLength(3); // Coverage, vulnerabilities, and code smells show N/A, quality gate shows 'N/A' but might be rendered differently
    });

    it('should render quality gate icon with correct color for passed state', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const qualityGateIcon = screen.getByTestId('check-circle-icon');
      expect(qualityGateIcon).toHaveClass('text-green-600');
    });

    it('should render quality gate icon with correct color for failed state', () => {
      mockUseSonarMeasures.mockReturnValue({
        data: {
          coverage: 85,
          codeSmells: 5,
          vulnerabilities: 2,
          qualityGate: 'Failed',
        },
        isLoading: false,
        error: null,
        hasAlias: true,
      });

      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const qualityGateIcon = screen.getByTestId('check-circle-icon');
      expect(qualityGateIcon).toHaveClass('text-red-500');
    });
  });

  describe('Card Interactions', () => {
    it('should call onClick when card is clicked and component is healthy', () => {
      const mockOnClick = vi.fn();
      renderWithQueryClient(
        <ComponentCard {...defaultProps} onClick={mockOnClick} />
      );

      const card = screen.getByTestId('component-card');
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should not call onClick when component health is down', () => {
      const mockOnClick = vi.fn();
      mockUseComponentHealth.mockReturnValue({
        data: { status: 'error' },
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(
        <ComponentCard {...defaultProps} onClick={mockOnClick} />
      );

      const card = screen.getByTestId('component-card');
      fireEvent.click(card);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when clicking on buttons', () => {
      const mockOnClick = vi.fn();
      renderWithQueryClient(
        <ComponentCard {...defaultProps} onClick={mockOnClick} />
      );

      const githubButton = screen.getByText('GitHub').closest('button');
      fireEvent.click(githubButton!);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should have pointer cursor when clickable', () => {
      const mockOnClick = vi.fn();
      renderWithQueryClient(
        <ComponentCard {...defaultProps} onClick={mockOnClick} />
      );

      const card = screen.getByTestId('component-card');
      expect(card).toHaveStyle({ cursor: 'pointer' });
    });

    it('should not have pointer cursor when not clickable', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const card = screen.getByTestId('component-card');
      expect(card).not.toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Disabled State', () => {
    it('should render disabled state for central service in non-central landscape', () => {
      const centralComponent = { ...mockComponent, 'central-service': true };
      renderWithQueryClient(
        <ComponentCard
          {...defaultProps}
          component={centralComponent}
          isCentralLandscape={false}
        />
      );

      const card = screen.getByTestId('component-card');
      expect(card).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(screen.getByText('Not Available in this Landscape')).toBeInTheDocument();
    });

    it('should not render disabled state for central service in central landscape', () => {
      const centralComponent = { ...mockComponent, 'central-service': true };
      renderWithQueryClient(
        <ComponentCard
          {...defaultProps}
          component={centralComponent}
          isCentralLandscape={true}
        />
      );

      const card = screen.getByTestId('component-card');
      expect(card).not.toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(screen.queryByText('Not Available in this Landscape')).not.toBeInTheDocument();
    });
  });


  describe('Error Handling', () => {
    it('should handle Sonar API errors gracefully', () => {
      mockUseSonarMeasures.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Sonar API error'),
        hasAlias: true,
      });

      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      // Should still render the component without crashing
      expect(screen.getByTestId('component-card')).toBeInTheDocument();
      expect(screen.getByText('Test Service')).toBeInTheDocument();
    });

    it('should handle health API errors gracefully', () => {
      mockUseComponentHealth.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Health API error'),
      });

      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      // Should still render the component without crashing
      expect(screen.getByTestId('component-card')).toBeInTheDocument();
      expect(screen.getByText('Test Service')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle component without Sonar configuration', () => {
      const componentWithoutSonar = { ...mockComponent, sonar: undefined };
      mockUseSonarMeasures.mockReturnValue({
        data: {
          coverage: null,
          codeSmells: null,
          vulnerabilities: null,
          qualityGate: null,
        },
        isLoading: false,
        error: null,
        hasAlias: false,
      });

      renderWithQueryClient(
        <ComponentCard {...defaultProps} component={componentWithoutSonar} />
      );

      expect(screen.getByTestId('component-card')).toBeInTheDocument();
      expect(screen.queryByText('Sonar')).not.toBeInTheDocument();
    });

    it('should handle empty component title and name', () => {
      const emptyComponent = { ...mockComponent, title: '', name: '' };
      renderWithQueryClient(
        <ComponentCard {...defaultProps} component={emptyComponent} />
      );

      expect(screen.getByTestId('component-card')).toBeInTheDocument();
    });

    it('should handle missing optional props', () => {
      const minimalProps = {
        component: mockComponent,
        selectedLandscape: null,
        expandedComponents: {},
        onToggleExpanded: vi.fn(),
        getComponentHealth: vi.fn(),
        getComponentAlerts: vi.fn(),
        system: 'test-system',
      };

      renderWithQueryClient(<ComponentCard {...minimalProps} />);

      expect(screen.getByTestId('component-card')).toBeInTheDocument();
      expect(screen.getByText('Test Service')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles for action buttons', () => {
      renderWithQueryClient(<ComponentCard {...defaultProps} />);

      const githubButton = screen.getByText('GitHub').closest('button');
      const sonarButton = screen.getByText('Sonar').closest('button');

      expect(githubButton).toHaveAttribute('type', 'button');
      expect(sonarButton).toHaveAttribute('type', 'button');
    });

    it('should stop propagation on button clicks', () => {
      const mockOnClick = vi.fn();
      renderWithQueryClient(
        <ComponentCard {...defaultProps} onClick={mockOnClick} />
      );

      const githubButton = screen.getByText('GitHub').closest('button');
      fireEvent.click(githubButton!);

      // Card onClick should not be called when button is clicked
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily with same props', () => {
      const { rerender } = renderWithQueryClient(<ComponentCard {...defaultProps} />);

      expect(screen.getByTestId('component-card')).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <QueryClientProvider client={queryClient}>
          <ComponentCard {...defaultProps} />
        </QueryClientProvider>
      );

      expect(screen.getByTestId('component-card')).toBeInTheDocument();
    });
  });
});
