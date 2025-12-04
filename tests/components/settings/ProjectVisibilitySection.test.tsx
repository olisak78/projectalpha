import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProjectVisibilitySection from '../../../src/components/settings/ProjectVisibilitySection';
import { useProjectsContext } from '../../../src/contexts/ProjectsContext';
import { Project } from '../../../src/types/api';

// Mock the ProjectsContext
vi.mock('../../../src/contexts/ProjectsContext', () => ({
  useProjectsContext: vi.fn()
}));

/**
 * ProjectVisibilitySection Component Tests
 * 
 * Tests for the ProjectVisibilitySection component which provides the UI for
 * managing individual project visibility settings. This component displays
 * a list of projects with checkboxes and control buttons.
 * 
 * Component Location: src/components/settings/ProjectVisibilitySection.tsx
 * Dependencies: ProjectsContext
 */

// ============================================================================
// TEST UTILITIES
// ============================================================================

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'cis20',
    title: 'CIS@2.0',
    description: 'CIS 2.0 Project',
    isVisible: true
  },
  {
    id: '2',
    name: 'usrv',
    title: 'Unified Services',
    description: 'Unified Services Project',
    isVisible: false
  },
  {
    id: '3',
    name: 'ca',
    title: 'Cloud Automation',
    description: 'Cloud Automation Project',
    isVisible: true
  },
  {
    id: '4',
    name: 'other',
    title: 'Other Project',
    description: 'Other Project',
    isVisible: false
  }
];

const defaultProps = {
  visibilityState: {
    '1': true,
    '2': false,
    '3': true,
    '4': false
  } as { [projectId: string]: boolean },
  onVisibilityChange: vi.fn(),
  onSelectAll: vi.fn(),
  onDeselectAll: vi.fn()
};

const mockUseProjectsContext = useProjectsContext as ReturnType<typeof vi.fn>;

/**
 * Helper function to render ProjectVisibilitySection with default props
 */
function renderProjectVisibilitySection(props?: Partial<typeof defaultProps>) {
  const finalProps = { ...defaultProps, ...props };
  return render(<ProjectVisibilitySection {...finalProps} />);
}

/**
 * Helper function to setup default projects context mock
 */
function setupDefaultProjectsMock(projects: Project[] = mockProjects, isLoading = false) {
  mockUseProjectsContext.mockReturnValue({
    projects,
    isLoading,
    error: null,
    sidebarItems: []
  });
}

// ============================================================================
// COMPONENT TESTS
// ============================================================================

describe('ProjectVisibilitySection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultProjectsMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    it('should render section with projects and controls', () => {
      renderProjectVisibilitySection();
      
      expect(screen.getByText('Project Visibility')).toBeInTheDocument();
      expect(screen.getByText('Control which projects appear in the sidebar.')).toBeInTheDocument();
      
      // Control buttons
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /none/i })).toBeInTheDocument();
      
      // Projects with correct states
      expect(screen.getByLabelText('CIS@2.0')).toBeChecked();
      expect(screen.getByLabelText('Unified Services')).not.toBeChecked();
      expect(screen.getAllByRole('checkbox')).toHaveLength(mockProjects.length);
    });
  });

  // ==========================================================================
  // LOADING STATE TESTS
  // ==========================================================================

  describe('Loading State', () => {
    it('should show loading message when projects are loading', () => {
      setupDefaultProjectsMock([], true);
      renderProjectVisibilitySection();
      
      expect(screen.getByText('Loading projects...')).toBeInTheDocument();
      expect(screen.queryByText('Project Visibility')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // INTERACTION TESTS
  // ==========================================================================

  describe('Interactions', () => {
    it('should handle checkbox and button interactions', () => {
      const mockOnVisibilityChange = vi.fn();
      const mockOnSelectAll = vi.fn();
      const mockOnDeselectAll = vi.fn();
      
      renderProjectVisibilitySection({ 
        onVisibilityChange: mockOnVisibilityChange,
        onSelectAll: mockOnSelectAll,
        onDeselectAll: mockOnDeselectAll
      });
      
      // Test checkbox interactions
      fireEvent.click(screen.getByLabelText('CIS@2.0'));
      expect(mockOnVisibilityChange).toHaveBeenCalledWith('1', false);
      
      fireEvent.click(screen.getByLabelText('Unified Services'));
      expect(mockOnVisibilityChange).toHaveBeenCalledWith('2', true);
      
      // Test button interactions
      fireEvent.click(screen.getByRole('button', { name: /all/i }));
      expect(mockOnSelectAll).toHaveBeenCalledTimes(1);
      
      fireEvent.click(screen.getByRole('button', { name: /none/i }));
      expect(mockOnDeselectAll).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // STATE UPDATES TESTS
  // ==========================================================================

  describe('State Updates', () => {
    it('should update checkbox states when visibility state changes', () => {
      const { rerender } = renderProjectVisibilitySection();
      
      expect(screen.getByLabelText('CIS@2.0')).toBeChecked();
      expect(screen.getByLabelText('Unified Services')).not.toBeChecked();
      
      // Change visibility state
      rerender(
        <ProjectVisibilitySection
          {...defaultProps}
          visibilityState={{ '1': false, '2': true, '3': true, '4': false }}
        />
      );
      
      expect(screen.getByLabelText('CIS@2.0')).not.toBeChecked();
      expect(screen.getByLabelText('Unified Services')).toBeChecked();
    });
  });

  // ==========================================================================
  // EDGE CASES TESTS
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty projects and missing titles', () => {
      setupDefaultProjectsMock([]);
      renderProjectVisibilitySection();
      
      expect(screen.getByText('Project Visibility')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      
      // Test with projects missing titles
      const projectsWithMissingTitles: Project[] = [
        { id: '1', name: 'test-project', title: '', description: 'Test', isVisible: true }
      ];
      
      setupDefaultProjectsMock(projectsWithMissingTitles);
      const { rerender } = render(<ProjectVisibilitySection {...defaultProps} visibilityState={{ '1': true }} />);
      
      expect(screen.getByText('test-project')).toBeInTheDocument();
    });
  });
});
