import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthErrorProvider, triggerGlobalAuthError } from '../../src/contexts/AuthErrorContext';
import { ReactNode } from 'react';

// Mock dependencies
vi.mock('../../src/hooks/useAuthRefresh', () => ({
  useAuthRefresh: vi.fn(() => ({
    isAuthenticated: true,
    authError: null,
    isLoading: false,
    retry: vi.fn(),
  })),
}));

vi.mock('../../src/lib/authRefreshService', () => ({
  setGlobalAuthErrorTrigger: vi.fn(),
  clearGlobalAuthErrorTrigger: vi.fn(),
}));

vi.mock('../../src/components/AuthErrorHandler', () => ({
  AuthErrorHandler: ({ message, onRetrySuccess, onRetryError }: any) => (
    <div data-testid="auth-error-handler">
      <div data-testid="error-message">{message}</div>
      <button data-testid="retry-success-btn" onClick={() => onRetrySuccess?.()}>
        Retry Success
      </button>
      <button data-testid="retry-error-btn" onClick={() => onRetryError?.(new Error('Retry failed'))}>
        Retry Error
      </button>
    </div>
  ),
}));

// Test component
const TestComponent = () => {
  return (
    <div>
      <button 
        data-testid="trigger-error-btn" 
        onClick={() => triggerGlobalAuthError('Authentication failed')}
      >
        Trigger Error
      </button>
      <div data-testid="content">Test Content</div>
    </div>
  );
};

describe('AuthErrorContext', () => {
  const renderWithProvider = (children: ReactNode) => {
    return render(
      <AuthErrorProvider>
        {children}
      </AuthErrorProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthErrorProvider', () => {
    it('should render children without auth error', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('content')).toHaveTextContent('Test Content');
      expect(screen.queryByTestId('auth-error-handler')).not.toBeInTheDocument();
    });

    it('should set and clear global auth error trigger on mount/unmount', async () => {
      const { setGlobalAuthErrorTrigger, clearGlobalAuthErrorTrigger } = await import('../../src/lib/authRefreshService');
      
      const { unmount } = renderWithProvider(<TestComponent />);

      expect(setGlobalAuthErrorTrigger).toHaveBeenCalled();

      unmount();

      expect(clearGlobalAuthErrorTrigger).toHaveBeenCalled();
    });

    it('should show auth error when triggered globally', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.queryByTestId('auth-error-handler')).not.toBeInTheDocument();

      await act(async () => {
        screen.getByTestId('trigger-error-btn').click();
      });

      expect(screen.getByTestId('auth-error-handler')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Authentication failed');
    });

    it('should handle retry success', async () => {
      renderWithProvider(<TestComponent />);

      // Trigger error
      await act(async () => {
        screen.getByTestId('trigger-error-btn').click();
      });

      expect(screen.getByTestId('auth-error-handler')).toBeInTheDocument();

      // Click retry success
      await act(async () => {
        screen.getByTestId('retry-success-btn').click();
      });

      // Auth error should be hidden after successful retry
      await waitFor(() => {
        expect(screen.queryByTestId('auth-error-handler')).not.toBeInTheDocument();
      });
    });

    it('should handle retry error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderWithProvider(<TestComponent />);

      // Trigger error
      await act(async () => {
        screen.getByTestId('trigger-error-btn').click();
      });

      expect(screen.getByTestId('auth-error-handler')).toBeInTheDocument();

      // Click retry error
      await act(async () => {
        screen.getByTestId('retry-error-btn').click();
      });

      // Error should still be visible
      expect(screen.getByTestId('auth-error-handler')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should show auth error when global auth error is detected', async () => {
      const { useAuthRefresh } = await import('../../src/hooks/useAuthRefresh');
      
      // Mock useAuthRefresh to return an auth error
      vi.mocked(useAuthRefresh).mockReturnValue({
        isAuthenticated: false,
        authError: 'Global auth error detected',
        isLoading: false,
        retry: vi.fn(),
      });

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-handler')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Global auth error detected');
      });
    });

    it('should not show duplicate auth error when already visible', async () => {
      const { useAuthRefresh } = await import('../../src/hooks/useAuthRefresh');
      
      // Mock useAuthRefresh to return an auth error
      vi.mocked(useAuthRefresh).mockReturnValue({
        isAuthenticated: false,
        authError: 'Auth error',
        isLoading: false,
        retry: vi.fn(),
      });

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-handler')).toBeInTheDocument();
      });

      // Should only have one auth error handler
      expect(screen.getAllByTestId('auth-error-handler')).toHaveLength(1);
    });
  });

  describe('triggerGlobalAuthError', () => {
    it('should not throw when no global handler is set', () => {
      expect(() => {
        triggerGlobalAuthError('Test error');
      }).not.toThrow();
    });

    it('should call global handler when available', async () => {
      renderWithProvider(<TestComponent />);

      // Trigger error
      await act(async () => {
        triggerGlobalAuthError('Test global error');
      });

      expect(screen.getByTestId('auth-error-handler')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Test global error');
    });
  });
});
