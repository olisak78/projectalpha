import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeaderNavigationProvider, useHeaderNavigation } from '../../src/contexts/HeaderNavigationContext';
import { ReactNode } from 'react';

// Mock React Router
const mockNavigate = vi.fn();
const mockLocation = {
  pathname: '/project1/tab1',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}));

// Mock ProjectsContext
const mockProjects = [
  { name: 'project1', id: 'project1' },
  { name: 'project2', id: 'project2' },
];

vi.mock('../../src/contexts/ProjectsContext', () => ({
  useProjectsContext: () => ({
    projects: mockProjects,
  }),
}));

// Mock constants
vi.mock('../../src/constants/developer-portal', () => ({
  DEFAULT_COMMON_TAB: 'overview',
  VALID_COMMON_TABS: ['overview', 'components', 'settings'],
  getNewBackendUrl: () => 'http://localhost:3000',
}));

// Mock helper functions
vi.mock('../../src/utils/developer-portal-helpers', () => ({
  getBasePath: vi.fn(),
  shouldNavigateToTab: vi.fn(),
}));

// Test component to access context
const TestComponent = () => {
  const { tabs, activeTab, setTabs, setActiveTab, isDropdown, setIsDropdown } = useHeaderNavigation();
  
  return (
    <div>
      <div data-testid="tabs-count">{tabs.length}</div>
      <div data-testid="active-tab">{activeTab || 'none'}</div>
      <div data-testid="is-dropdown">{isDropdown ? 'true' : 'false'}</div>
      
      <div data-testid="tabs">
        {tabs.map(tab => (
          <div key={tab.id} data-testid={`tab-${tab.id}`}>
            {tab.label}
          </div>
        ))}
      </div>
      
      <button 
        data-testid="set-tabs-btn" 
        onClick={() => setTabs([
          { id: 'tab1', label: 'Tab 1' },
          { id: 'tab2', label: 'Tab 2' },
        ])}
      >
        Set Tabs
      </button>
      
      <button 
        data-testid="set-active-tab-btn" 
        onClick={() => setActiveTab('tab2')}
      >
        Set Active Tab
      </button>
      
      <button 
        data-testid="toggle-dropdown-btn" 
        onClick={() => setIsDropdown(!isDropdown)}
      >
        Toggle Dropdown
      </button>
    </div>
  );
};

describe('HeaderNavigationContext', () => {
  const renderWithProvider = (children: ReactNode) => {
    return render(
      <HeaderNavigationProvider>
        {children}
      </HeaderNavigationProvider>
    );
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLocation.pathname = '/project1/tab1';
    
    // Setup default mocks
    const helpers = await import('../../src/utils/developer-portal-helpers');
    vi.mocked(helpers.getBasePath).mockReturnValue('/project1');
    vi.mocked(helpers.shouldNavigateToTab).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('HeaderNavigationProvider', () => {
    it('should initialize with empty tabs and no active tab', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('tabs-count')).toHaveTextContent('0');
      expect(screen.getByTestId('active-tab')).toHaveTextContent('none');
      expect(screen.getByTestId('is-dropdown')).toHaveTextContent('false');
    });

    it('should set tabs and default to first tab', async () => {
      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-tabs-btn').click();
      });

      expect(screen.getByTestId('tabs-count')).toHaveTextContent('2');
      expect(screen.getByTestId('tab-tab1')).toHaveTextContent('Tab 1');
      expect(screen.getByTestId('tab-tab2')).toHaveTextContent('Tab 2');
      expect(screen.getByTestId('active-tab')).toHaveTextContent('tab1');
    });


    it('should toggle dropdown state', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('is-dropdown')).toHaveTextContent('false');

      await act(async () => {
        screen.getByTestId('toggle-dropdown-btn').click();
      });

      expect(screen.getByTestId('is-dropdown')).toHaveTextContent('true');

      await act(async () => {
        screen.getByTestId('toggle-dropdown-btn').click();
      });

      expect(screen.getByTestId('is-dropdown')).toHaveTextContent('false');
    });


    it('should handle teams path navigation', async () => {
      const helpers = await import('../../src/utils/developer-portal-helpers');
      
      vi.mocked(helpers.getBasePath).mockReturnValue('/teams');
      mockLocation.pathname = '/teams/team1/overview';

      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-tabs-btn').click();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/teams/tab1/overview', { replace: true });
    });

    it('should not navigate when shouldNavigateToTab returns false', async () => {
      const helpers = await import('../../src/utils/developer-portal-helpers');
      
      vi.mocked(helpers.shouldNavigateToTab).mockReturnValue(false);

      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-tabs-btn').click();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle existing valid tab in URL when setting tabs', async () => {
      mockLocation.pathname = '/project1/tab2';

      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-tabs-btn').click();
      });

      expect(screen.getByTestId('active-tab')).toHaveTextContent('tab2');
      expect(mockNavigate).not.toHaveBeenCalled(); // Should not navigate if tab is already valid
    });

    it('should handle empty tabs array', async () => {
      const TestComponentWithEmptyTabs = () => {
        const { setTabs } = useHeaderNavigation();
        
        return (
          <div>
            <button 
              data-testid="set-empty-tabs-btn" 
              onClick={() => setTabs([])}
            >
              Set Empty Tabs
            </button>
          </div>
        );
      };

      renderWithProvider(<TestComponentWithEmptyTabs />);

      await act(async () => {
        screen.getByTestId('set-empty-tabs-btn').click();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('useHeaderNavigation', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useHeaderNavigation must be used within a HeaderNavigationProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide correct context values', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('tabs-count')).toBeInTheDocument();
      expect(screen.getByTestId('active-tab')).toBeInTheDocument();
      expect(screen.getByTestId('is-dropdown')).toBeInTheDocument();
      
      // Check that all functions are available
      expect(screen.getByTestId('set-tabs-btn')).toBeInTheDocument();
      expect(screen.getByTestId('set-active-tab-btn')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-dropdown-btn')).toBeInTheDocument();
    });
  });

  describe('tab navigation edge cases', () => {
    it('should handle setting active tab for teams path', async () => {
      const helpers = await import('../../src/utils/developer-portal-helpers');
      
      vi.mocked(helpers.getBasePath).mockReturnValue('/teams');
      mockLocation.pathname = '/teams/team1/components';

      renderWithProvider(<TestComponent />);

      // Set tabs first
      await act(async () => {
        screen.getByTestId('set-tabs-btn').click();
      });

      // Set active tab
      await act(async () => {
        screen.getByTestId('set-active-tab-btn').click();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/teams/tab2/components', { replace: false });
    });

    it('should handle null base path', async () => {
      const helpers = await import('../../src/utils/developer-portal-helpers');
      
      vi.mocked(helpers.getBasePath).mockReturnValue(null);

      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-active-tab-btn').click();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle invalid tab ID in URL', async () => {
      mockLocation.pathname = '/project1/invalid-tab';

      renderWithProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('set-tabs-btn').click();
      });

      // Should default to first tab and navigate
      expect(screen.getByTestId('active-tab')).toHaveTextContent('tab1');
      expect(mockNavigate).toHaveBeenCalledWith('/project1/tab1', { replace: true });
    });
  });
});
