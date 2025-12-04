import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';
import { ReactNode } from 'react';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
});

// Mock document.documentElement
const mockDocumentElement = {
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
  },
};

Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
  writable: true,
});

// Test component to access context
const TestComponent = () => {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();
  
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="actual-theme">{actualTheme}</div>
      <button data-testid="set-light-btn" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark-btn" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button data-testid="set-system-btn" onClick={() => setTheme('system')}>
        Set System
      </button>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  const renderWithProvider = (children: ReactNode, defaultTheme?: 'light' | 'dark' | 'system') => {
    return render(
      <ThemeProvider defaultTheme={defaultTheme}>
        {children}
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Default matchMedia mock (light theme)
    const mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockMatchMedia.mockReturnValue(mockMediaQueryList);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ThemeProvider', () => {
    it('should initialize with system theme by default', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('light');
    });

    it('should load stored theme from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
    });

    it('should handle invalid stored theme gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-theme');

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('light');
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to read theme from localStorage:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should apply theme to document element', () => {
      renderWithProvider(<TestComponent />);

      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('light');
    });

    it('should set light theme', async () => {
      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-light-btn').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('light');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('developer-portal-theme', 'light');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('light');
    });

    it('should set dark theme', async () => {
      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-dark-btn').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('developer-portal-theme', 'dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should set system theme and follow system preference', async () => {
      // Mock system dark theme
      const mockMediaQueryList = {
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQueryList);

      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-system-btn').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('developer-portal-theme', 'system');
    });

    it('should handle localStorage setItem errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage setItem error');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-light-btn').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store theme in localStorage:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should listen to system theme changes when theme is system', async () => {
      const mockMediaQueryList = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQueryList);

      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-system-btn').click();
      });

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      // Simulate system theme change
      const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1];
      await act(async () => {
        changeHandler({ matches: true });
      });

      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
    });

    it('should toggle theme from light to dark', async () => {
      renderWithProvider(<TestComponent />);

      // Set to light first
      await act(async () => {
        screen.getByTestId('set-light-btn').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('light');

      // Toggle
      await act(async () => {
        screen.getByTestId('toggle-btn').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
    });

    it('should toggle from system to opposite of current system theme', async () => {
      // Mock system light theme
      const mockMediaQueryList = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQueryList);

      renderWithProvider(<TestComponent />);

      // Set to system first
      await act(async () => {
        screen.getByTestId('set-system-btn').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('light');

      // Toggle should switch to dark (opposite of system light)
      await act(async () => {
        screen.getByTestId('toggle-btn').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
    });

    it('should cleanup system theme listener on unmount', async () => {
      const mockMediaQueryList = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQueryList);

      const { unmount } = renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-system-btn').click();
      });

      expect(mockMediaQueryList.addEventListener).toHaveBeenCalled();

      unmount();

      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('useTheme', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide correct context values', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('light');
      
      // Check that all functions are available
      expect(screen.getByTestId('set-light-btn')).toBeInTheDocument();
      expect(screen.getByTestId('set-dark-btn')).toBeInTheDocument();
      expect(screen.getByTestId('set-system-btn')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-btn')).toBeInTheDocument();
    });
  });
});
