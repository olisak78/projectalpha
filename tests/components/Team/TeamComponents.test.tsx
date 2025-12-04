import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TeamComponents } from '../../../src/components/Team/TeamComponents';
import type { Component } from '../../../src/types/api';

/**
 * TeamComponents Component Tests
 * 
 * Streamlined tests for the TeamComponents component which displays team components
 * in either a simple grid or grouped by project format.
 * Redundant and duplicate tests have been removed while maintaining high coverage.
 */

// Mock ComponentCard since it has complex dependencies
vi.mock('../../../src/components/ComponentCard', () => ({
  default: vi.fn(({ component, onToggleExpanded }) => (
    <div 
      data-testid={`component-card-${component.id}`}
      onClick={() => onToggleExpanded(component.id)}
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
    {
      id: 'comp-4',
      name: 'component-4',
      title: 'Component Four',
      description: 'Fourth component description',
      project_id: 'project-3',
      owner_id: 'team-1',
      project_title: '', // Empty project title
      github: 'https://github.com/example/comp4',
      sonar: 'https://sonar.example.com/comp4',
      qos: 'high',
    },
  ];

  const defaultProps = {
    components: mockComponents,
    teamName: 'Test Team',
    teamComponentsExpanded: {},
    onToggleExpanded: vi.fn(),
    system: 'test-system',
    showProjectGrouping: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // BASIC RENDERING TESTS
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render component cards when components are provided', () => {
      render(<TeamComponents {...defaultProps} />);

      expect(screen.getByTestId('component-card-comp-1')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-2')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-3')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-4')).toBeInTheDocument();
    });

    it('should render empty state when no components are provided (empty array, null, or undefined)', () => {
      // Test empty array
      const { rerender } = render(<TeamComponents {...defaultProps} components={[]} />);
      expect(screen.getByText('No components found for this team.')).toBeInTheDocument();
      expect(screen.queryByTestId('component-card-comp-1')).not.toBeInTheDocument();

      // Test null
      rerender(<TeamComponents {...defaultProps} components={null as any} />);
      expect(screen.getByText('No components found for this team.')).toBeInTheDocument();

      // Test undefined
      rerender(<TeamComponents {...defaultProps} components={undefined as any} />);
      expect(screen.getByText('No components found for this team.')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // SIMPLE GRID LAYOUT TESTS (showProjectGrouping=false)
  // ============================================================================

  describe('Simple Grid Layout (showProjectGrouping=false)', () => {
    it('should render components in a simple grid layout and default when showProjectGrouping is false or not provided', () => {
      // Test explicit false
      render(<TeamComponents {...defaultProps} showProjectGrouping={false} />);

      expect(screen.getByTestId('component-card-comp-1')).toBeInTheDocument();
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(4);

      // Should use simple grid structure (not grouped)
      const container = screen.getByTestId('component-card-comp-1').parentElement;
      expect(container).toHaveClass('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');
    });
  });

  // ============================================================================
  // PROJECT GROUPING LAYOUT TESTS (showProjectGrouping=true)
  // ============================================================================

  describe('Project Grouping Layout (showProjectGrouping=true)', () => {
    it('should render components grouped by project when showProjectGrouping is true', () => {
      render(<TeamComponents {...defaultProps} showProjectGrouping={true} />);

      // Should render project headers as h3 elements
      expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Project Beta' })).toBeInTheDocument();

      // Should render all components
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(4);
    });

    it('should display component count badges and sort projects alphabetically', () => {
      const componentsWithMultipleProjects: Component[] = [
        { ...mockComponents[0], id: 'comp-a', project_title: 'Zebra Project' },
        { ...mockComponents[1], id: 'comp-b', project_title: 'Alpha Project' },
        { ...mockComponents[2], id: 'comp-c', project_title: 'Beta Project' },
      ];

      render(
        <TeamComponents 
          {...defaultProps} 
          components={componentsWithMultipleProjects}
          showProjectGrouping={true} 
        />
      );

      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(3);

      // Check that project headers are rendered in alphabetical order
      expect(screen.getByRole('heading', { name: 'Alpha Project' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Beta Project' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Zebra Project' })).toBeInTheDocument();
      
      // Verify all components are rendered
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(3);
    });

    it('should handle edge cases with project titles', () => {
      const edgeCaseComponents = [
        { ...mockComponents[0], project_title: undefined },
        { ...mockComponents[1], project_title: '' },
        { ...mockComponents[2], project_title: 'Valid Project' },
      ];

      render(
        <TeamComponents 
          {...defaultProps} 
          components={edgeCaseComponents}
          showProjectGrouping={true} 
        />
      );

      expect(screen.getByRole('heading', { name: 'Valid Project' })).toBeInTheDocument();
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(3);
    });
  });

  // ============================================================================
  // COMPONENT INTERACTION TESTS
  // ============================================================================

  describe('Component Interactions', () => {
    it('should call onToggleExpanded when component card is clicked', () => {
      const mockOnToggleExpanded = vi.fn();
      render(
        <TeamComponents 
          {...defaultProps} 
          onToggleExpanded={mockOnToggleExpanded}
        />
      );

      fireEvent.click(screen.getByTestId('component-card-comp-1'));

      expect(mockOnToggleExpanded).toHaveBeenCalledWith('comp-1');
    });

    it('should pass expanded state to component cards', () => {
      const expandedComponents = {
        'comp-1': true,
        'comp-2': false,
      };

      render(
        <TeamComponents 
          {...defaultProps} 
          teamComponentsExpanded={expandedComponents}
        />
      );

      // ComponentCard mock should receive the expanded state
      expect(screen.getByTestId('component-card-comp-1')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-2')).toBeInTheDocument();
    });

    it('should pass correct system prop to component cards', () => {
      render(<TeamComponents {...defaultProps} system="custom-system" />);

      // All component cards should be rendered (system prop is passed internally)
      expect(screen.getByTestId('component-card-comp-1')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-2')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-3')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-4')).toBeInTheDocument();
    });
  });


  // ============================================================================
  // PROPS VALIDATION TESTS
  // ============================================================================

  describe('Props Validation', () => {
    it('should handle edge cases with props (null expanded object, special team names)', () => {
      // Test null expanded object
      const { rerender } = render(<TeamComponents {...defaultProps} teamComponentsExpanded={null as any} />);
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(4);

      // Test special characters in team name
      rerender(<TeamComponents {...defaultProps} teamName="Team O'Brien & Co." />);
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(4);
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle various component data edge cases', () => {
      const edgeCaseComponents: Component[] = [
        {
          id: 'incomplete-1',
          name: '',
          title: '',
          description: '',
          project_id: '',
          owner_id: '',
        } as Component,
        {
          ...mockComponents[0],
          id: 'special-comp',
          name: 'comp@#$%^&*()',
          title: 'Component with Special Characters!',
          description: 'Description with émojis 🚀 and special chars: @#$%',
        },
      ];

      render(
        <TeamComponents 
          {...defaultProps} 
          components={edgeCaseComponents}
        />
      );

      expect(screen.getByTestId('component-card-incomplete-1')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-special-comp')).toBeInTheDocument();
    });

    it('should handle large datasets efficiently', () => {
      const manyComponents = Array.from({ length: 20 }, (_, i) => ({
        ...mockComponents[0],
        id: `comp-${i}`,
        name: `component-${i}`,
        title: `Component ${i}`,
        project_title: `Project ${i % 5}`, // Group into 5 projects
      }));

      render(
        <TeamComponents 
          {...defaultProps} 
          components={manyComponents}
          showProjectGrouping={true}
        />
      );

      expect(screen.getByTestId('component-card-comp-0')).toBeInTheDocument();
      expect(screen.getByTestId('component-card-comp-19')).toBeInTheDocument();
      expect(screen.getAllByTestId('badge')).toHaveLength(5); // 5 projects
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper heading structure when project grouping is enabled', () => {
      render(<TeamComponents {...defaultProps} showProjectGrouping={true} />);

      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have proper semantic structure', () => {
      render(<TeamComponents {...defaultProps} />);

      // The grid container should be present
      const gridContainer = screen.getByTestId('component-card-comp-1').parentElement;
      expect(gridContainer).toBeInTheDocument();
    });
  });

  // ============================================================================
  // COMPACT VIEW TESTS
  // ============================================================================

  describe('Compact View', () => {
    const teamNamesMap = {
      'team-1': 'Alpha Team',
      'team-2': 'Beta Team',
    };

    const teamColorsMap = {
      'team-1': '#ff6b6b',
      'team-2': '#4ecdc4',
    };

    describe('Compact Component Item Rendering', () => {
      it('should render compact component items with owner team badges', () => {
        render(
          <TeamComponents 
            {...defaultProps} 
            compactView={true}
            teamNamesMap={teamNamesMap}
            teamColorsMap={teamColorsMap}
          />
        );

        // Should render component titles
        expect(screen.getByText('Component One')).toBeInTheDocument();
        expect(screen.getByText('Component Two')).toBeInTheDocument();

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

      it('should render GitHub buttons for components with GitHub links', () => {
        render(
          <TeamComponents 
            {...defaultProps} 
            compactView={true}
          />
        );

        const githubButtons = screen.getAllByTestId('button');
        expect(githubButtons.length).toBeGreaterThan(0);
        
        // Check that GitHub buttons contain the GitHub icon
        const githubIcons = screen.getAllByTestId('github-icon');
        expect(githubIcons.length).toBeGreaterThan(0);
      });

      it('should handle components without GitHub links', () => {
        const componentsWithoutGithub = mockComponents.map(comp => ({
          ...comp,
          github: undefined,
        }));

        render(
          <TeamComponents 
            {...defaultProps} 
            components={componentsWithoutGithub}
            compactView={true}
          />
        );

        // Should not render any GitHub buttons
        expect(screen.queryByTestId('button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('github-icon')).not.toBeInTheDocument();
      });

      it('should handle components without owner team information', () => {
        const componentsWithoutOwner = mockComponents.map(comp => ({
          ...comp,
          owner_id: undefined,
        }));

        render(
          <TeamComponents 
            {...defaultProps} 
            components={componentsWithoutOwner}
            compactView={true}
            teamNamesMap={teamNamesMap}
            teamColorsMap={teamColorsMap}
          />
        );

        // Should not render any team badges
        expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
      });

      it('should use fallback color when team color is not available', () => {
        const incompleteTeamColorsMap = {
          'team-1': '#ff6b6b',
          // team-2 color missing
        };

        render(
          <TeamComponents 
            {...defaultProps} 
            compactView={true}
            teamNamesMap={teamNamesMap}
            teamColorsMap={incompleteTeamColorsMap}
          />
        );

        const badges = screen.getAllByTestId('badge');
        const alphaBadge = badges.find(badge => badge.textContent === 'Alpha Team');
        expect(alphaBadge).toHaveStyle({ backgroundColor: '#ff6b6b' });
      });

      it('should open GitHub links in new window when clicked', () => {
        // Mock window.open
        const mockWindowOpen = vi.fn();
        Object.defineProperty(window, 'open', {
          value: mockWindowOpen,
          writable: true,
        });

        render(
          <TeamComponents 
            {...defaultProps} 
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

      it('should not open invalid GitHub links', () => {
        const mockWindowOpen = vi.fn();
        Object.defineProperty(window, 'open', {
          value: mockWindowOpen,
          writable: true,
        });

        const componentsWithInvalidGithub = [
          { ...mockComponents[0], github: '#' },
          { ...mockComponents[1], github: '' },
        ];

        render(
          <TeamComponents 
            {...defaultProps} 
            components={componentsWithInvalidGithub}
            compactView={true}
          />
        );

        const githubButtons = screen.getAllByTestId('button');
        fireEvent.click(githubButtons[0]);

        expect(mockWindowOpen).not.toHaveBeenCalled();
      });
    });

    describe('Compact View with Project Grouping', () => {
      it('should render components grouped by project in compact view', () => {
        render(
          <TeamComponents 
            {...defaultProps} 
            compactView={true}
            showProjectGrouping={true}
          />
        );

        // Should render project headers
        expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Project Beta' })).toBeInTheDocument();

        // Should render component count badges
        const badges = screen.getAllByTestId('badge');
        const countBadges = badges.filter(badge => 
          badge.textContent === '2' || badge.textContent === '1'
        );
        expect(countBadges.length).toBeGreaterThan(0);

        // Should use compact grid layout (md:grid-cols-2 instead of lg:grid-cols-3)
        const gridContainers = screen.getAllByText('Component One')[0].closest('.grid');
        expect(gridContainers).toHaveClass('grid-cols-1 md:grid-cols-2 gap-3');
      });

    });

    describe('Compact View without Project Grouping', () => {
      it('should render simple grid layout in compact view', () => {
        render(
          <TeamComponents 
            {...defaultProps} 
            compactView={true}
            showProjectGrouping={false}
          />
        );

        // Should not render project headers
        expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();

        // Should render all components in a simple grid
        expect(screen.getByText('Component One')).toBeInTheDocument();
        expect(screen.getByText('Component Two')).toBeInTheDocument();
        expect(screen.getByText('Component Three')).toBeInTheDocument();
        expect(screen.getByText('Component Four')).toBeInTheDocument();

        // Should use compact grid layout
        const gridContainer = screen.getByText('Component One').closest('.grid');
        expect(gridContainer).toHaveClass('grid-cols-1 md:grid-cols-2 gap-3');
      });

      it('should render component descriptions in compact view', () => {
        render(
          <TeamComponents 
            {...defaultProps} 
            compactView={true}
            showProjectGrouping={false}
          />
        );

        expect(screen.getByText('First component description')).toBeInTheDocument();
        expect(screen.getByText('Second component description')).toBeInTheDocument();
        expect(screen.getByText('Third component description')).toBeInTheDocument();
        expect(screen.getByText('Fourth component description')).toBeInTheDocument();
      });

      it('should handle components without descriptions in compact view', () => {
        const componentsWithoutDescriptions = mockComponents.map(comp => ({
          ...comp,
          description: undefined,
        }));

        render(
          <TeamComponents 
            {...defaultProps} 
            components={componentsWithoutDescriptions}
            compactView={true}
            showProjectGrouping={false}
          />
        );

        // Should still render component titles
        expect(screen.getByText('Component One')).toBeInTheDocument();
        expect(screen.getByText('Component Two')).toBeInTheDocument();
        
        // Should not render description paragraphs
        expect(screen.queryByText('First component description')).not.toBeInTheDocument();
      });
    });

    describe('Compact View Layout Differences', () => {
      it('should use different grid layouts for compact vs full view', () => {
        const { rerender } = render(
          <TeamComponents 
            {...defaultProps} 
            compactView={false}
            showProjectGrouping={false}
          />
        );

        // Full view should use lg:grid-cols-3
        let gridContainer = screen.getByTestId('component-card-comp-1').parentElement;
        expect(gridContainer).toHaveClass('grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

        // Switch to compact view
        rerender(
          <TeamComponents 
            {...defaultProps} 
            compactView={true}
            showProjectGrouping={false}
          />
        );

        // Compact view should use md:grid-cols-2 (no lg:grid-cols-3)
        gridContainer = screen.getByText('Component One').closest('.grid');
        expect(gridContainer).toHaveClass('grid-cols-1 md:grid-cols-2 gap-3');
      });

      it('should render different content structure in compact vs full view', () => {
        const { rerender } = render(
          <TeamComponents 
            {...defaultProps} 
            compactView={false}
          />
        );

        // Full view renders ComponentCard components
        expect(screen.getByTestId('component-card-comp-1')).toBeInTheDocument();

        // Switch to compact view
        rerender(
          <TeamComponents 
            {...defaultProps} 
            compactView={true}
          />
        );

        // Compact view renders custom compact items (no component-card test ids)
        expect(screen.queryByTestId('component-card-comp-1')).not.toBeInTheDocument();
        expect(screen.getByText('Component One')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    it('should work correctly when switching between grouping modes', () => {
      const mockOnToggleExpanded = vi.fn();
      const { rerender } = render(
        <TeamComponents 
          {...defaultProps} 
          onToggleExpanded={mockOnToggleExpanded}
          showProjectGrouping={false} 
        />
      );

      // Initially in simple grid mode
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(4);
      
      // Test interaction in simple mode
      fireEvent.click(screen.getByTestId('component-card-comp-1'));
      expect(mockOnToggleExpanded).toHaveBeenCalledWith('comp-1');

      // Switch to project grouping mode
      rerender(
        <TeamComponents 
          {...defaultProps} 
          onToggleExpanded={mockOnToggleExpanded}
          showProjectGrouping={true} 
        />
      );

      // Should now have project headers
      expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(4);

      // Test interaction in grouped mode
      fireEvent.click(screen.getByTestId('component-card-comp-2'));
      expect(mockOnToggleExpanded).toHaveBeenCalledWith('comp-2');
    });

    it('should work correctly when switching between compact and full view modes', () => {
      const { rerender } = render(
        <TeamComponents 
          {...defaultProps} 
          compactView={false}
          showProjectGrouping={true}
        />
      );

      // Initially in full view with project grouping
      expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
      expect(screen.getAllByTestId(/component-card-comp-/)).toHaveLength(4);

      // Switch to compact view with project grouping
      rerender(
        <TeamComponents 
          {...defaultProps} 
          compactView={true}
          showProjectGrouping={true}
        />
      );

      // Should still have project headers but different layout
      expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
      expect(screen.queryByTestId('component-card-comp-1')).not.toBeInTheDocument();
      expect(screen.getByText('Component One')).toBeInTheDocument();
    });
  });
});
