import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useSettings } from '../../src/hooks/useSettings';
import { useProjectsContext } from '../../src/contexts/ProjectsContext';
import { useProjectVisibility } from '../../src/hooks/useProjectVisibility';
import { useAuth } from '../../src/contexts/AuthContext';
import { useUserInformation } from '../../src/hooks/useUserInformation';
import { Project } from '../../src/types/api';

// Mock the dependencies
vi.mock('../../src/contexts/ProjectsContext', () => ({
  useProjectsContext: vi.fn()
}));

vi.mock('../../src/hooks/useProjectVisibility', () => ({
  useProjectVisibility: vi.fn()
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../src/hooks/useUserInformation', () => ({
  useUserInformation: vi.fn()
}));

/**
 * useSettings Hook Tests
 * 
 * Tests for the useSettings custom hook which manages all settings-related
 * state and logic, including project visibility, user information, and
 * change tracking.
 * 
 * Hook Location: src/hooks/useSettings.ts
 * Dependencies: ProjectsContext, useProjectVisibility, AuthContext, useUserInformation
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
  }
];

const mockUseProjectsContext = useProjectsContext as ReturnType<typeof vi.fn>;
const mockUseProjectVisibility = useProjectVisibility as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseUserInformation = useUserInformation as ReturnType<typeof vi.fn>;

/**
 * Helper function to setup default mocks
 */
function setupDefaultMocks() {
  mockUseProjectsContext.mockReturnValue({
    projects: mockProjects,
    isLoading: false,
    error: null,
    sidebarItems: []
  });

  mockUseProjectVisibility.mockReturnValue({
    isProjectVisible: vi.fn((project: Project) => project.isVisible || false),
    updateProjectVisibility: vi.fn(),
    getVisibleProjects: vi.fn(() => mockProjects.filter(p => p.isVisible)),
    resetToDefaults: vi.fn(),
    loadVisibilitySettings: vi.fn(() => ({}))
  });

  mockUseAuth.mockReturnValue({
    user: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      team_role: 'Developer'
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn()
  });

  mockUseUserInformation.mockReturnValue({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    team: 'Engineering Team',
    role: 'Owner'
  });
}

// ============================================================================
// HOOK TESTS
// ============================================================================

describe('useSettings Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with correct default values and visibility state', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.hasChanges).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.visibilityState).toEqual({
        '1': true,
        '2': false,
        '3': true
      });
      expect(result.current.processedUserInfo).toEqual({
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        team: 'Engineering Team',
        role: 'Owner'
      });
    });

    it('should handle loading state correctly', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: [],
        isLoading: true,
        error: null,
        sidebarItems: []
      });

      const { result } = renderHook(() => useSettings());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.visibilityState).toEqual({});
    });
  });

  // ==========================================================================
  // VISIBILITY CHANGE TESTS
  // ==========================================================================

  describe('Visibility Changes', () => {
    it('should handle individual project visibility changes and detect changes', () => {
      const { result } = renderHook(() => useSettings());

      // Initially no changes
      expect(result.current.hasChanges).toBe(false);

      // Make a change
      act(() => {
        result.current.handleVisibilityChange('1', false);
      });

      expect(result.current.visibilityState['1']).toBe(false);
      expect(result.current.hasChanges).toBe(true);

      // Revert the change
      act(() => {
        result.current.handleVisibilityChange('1', true);
      });

      expect(result.current.hasChanges).toBe(false);
    });

    it('should handle select all and deselect all functionality', () => {
      const { result } = renderHook(() => useSettings());

      // Select all
      act(() => {
        result.current.handleSelectAll();
      });

      expect(result.current.visibilityState).toEqual({
        '1': true,
        '2': true,
        '3': true
      });
      expect(result.current.hasChanges).toBe(true);

      // Deselect all
      act(() => {
        result.current.handleDeselectAll();
      });

      expect(result.current.visibilityState).toEqual({
        '1': false,
        '2': false,
        '3': false
      });
    });
  });

  // ==========================================================================
  // SAVE AND CANCEL TESTS
  // ==========================================================================

  describe('Save and Cancel', () => {
    it('should save changes and reset hasChanges flag', () => {
      const mockUpdateProjectVisibility = vi.fn();
      mockUseProjectVisibility.mockReturnValue({
        ...mockUseProjectVisibility(),
        updateProjectVisibility: mockUpdateProjectVisibility
      });

      const { result } = renderHook(() => useSettings());

      // Make a change
      act(() => {
        result.current.handleVisibilityChange('1', false);
      });

      expect(result.current.hasChanges).toBe(true);

      // Save changes
      act(() => {
        result.current.handleSave();
      });

      expect(mockUpdateProjectVisibility).toHaveBeenCalledWith({
        '1': false,
        '2': false,
        '3': true
      });
      expect(result.current.hasChanges).toBe(false);
    });

    it('should cancel changes and revert to original state', () => {
      const { result } = renderHook(() => useSettings());

      // Make changes
      act(() => {
        result.current.handleVisibilityChange('1', false);
        result.current.handleVisibilityChange('2', true);
      });

      expect(result.current.hasChanges).toBe(true);

      // Cancel changes
      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.hasChanges).toBe(false);
      expect(result.current.visibilityState).toEqual({
        '1': true,
        '2': false,
        '3': true
      });
    });
  });

  // ==========================================================================
  // EDGE CASES TESTS
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty projects and missing user data', () => {
      mockUseProjectsContext.mockReturnValue({
        projects: [],
        isLoading: false,
        error: null,
        sidebarItems: []
      });

      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshAuth: vi.fn()
      });

      mockUseUserInformation.mockReturnValue({
        fullName: 'Not available',
        email: 'Not available',
        team: 'Not available',
        role: 'Not available'
      });

      const { result } = renderHook(() => useSettings());

      expect(result.current.visibilityState).toEqual({});
      expect(result.current.hasChanges).toBe(false);
      expect(result.current.processedUserInfo.fullName).toBe('Not available');

      // Should not crash when calling handlers
      act(() => {
        result.current.handleSelectAll();
        result.current.handleDeselectAll();
      });
    });
  });
});
