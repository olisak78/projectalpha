import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import LoginPage from '@/pages/LoginPage';
import { MemoryRouter } from 'react-router-dom';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom Navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: vi.fn(({ to }) => <div data-testid="navigate" data-to={to}>Navigate to {to}</div>),
  };
});

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: vi.fn(({ children, className }) => <div data-testid="card" className={className}>{children}</div>),
  CardContent: vi.fn(({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>),
  CardDescription: vi.fn(({ children }) => <div data-testid="card-description">{children}</div>),
  CardHeader: vi.fn(({ children, className }) => <div data-testid="card-header" className={className}>{children}</div>),
  CardTitle: vi.fn(({ children, className }) => <div data-testid="card-title" className={className}>{children}</div>),
}));

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick, disabled, className, variant }) => (
    <button
      data-testid="login-button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  )),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Github: vi.fn(() => <div data-testid="github-icon">GitHub Icon</div>),
}));

import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

describe('LoginPage', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      logout: vi.fn(),
    });
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  describe('Rendering', () => {
    it('should render login card', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should render card header', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByTestId('card-header')).toBeInTheDocument();
    });

    it('should render card title', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByTestId('card-title')).toBeInTheDocument();
      expect(screen.getByText('Welcome to Developer Portal')).toBeInTheDocument();
    });

    it('should render card description', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByTestId('card-description')).toBeInTheDocument();
      expect(screen.getByText('Choose your preferred login method to access the portal')).toBeInTheDocument();
    });

    it('should render card content', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('should render login button', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    it('should render GitHub icon in button', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByTestId('github-icon')).toBeInTheDocument();
    });

    it('should render button text', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByText('Sign in with GitHub Tools')).toBeInTheDocument();
    });

    it('should render terms of service text', () => {
      renderWithRouter(<LoginPage />);

      expect(screen.getByText(/By signing in, you agree to our terms of service and privacy policy/)).toBeInTheDocument();
    });
  });

  describe('Authentication State - Redirect', () => {
    it('should redirect to home when already authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        logout: vi.fn(),
      });

      renderWithRouter(<LoginPage />);

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });

    it('should not render login card when authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        logout: vi.fn(),
      });

      renderWithRouter(<LoginPage />);

      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('should call Navigate with replace prop', () => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        logout: vi.fn(),
      });

      renderWithRouter(<LoginPage />);

      expect(Navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/',
          replace: true,
        }),
        expect.anything()
      );
    });
  });

  describe('Loading State - Initial Auth Check', () => {
    it('should show loading spinner when auth is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: true,
        user: null,
        logout: vi.fn(),
      });

      renderWithRouter(<LoginPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show loading spinner element when auth is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: true,
        user: null,
        logout: vi.fn(),
      });

      const { container } = renderWithRouter(<LoginPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render login card when auth is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: true,
        user: null,
        logout: vi.fn(),
      });

      renderWithRouter(<LoginPage />);

      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('should apply correct styling to loading container', () => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: true,
        user: null,
        logout: vi.fn(),
      });

      const { container } = renderWithRouter(<LoginPage />);

      const loadingContainer = container.querySelector('.min-h-screen');
      expect(loadingContainer).toHaveClass('flex', 'items-center', 'justify-center', 'bg-background');
    });
  });

  describe('Login Flow', () => {
    it('should call login when button is clicked', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it('should show loading state when login is in progress', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should disable button during login', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      expect(loginButton).toBeDisabled();
    });

    it('should show spinner during login', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { container } = renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should re-enable button after successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled();
      });
    });

    it('should hide loading text after login completes', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should log error when login fails', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Login failed');
      mockLogin.mockRejectedValue(error);

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Login failed:', error);
      });

      consoleErrorSpy.mockRestore();
    });

    it('should re-enable button after login fails', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLogin.mockRejectedValue(new Error('Login failed'));

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle multiple failed login attempts', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLogin.mockRejectedValue(new Error('Login failed'));

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      
      await user.click(loginButton);
      await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));

      await user.click(loginButton);
      await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(2));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Button States', () => {
    it('should render button with default variant', () => {
      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      expect(loginButton).toHaveAttribute('data-variant', 'default');
    });

    it('should render button with full width class', () => {
      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      expect(loginButton).toHaveClass('w-full');
    });

    it('should not be disabled initially', () => {
      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      expect(loginButton).not.toBeDisabled();
    });
  });

  describe('UI Styling', () => {
    it('should apply correct container styling', () => {
      const { container } = renderWithRouter(<LoginPage />);

      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toHaveClass('flex', 'items-center', 'justify-center', 'bg-background', 'p-4');
    });

    it('should apply correct card styling', () => {
      renderWithRouter(<LoginPage />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-full', 'max-w-md');
    });

    it('should apply text-center to header', () => {
      renderWithRouter(<LoginPage />);

      const header = screen.getByTestId('card-header');
      expect(header).toHaveClass('text-center');
    });

    it('should apply correct title styling', () => {
      renderWithRouter(<LoginPage />);

      const title = screen.getByTestId('card-title');
      expect(title).toHaveClass('text-2xl', 'font-bold');
    });

    it('should apply space-y-4 to card content', () => {
      renderWithRouter(<LoginPage />);

      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('space-y-4');
    });
  });

  describe('Integration', () => {
    it('should call useAuth hook', () => {
      renderWithRouter(<LoginPage />);

      expect(useAuth).toHaveBeenCalled();
    });

    it('should use login function from useAuth', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);

      renderWithRouter(<LoginPage />);

      await user.click(screen.getByTestId('login-button'));

      expect(mockLogin).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button clicks', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      
      // Click multiple times rapidly
      await user.click(loginButton);
      await user.click(loginButton);
      await user.click(loginButton);

      // Should only call login once because button becomes disabled
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle login promise that never resolves', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<LoginPage />);

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Button should remain disabled
      expect(loginButton).toBeDisabled();
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should handle switching from loading to authenticated', () => {
      const { rerender } = renderWithRouter(<LoginPage />);

      // Initially loading
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: true,
        user: null,
        logout: vi.fn(),
      });

      rerender(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Then authenticated
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        logout: vi.fn(),
      });

      rerender(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });
});