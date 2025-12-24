import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ThemeSection from '../../../src/components/settings/ThemeSection';
import { useTheme } from '../../../src/stores/themeStore';

// Mock the Theme Store
vi.mock('../../../src/stores/themeStore', () => ({
  useTheme: vi.fn()
}));

/**
 * ThemeSection Component Tests
 * 
 * Tests for the ThemeSection component which provides theme selection
 * functionality (Light/Dark mode toggle). This component is used within
 * the CustomizationAppearanceSettings component.
 * 
 * Component Location: src/components/settings/ThemeSection.tsx
 * Dependencies: Theme Store
 */

// ============================================================================
// TEST UTILITIES
// ============================================================================

const mockUseTheme = useTheme as ReturnType<typeof vi.fn>;

/**
 * Helper function to render ThemeSection with mocked theme context
 */
function renderThemeSection() {
  return render(<ThemeSection />);
}

/**
 * Helper function to setup default theme context mock
 */
function setupDefaultThemeMock(actualTheme: 'light' | 'dark' = 'light') {
  const mockSetTheme = vi.fn();
  mockUseTheme.mockReturnValue({
    theme: actualTheme,
    actualTheme,
    setTheme: mockSetTheme,
    toggleTheme: vi.fn()
  });
  return { mockSetTheme };
}

// ============================================================================
// COMPONENT TESTS
// ============================================================================

describe('ThemeSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    it('should render theme section with buttons and proper styling', () => {
      setupDefaultThemeMock();
      renderThemeSection();
      
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Choose your preferred theme for the developer portal.')).toBeInTheDocument();
      
      const lightButton = screen.getByRole('button', { name: /light/i });
      const darkButton = screen.getByRole('button', { name: /dark/i });
      
      expect(lightButton).toBeInTheDocument();
      expect(darkButton).toBeInTheDocument();
      expect(lightButton.querySelector('.lucide-sun')).toBeInTheDocument();
      expect(darkButton.querySelector('.lucide-moon')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // THEME STATE TESTS
  // ==========================================================================

  describe('Theme State', () => {
    it('should highlight active theme button correctly', () => {
      // Test light theme active
      setupDefaultThemeMock('light');
      const { rerender } = renderThemeSection();
      
      let lightButton = screen.getByRole('button', { name: /light/i });
      let darkButton = screen.getByRole('button', { name: /dark/i });
      
      expect(lightButton).not.toHaveClass('border-input');
      expect(darkButton).toHaveClass('border-input');
      
      // Test dark theme active
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        actualTheme: 'dark',
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
      });
      
      rerender(<ThemeSection />);
      
      lightButton = screen.getByRole('button', { name: /light/i });
      darkButton = screen.getByRole('button', { name: /dark/i });
      
      expect(lightButton).toHaveClass('border-input');
      expect(darkButton).not.toHaveClass('border-input');
    });
  });

  // ==========================================================================
  // INTERACTION TESTS
  // ==========================================================================

  describe('Interactions', () => {
    it('should call setTheme when buttons are clicked', () => {
      const { mockSetTheme } = setupDefaultThemeMock('light');
      renderThemeSection();
      
      const lightButton = screen.getByRole('button', { name: /light/i });
      const darkButton = screen.getByRole('button', { name: /dark/i });
      
      fireEvent.click(darkButton);
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      
      fireEvent.click(lightButton);
      expect(mockSetTheme).toHaveBeenCalledWith('light');
      
      expect(mockSetTheme).toHaveBeenCalledTimes(2);
    });

    it('should be keyboard accessible', () => {
      setupDefaultThemeMock();
      renderThemeSection();
      
      const lightButton = screen.getByRole('button', { name: /light/i });
      const darkButton = screen.getByRole('button', { name: /dark/i });
      
      expect(lightButton).toBeEnabled();
      expect(darkButton).toBeEnabled();
      
      lightButton.focus();
      expect(document.activeElement).toBe(lightButton);
    });
  });

  // ==========================================================================
  // EDGE CASES TESTS
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle undefined actualTheme and errors gracefully', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        actualTheme: undefined as any,
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
      });
      
      expect(() => renderThemeSection()).not.toThrow();
      
      const lightButton = screen.getByRole('button', { name: /light/i });
      const darkButton = screen.getByRole('button', { name: /dark/i });
      
      // Should default to treating neither as active
      expect(lightButton).toHaveClass('border-input');
      expect(darkButton).toHaveClass('border-input');
    });
  });
});
