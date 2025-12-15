import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { TeamComponents } from '../../../src/components/Team/TeamComponents';
import { ComponentDisplayProvider } from '../../../src/contexts/ComponentDisplayContext';
import type { Component } from '../../../src/types/api';
import type { ComponentHealthCheck } from '../../../src/types/health';

// Mock ComponentCard since it has complex dependencies
vi.mock('../../../src/components/ComponentCard', () => ({
  default: vi.fn(({ component, onClick }) => (
    <div 
      data-testid={`component-card-${component.id}`}
      onClick={() => onClick && onClick()}
    >
      <h3>{component.title || component.name}</h3>
      <p>{component.description}</p>
    </div>
  )),
}));

// Mock Badge component
vi.mock('../../../src/components/ui/badge', () => ({
  Badge: vi.fn(({ children, variant, style, className }) => (
    <span 
      data-testid="badge" 
      data-variant={variant}
      style={style}
      className={className}
    >
      {children}
    </span>
  )),
}));

// Mock Button component
vi.mock('../../../src/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick, variant, size, className }) => (
    <button 
      data-testid="button"
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  )),
}));

// Mock GithubIcon
vi.mock('../../../src/components/icons/GithubIcon', () => ({
  GithubIcon: vi.fn(({ className }) => (
    <svg data-testid="github-icon" className={className}>
      <path d="github-icon-path" />
    </svg>
  )),
}));

