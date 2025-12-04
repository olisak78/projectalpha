import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { ReactNode } from 'react';

vi.mock('../../src/services/authService');
vi.mock('../../src/utils/developer-portal-helpers');

// Mock window.location
const mockLocation = {
  pathname: '/',
  href: 'http://localhost:3000/',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

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

// Mock user data
const mockUserData = {
  profile: {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
  },
  token: 'mock-token',
};

const mockUser = {
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  roles: ['user'],
};

// Test component to access context
const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout, refreshAuth } = useAuth();
  
  return (
    <div>
      <div data-testid="user">{user ? user.name : 'no-user'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <button data-testid="login-btn" onClick={login}>Login</button>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
      <button data-testid="refresh-btn" onClick={refreshAuth}>Refresh</button>
    </div>
  );
};

describe('AuthContext', () => {
  const renderWithProvider = (children: ReactNode) => {
    return render(
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLocation.pathname = '/';
    mockLocalStorage.removeItem.mockClear();

    // Setup default mocks
    const authService = await import('../../src/services/authService');
    const helpers = await import('../../src/utils/developer-portal-helpers');
    
    vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockUserData);
    vi.mocked(helpers.buildUserFromAuthData).mockReturnValue(mockUser);
    vi.mocked(authService.authService).mockResolvedValue(undefined);
    vi.mocked(authService.logoutUser).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should initialize with loading state and check auth status on mount', async () => {
      renderWithProvider(<TestComponent />);

      // Initially should be loading
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');

      // Wait for auth check to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    it('should not check auth status when on login page', async () => {
      mockLocation.pathname = '/login';

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });

    it('should handle auth check failure', async () => {
      const authService = await import('../../src/services/authService');
      vi.mocked(authService.checkAuthStatus).mockRejectedValue(new Error('Auth check failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(consoleSpy).toHaveBeenCalledWith('Error checking auth status:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle login successfully', async () => {
      renderWithProvider(<TestComponent />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Trigger login
      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      });
    });

    it('should handle logout successfully', async () => {
      renderWithProvider(<TestComponent />);

      // Wait for initial auth
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      });

      // Trigger logout
      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      });
    });

    it('should handle refresh auth successfully', async () => {
      renderWithProvider(<TestComponent />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Trigger refresh
      await act(async () => {
        screen.getByTestId('refresh-btn').click();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('quick-links');
    });
  });

  describe('useAuth', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide correct context values', async () => {
      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      
      // Check that all functions are available
      expect(screen.getByTestId('login-btn')).toBeInTheDocument();
      expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-btn')).toBeInTheDocument();
    });
  });
});
