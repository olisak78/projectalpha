import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeveloperPortalHeader } from '../../../src/components/DeveloperPortalHeader/DeveloperPortalHeader';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useIsMobile } from '../../../src/hooks/use-mobile';
import { useHeaderNavigation } from '../../../src/contexts/HeaderNavigationContext';
import { useTheme } from '../../../src/stores/themeStore';


// Mock all the contexts and hooks
vi.mock('../../../src/contexts/AuthContext');
vi.mock('../../../src/hooks/use-mobile');
vi.mock('../../../src/contexts/HeaderNavigationContext');
vi.mock('../../../src/stores/themeStore');
vi.mock('../../../src/stores/sidebarStore');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock UI components
vi.mock('../../../src/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className}
      data-variant={variant}
      data-size={size}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  )
}));

// Mock Breadcrumbs component
vi.mock('../../../src/components/Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs">Breadcrumbs</div>
}));

// Mock UserProfileDropdown component
vi.mock('../../../src/components/DeveloperPortalHeader/UserProfileDropdown', () => ({
  UserProfileDropdown: ({ user, onLogout }: any) => (
    <div data-testid="user-profile-dropdown">
      <span data-testid="user-name">{user.name}</span>
      <button data-testid="logout-button" onClick={onLogout}>Logout</button>
    </div>
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bell: ({ className }: any) => <div data-testid="bell-icon" className={className}>Bell</div>,
  Sun: ({ className }: any) => <div data-testid="sun-icon" className={className}>Sun</div>,
  Moon: ({ className }: any) => <div data-testid="moon-icon" className={className}>Moon</div>,
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Default test data
const defaultUser = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  picture: 'https://example.com/avatar.jpg',
  memberId: 'member-123'
};

const defaultProps = {
  unreadCount: 0,
  onNotificationClick: vi.fn()
};

describe('DeveloperPortalHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(useAuth).mockReturnValue({
      user: defaultUser,
      logout: vi.fn()
    } as any);
    
    vi.mocked(useIsMobile).mockReturnValue(false);
    
    vi.mocked(useHeaderNavigation).mockReturnValue({
      tabs: [],
      activeTab: null,
      setActiveTab: vi.fn(),
      isDropdown: false
    } as any);
    
    vi.mocked(useTheme).mockReturnValue({
      actualTheme: 'light',
      toggleTheme: vi.fn()
    } as any);
    
  });

  describe('Basic rendering', () => {
    it('renders all header elements correctly', () => {
      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      // Check all main elements are rendered
      expect(screen.getByText('Developer Portal')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('user-name')).toHaveTextContent(defaultUser.name);
    });

    it('does not render user profile dropdown when user is null', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        logout: vi.fn()
      } as any);

      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('user-profile-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('Theme toggle functionality', () => {
    it('shows correct icon and aria-label for light mode and handles click', () => {
      const mockToggleTheme = vi.fn();
      vi.mocked(useTheme).mockReturnValue({
        actualTheme: 'light',
        toggleTheme: mockToggleTheme
      } as any);

      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();

      const themeButton = screen.getByLabelText('Switch to dark mode');
      fireEvent.click(themeButton);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('shows correct icon and aria-label for dark mode', () => {
      vi.mocked(useTheme).mockReturnValue({
        actualTheme: 'dark',
        toggleTheme: vi.fn()
      } as any);

      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
    });
  });

  describe('Notification functionality', () => {
    it('handles notification clicks and displays unread count correctly', () => {
      const mockOnNotificationClick = vi.fn();

      render(
        <TestWrapper>
          <DeveloperPortalHeader 
            {...defaultProps} 
            onNotificationClick={mockOnNotificationClick}
            unreadCount={5}
          />
        </TestWrapper>
      );

      // Test click functionality
      const notificationButton = screen.getByLabelText('Notifications');
      fireEvent.click(notificationButton);
      expect(mockOnNotificationClick).toHaveBeenCalledTimes(1);

      // Test badge display
      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-500');
    });

    it('does not show badge when unreadCount is 0', () => {
      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} unreadCount={0} />
        </TestWrapper>
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Navigation functionality', () => {
    it('navigates to home when title is clicked', () => {
      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      const title = screen.getByText('Developer Portal');
      fireEvent.click(title);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

  });

  describe('Logout functionality', () => {
    it('calls logout when logout button is clicked', async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuth).mockReturnValue({
        user: defaultUser,
        logout: mockLogout
      } as any);

      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      const logoutButton = screen.getByTestId('logout-button');
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('handles logout error gracefully', async () => {
      const mockLogout = vi.fn().mockRejectedValue(new Error('Logout failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(useAuth).mockReturnValue({
        user: defaultUser,
        logout: mockLogout
      } as any);

      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      const logoutButton = screen.getByTestId('logout-button');
      fireEvent.click(logoutButton);

      // Wait for the error to be handled
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Styling and accessibility', () => {
    it('applies correct CSS classes and maintains accessibility', () => {
      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      // Check CSS classes
      const header = screen.getByText('Developer Portal').closest('.bg-background');
      expect(header).toBeInTheDocument();

      const title = screen.getByText('Developer Portal');
      expect(title).toHaveClass('cursor-pointer', 'hover:text-blue-600', 'dark:hover:text-blue-400');

      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('data-variant', 'ghost');
        expect(button).toHaveAttribute('data-size', 'sm');
      });

      // Check accessibility
      expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();

      const themeButton = screen.getByLabelText('Switch to dark mode');
      const notificationButton = screen.getByLabelText('Notifications');
      expect(themeButton).toBeVisible();
      expect(notificationButton).toBeVisible();
    });

    it('adapts to mobile view', () => {
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <TestWrapper>
          <DeveloperPortalHeader {...defaultProps} />
        </TestWrapper>
      );

      // Component should still render all elements in mobile view
      expect(screen.getByText('Developer Portal')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    });
  });
});