describe('TeamComponents', () => {
  const mockComponents: Component[] = [
    {
      id: 'comp-1',
      name: 'component-1',
      title: 'Component One',
      description: 'First component description',
      project_id: 'project-1',
      owner_id: 'team-1',
      project_title: 'Project Alpha',
      github: 'https://github.com/example/comp1',
      sonar: 'https://sonar.example.com/comp1',
      qos: 'high',
    },
    {
      id: 'comp-2',
      name: 'component-2',
      title: 'Component Two',
      description: 'Second component description',
      project_id: 'project-1',
      owner_id: 'team-1',
      project_title: 'Project Alpha',
      github: 'https://github.com/example/comp2',
      sonar: 'https://sonar.example.com/comp2',
      qos: 'medium',
    },
    {
      id: 'comp-3',
      name: 'component-3',
      title: 'Component Three',
      description: 'Third component description',
      project_id: 'project-2',
      owner_id: 'team-1',
      project_title: 'Project Beta',
      github: 'https://github.com/example/comp3',
      sonar: 'https://sonar.example.com/comp3',
      qos: 'low',
    },
  ];

  let queryClient: QueryClient;

  const mockContextProps = {
    selectedLandscape: 'prod' as string | null,
    selectedLandscapeData: { 
      name: 'Production', 
      metadata: { route: 'prod.example.com' }
    },
    isCentralLandscape: false,
    teamNamesMap: { 'team-1': 'Alpha Team', 'team-2': 'Beta Team' },
    teamColorsMap: { 'team-1': '#ff6b6b', 'team-2': '#4ecdc4' },
    componentHealthMap: {} as Record<string, ComponentHealthCheck>,
    isLoadingHealth: false,
    expandedComponents: {},
    onToggleExpanded: vi.fn(),
    system: 'test-system',
  };

  const renderWithProviders = (
    ui: React.ReactElement, 
    contextProps: typeof mockContextProps = mockContextProps
  ) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ComponentDisplayProvider {...contextProps}>
          {ui}
        </ComponentDisplayProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render component cards when components are provided', () => {
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
        />
      );

      expect(screen.getByTestId('component-card-comp-1')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-2')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-3')).toBeInTheDocument();
    });

    it('should render empty state when no components are provided', () => {
      renderWithProviders(
        <TeamComponents 
          components={[]}
          teamName="Test Team"
        />
      );

      expect(screen.getByText('No components found for this team.')).toBeInTheDocument();
      expect(screen.queryByTestId('component-card-comp-1')).not.toBeInTheDocument();
    });
  });

  describe('Simple Grid Layout', () => {
    it('should render components in a simple grid layout when showProjectGrouping is false', () => {
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          showProjectGrouping={false}
        />
      );

      expect(screen.getByTestId('component-card-comp-1')).toBeInTheDocument();
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(3);

      // Should use simple grid structure (not grouped)
      const container = screen.getByTestId('component-card-comp-1').parentElement;
      expect(container).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
    });
  });

  describe('Project Grouping Layout', () => {
    it('should render components grouped by project when showProjectGrouping is true', () => {
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          showProjectGrouping={true}
        />
      );

      // Should render project headers as h3 elements
      expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Project Beta' })).toBeInTheDocument();

      // Should render all components
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(3);
    });

    it('should display component count badges', () => {
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          showProjectGrouping={true}
        />
      );

      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
      
      // Should have badges for component counts
      expect(screen.getByText('2')).toBeInTheDocument(); // Project Alpha has 2 components
      expect(screen.getByText('1')).toBeInTheDocument(); // Project Beta has 1 component
    });
  });

  describe('Compact View', () => {
    it('should render compact component items when compactView is true', () => {
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          compactView={true}
        />
      );

      // Should render component titles directly (not in ComponentCard)
      expect(screen.getByText('Component One')).toBeInTheDocument();
      expect(screen.getByText('Component Two')).toBeInTheDocument();
      expect(screen.getByText('Component Three')).toBeInTheDocument();

      // Should not render ComponentCard test ids in compact view
      expect(screen.queryByTestId('component-card-comp-1')).not.toBeInTheDocument();
    });

    it('should render GitHub buttons for components with GitHub links in compact view', () => {
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          compactView={true}
        />
      );

      const githubButtons = screen.getAllByTestId('button');
      expect(githubButtons.length).toBeGreaterThan(0);
      
      // Check that GitHub buttons contain the GitHub icon
      const githubIcons = screen.getAllByTestId('github-icon');
      expect(githubIcons.length).toBeGreaterThan(0);
    });

    it('should render team badges with correct styling in compact view', () => {
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          compactView={true}
        />
      );

      // Should render team badges with correct styling
      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
      
      // Check that badges have the correct team colors
      const alphaBadges = badges.filter(badge => 
        badge.textContent === 'Alpha Team'
      );
      expect(alphaBadges.length).toBeGreaterThan(0);
      expect(alphaBadges[0]).toHaveStyle({ backgroundColor: '#ff6b6b' });
    });

    it('should open GitHub links when clicked in compact view', () => {
      // Mock window.open
      const mockWindowOpen = vi.fn();
      Object.defineProperty(window, 'open', {
        value: mockWindowOpen,
        writable: true,
      });

      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          compactView={true}
        />
      );

      const githubButtons = screen.getAllByTestId('button');
      fireEvent.click(githubButtons[0]);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://github.com/example/comp1',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Component Interactions', () => {
    it('should call onComponentClick when component card is clicked', () => {
      const mockOnComponentClick = vi.fn();
      
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          onComponentClick={mockOnComponentClick}
        />
      );

      fireEvent.click(screen.getByTestId('component-card-comp-1'));

      expect(mockOnComponentClick).toHaveBeenCalledWith('component-1');
    });

    it('should call onComponentClick when compact component item is clicked', () => {
      const mockOnComponentClick = vi.fn();
      
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          compactView={true}
          onComponentClick={mockOnComponentClick}
        />
      );

      // Click on the component item (not the button)
      const componentItem = screen.getByText('Component One').closest('div');
      fireEvent.click(componentItem!);

      expect(mockOnComponentClick).toHaveBeenCalledWith('component-1');
    });

    it('should not call onComponentClick when clicking on GitHub button in compact view', () => {
      const mockOnComponentClick = vi.fn();
      const mockWindowOpen = vi.fn();
      Object.defineProperty(window, 'open', {
        value: mockWindowOpen,
        writable: true,
      });
      
      renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          compactView={true}
          onComponentClick={mockOnComponentClick}
        />
      );

      // Click on the GitHub button
      const githubButton = screen.getAllByTestId('button')[0];
      fireEvent.click(githubButton);

      // Should open GitHub link but not call onComponentClick
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://github.com/example/comp1',
        '_blank',
        'noopener,noreferrer'
      );
      expect(mockOnComponentClick).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle components without GitHub links', () => {
      const componentsWithoutGithub = mockComponents.map(comp => ({
        ...comp,
        github: undefined,
      }));

      renderWithProviders(
        <TeamComponents 
          components={componentsWithoutGithub}
          teamName="Test Team"
          compactView={true}
        />
      );

      // Should not render any GitHub buttons
      expect(screen.queryByTestId('button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('github-icon')).not.toBeInTheDocument();
    });

    it('should handle components without descriptions in compact view', () => {
      const componentsWithoutDescriptions = mockComponents.map(comp => ({
        ...comp,
        description: undefined,
      }));

      renderWithProviders(
        <TeamComponents 
          components={componentsWithoutDescriptions}
          teamName="Test Team"
          compactView={true}
        />
      );

      // Should still render component titles
      expect(screen.getByText('Component One')).toBeInTheDocument();
      expect(screen.getByText('Component Two')).toBeInTheDocument();
      
      // Should not render description paragraphs
      expect(screen.queryByText('First component description')).not.toBeInTheDocument();
    });

    it('should handle empty project titles', () => {
      const componentsWithEmptyProject = [
        { ...mockComponents[0], project_title: '' },
        { ...mockComponents[1], project_title: undefined },
        { ...mockComponents[2], project_title: 'Valid Project' },
      ];

      renderWithProviders(
        <TeamComponents 
          components={componentsWithEmptyProject}
          teamName="Test Team"
          showProjectGrouping={true}
        />
      );

      expect(screen.getByRole('heading', { name: 'Valid Project' })).toBeInTheDocument();
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(3);
    });
  });

  describe('Layout Differences', () => {
    it('should use different grid layouts for compact vs full view', () => {
      const { rerender } = renderWithProviders(
        <TeamComponents 
          components={mockComponents}
          teamName="Test Team"
          compactView={false}
        />
      );

      // Full view should use lg:grid-cols-3
      let gridContainer = screen.getByTestId('component-card-comp-1').parentElement;
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4');

      // Switch to compact view
      rerender(
        <QueryClientProvider client={queryClient}>
          <ComponentDisplayProvider {...mockContextProps}>
            <TeamComponents 
              components={mockComponents}
              teamName="Test Team"
              compactView={true}
            />
          </ComponentDisplayProvider>
        </QueryClientProvider>
      );

      // Compact view should use md:grid-cols-2 (no lg:grid-cols-3)
      gridContainer = screen.getByText('Component One').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'gap-3');
    });
  });
});
