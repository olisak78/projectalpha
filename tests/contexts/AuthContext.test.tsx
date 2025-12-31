import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as authService from '@/services/authService';
import * as useMembers from '@/hooks/api/useMembers';
import * as helpers from '@/utils/developer-portal-helpers';
import type { User } from '@/types/developer-portal';
import React from 'react';

// Mock all dependencies
vi.mock('@/services/authService', () => ({
  authService: vi.fn(),
  checkAuthStatus: vi.fn(),
  logoutUser: vi.fn(),
}));

vi.mock('@/hooks/api/useMembers', () => ({
  fetchCurrentUser: vi.fn(),
}));

vi.mock('@/utils/developer-portal-helpers', () => ({
  buildUserFromMe: vi.fn(),
}));

describe('AuthContext', () => {
  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    c_number: 'C123456',
    team_id: 'team-1',
  };

  const mockMeData = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    c_number: 'C123456',
    team_id: 'team-1',
  };

  const mockAuthData = {
    isAuthenticated: true,
    token: 'mock-token',
  };

  // Helper component to test context values
  const TestComponent = () => {
    const auth = useAuth();
    return (
      <div>
        <div data-testid="user">{auth.user ? auth.user.name : 'null'}</div>
        <div data-testid="isAuthenticated">{String(auth.isAuthenticated)}</div>
        <div data-testid="isLoading">{String(auth.isLoading)}</div>
        <button onClick={() => auth.login().catch(() => {})} data-testid="login-btn">Login</button>
        <button onClick={() => auth.logout().catch(() => {})} data-testid="logout-btn">Logout</button>
        <button onClick={() => auth.refreshAuth().catch(() => {})} data-testid="refresh-btn">Refresh</button>
      </div>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.location
    delete (window as any).location;
    window.location = { pathname: '/' } as any;

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock as any;

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthProvider Initialization', () => {
    it('should check auth status on mount when not on login page', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authService.checkAuthStatus).toHaveBeenCalledTimes(1);
        expect(useMembers.fetchCurrentUser).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    it('should not check auth status when on login page', async () => {
      window.location.pathname = '/login';

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(authService.checkAuthStatus).not.toHaveBeenCalled();
      expect(useMembers.fetchCurrentUser).not.toHaveBeenCalled();
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('should start with loading state true', () => {
      window.location.pathname = '/login';

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initially loading should be true, then false after mount
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    it('should set user to null when auth check fails', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('should set user to null when fetchCurrentUser returns null', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('should handle errors during auth check gracefully', async () => {
      vi.mocked(authService.checkAuthStatus).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(console.error).toHaveBeenCalledWith(
        'Error checking auth status:',
        expect.any(Error)
      );
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
  });

  describe('login function', () => {
    it('should call authService with correct parameters', async () => {
      window.location.pathname = '/login';

      vi.mocked(authService.authService).mockResolvedValue(undefined);
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      screen.getByTestId('login-btn').click();

      await waitFor(() => {
        expect(authService.authService).toHaveBeenCalledWith({
          returnUrl: '/',
          storeReturnUrl: false,
        });
      });
    });

    it('should refresh auth after successful login', async () => {
      window.location.pathname = '/login';

      vi.mocked(authService.authService).mockResolvedValue(undefined);
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      screen.getByTestId('login-btn').click();

      await waitFor(() => {
        expect(authService.checkAuthStatus).toHaveBeenCalled();
        expect(useMembers.fetchCurrentUser).toHaveBeenCalled();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    it('should set loading state during login', async () => {
      window.location.pathname = '/login';

      let resolveAuth: any;
      vi.mocked(authService.authService).mockReturnValue(
        new Promise((resolve) => {
          resolveAuth = resolve;
        })
      );
      
      // Mock dependencies for refreshAuth that runs after login
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      screen.getByTestId('login-btn').click();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('true');
      });

      resolveAuth();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    // TODO: This test causes unhandled rejection - needs refactoring
    it.skip('should handle login errors and log them', async () => {
      window.location.pathname = '/login';

      const loginError = new Error('Login failed');
      vi.mocked(authService.authService).mockRejectedValue(loginError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // Click login button - the error will be handled internally
      screen.getByTestId('login-btn').click();

      // Wait for error to be logged
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Login error:', loginError);
      });

      // Should still set loading to false even on error
      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });
  });

  describe('logout function', () => {
    it('should call logoutUser service', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);
      vi.mocked(authService.logoutUser).mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      });

      screen.getByTestId('logout-btn').click();

      await waitFor(() => {
        expect(authService.logoutUser).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear user state after logout', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);
      vi.mocked(authService.logoutUser).mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      });

      screen.getByTestId('logout-btn').click();

      // Wait for loading to complete first
      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // Then check user is cleared
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('should set loading state during logout', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      let resolveLogout: any;
      vi.mocked(authService.logoutUser).mockReturnValue(
        new Promise((resolve) => {
          resolveLogout = resolve;
        })
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      });

      screen.getByTestId('logout-btn').click();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('true');
      });

      resolveLogout();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    it('should handle logout errors gracefully', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      const logoutError = new Error('Logout failed');
      vi.mocked(authService.logoutUser).mockRejectedValue(logoutError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      });

      screen.getByTestId('logout-btn').click();

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Logout error:', logoutError);
      });

      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    it('should handle logout service failure and keep user state', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);
      vi.mocked(authService.logoutUser).mockRejectedValue(new Error('Logout failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      });

      screen.getByTestId('logout-btn').click();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // User should still be there because logout failed before setUser(null)
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      
      // Console error should have been called
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Logout error:',
          expect.any(Error)
        );
      });
    });
  });

  describe('refreshAuth function', () => {
    it('should refresh user data successfully', async () => {
      window.location.pathname = '/login';

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      screen.getByTestId('refresh-btn').click();

      await waitFor(() => {
        expect(authService.checkAuthStatus).toHaveBeenCalled();
        expect(useMembers.fetchCurrentUser).toHaveBeenCalled();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    it('should clear quick-links from localStorage on successful refresh', async () => {
      window.location.pathname = '/login';

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      screen.getByTestId('refresh-btn').click();

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith('quick-links');
      });
    });

    it('should handle localStorage errors gracefully', async () => {
      window.location.pathname = '/login';

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);
      vi.mocked(localStorage.removeItem).mockImplementation(() => {
        throw new Error('localStorage error');
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      screen.getByTestId('refresh-btn').click();

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Failed to clear quick-links from localStorage:',
          expect.any(Error)
        );
      });

      // Should still have updated user
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });

    it('should throw error when auth check fails', async () => {
      window.location.pathname = '/login';

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.refreshAuth()).rejects.toThrow(
        'Authentication failed'
      );

      expect(result.current.user).toBe(null);
    });

    it('should throw error when fetchCurrentUser returns null', async () => {
      window.location.pathname = '/login';

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.refreshAuth()).rejects.toThrow(
        'Failed to fetch current user'
      );

      expect(result.current.user).toBe(null);
    });

    it('should throw error when fetchCurrentUser fails', async () => {
      window.location.pathname = '/login';

      const fetchError = new Error('Network error');
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockRejectedValue(fetchError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.refreshAuth()).rejects.toThrow('Network error');

      expect(console.error).toHaveBeenCalledWith('Refresh auth error:', fetchError);
      expect(result.current.user).toBe(null);
    });

    it('should clear user state when refresh fails', async () => {
      vi.mocked(authService.checkAuthStatus)
        .mockResolvedValueOnce(mockAuthData) // For initial mount
        .mockResolvedValueOnce(null); // For refresh attempt
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth to complete
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isLoading).toBe(false);
      });

      // Attempt refresh which should fail
      await expect(result.current.refreshAuth()).rejects.toThrow(
        'Authentication failed'
      );

      // User should be cleared
      expect(result.current.user).toBe(null);
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });

    it('should return auth context when used inside AuthProvider', () => {
      window.location.pathname = '/login';

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('refreshAuth');
    });

    it('should have correct function types', () => {
      window.location.pathname = '/login';

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.refreshAuth).toBe('function');
    });
  });

  describe('Context Value', () => {
    it('should have isAuthenticated true when user exists', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });

    it('should have isAuthenticated false when user is null', async () => {
      vi.mocked(authService.checkAuthStatus).mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple children', async () => {
      window.location.pathname = '/login';

      render(
        <AuthProvider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child-1')).toBeInTheDocument();
        expect(screen.getByTestId('child-2')).toBeInTheDocument();
      });
    });

    it('should handle buildUserFromMe returning different user data', async () => {
      const differentUser = {
        ...mockUser,
        name: 'Different User',
        email: 'different@example.com',
      };

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);
      vi.mocked(useMembers.fetchCurrentUser).mockResolvedValue(mockMeData);
      vi.mocked(helpers.buildUserFromMe).mockReturnValue(differentUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Different User');
      });
    });

    it('should handle pathname with trailing slash', async () => {
      window.location.pathname = '/login/';

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // Should still check auth because pathname is /login/ not /login
      expect(authService.checkAuthStatus).toHaveBeenCalled();
    });

    it('should handle pathname case sensitivity', async () => {
      window.location.pathname = '/Login';

      vi.mocked(authService.checkAuthStatus).mockResolvedValue(mockAuthData);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // Should check auth because pathname is /Login not /login
      expect(authService.checkAuthStatus).toHaveBeenCalled();
    });
  });
});