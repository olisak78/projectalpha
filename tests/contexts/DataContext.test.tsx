import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataProvider, useData } from '../../src/contexts/DataContext';
import { ReactNode } from 'react';

// Mock dependencies
vi.mock('../../src/data/mockFeatureToggles', () => ({
  mockFeatureToggles: [
    {
      id: '1',
      name: 'feature-1',
      component: 'component-1',
      enabled: true,
      description: 'Test feature 1',
    },
    {
      id: '2',
      name: 'feature-2',
      component: 'component-2',
      enabled: false,
      description: 'Test feature 2',
    },
  ],
}));

vi.mock('../../src/constants/developer-portal', () => ({
  projectComponents: {
    'project-1': [
      { id: 'component-1', name: 'Component 1' },
      { id: 'component-2', name: 'Component 2' },
    ],
    'project-2': [
      { id: 'component-3', name: 'Component 3' },
    ],
  },
}));

vi.mock('../../src/types/developer-portal', () => ({
  componentVersions: {
    'component-1': [
      { landscape: 'dev', buildProperties: { version: '1.0.0' } },
      { landscape: 'prod', buildProperties: { version: '1.1.0' } },
    ],
    'component-2': [
      { landscape: 'dev', buildProperties: { version: '2.0.0' } },
    ],
  },
}));

// Mock feature toggles data
const mockFeatureToggles = [
  {
    id: '1',
    name: 'feature-1',
    component: 'component-1',
    enabled: true,
    description: 'Test feature 1',
  },
  {
    id: '2',
    name: 'feature-2',
    component: 'component-2',
    enabled: false,
    description: 'Test feature 2',
  },
];

// Test component to access context
const TestComponent = () => {
  const {
    featureToggles,
    setFeatureToggles,
    expandedToggles,
    setExpandedToggles,
    toggleFilter,
    setToggleFilter,
    logLevels,
    setLogLevels,
    componentFilter,
    setComponentFilter,
    expandedComponents,
    setExpandedComponents,
    getComponentHealth,
    getComponentAlerts,
    getDeployedVersion,
    getStatusColor,
    getAvailableComponents,
  } = useData();
  
  return (
    <div>
      <div data-testid="feature-toggles-count">{featureToggles.length}</div>
      <div data-testid="expanded-toggles-count">{expandedToggles.size}</div>
      <div data-testid="toggle-filter">{toggleFilter}</div>
      <div data-testid="component-filter">{componentFilter}</div>
      <div data-testid="log-levels-count">{Object.keys(logLevels).length}</div>
      <div data-testid="expanded-components-count">{Object.keys(expandedComponents).length}</div>
      
      <div data-testid="feature-toggles">
        {featureToggles.map(toggle => (
          <div key={toggle.id} data-testid={`toggle-${toggle.id}`}>
            {toggle.name}: {toggle.enabled ? 'enabled' : 'disabled'}
          </div>
        ))}
      </div>
      
      <div data-testid="component-health">
        {getComponentHealth('component-1', 'dev')}
      </div>
      <div data-testid="component-alerts">
        {getComponentAlerts('component-1', 'dev') ? 'has-alerts' : 'no-alerts'}
      </div>
      <div data-testid="deployed-version">
        {getDeployedVersion('component-1', 'dev') || 'no-version'}
      </div>
      <div data-testid="status-color">
        {getStatusColor('healthy')}
      </div>
      <div data-testid="available-components">
        {getAvailableComponents('project-1', featureToggles).join(',')}
      </div>
      
      <button data-testid="add-toggle-btn" onClick={() => {
        const newToggle = {
          id: '3',
          name: 'feature-3',
          component: 'component-3',
          enabled: true,
          description: 'Test feature 3',
        };
        setFeatureToggles(prev => [...prev, newToggle]);
      }}>
        Add Toggle
      </button>
      
      <button data-testid="expand-toggle-btn" onClick={() => {
        setExpandedToggles(prev => new Set([...prev, 'toggle-1']));
      }}>
        Expand Toggle
      </button>
      
      <button data-testid="set-filter-btn" onClick={() => {
        setToggleFilter('all-enabled');
      }}>
        Set Filter
      </button>
      
      <button data-testid="set-log-level-btn" onClick={() => {
        setLogLevels(prev => ({ ...prev, 'component-1': 'DEBUG' }));
      }}>
        Set Log Level
      </button>
      
      <button data-testid="set-component-filter-btn" onClick={() => {
        setComponentFilter('component-1');
      }}>
        Set Component Filter
      </button>
      
      <button data-testid="expand-component-btn" onClick={() => {
        setExpandedComponents(prev => ({ ...prev, 'component-1': true }));
      }}>
        Expand Component
      </button>
    </div>
  );
};

describe('DataContext', () => {
  const renderWithProvider = (children: ReactNode) => {
    return render(
      <DataProvider>
        {children}
      </DataProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DataProvider', () => {
    it('should initialize with default values', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('feature-toggles-count')).toHaveTextContent('2');
      expect(screen.getByTestId('expanded-toggles-count')).toHaveTextContent('0');
      expect(screen.getByTestId('toggle-filter')).toHaveTextContent('all');
      expect(screen.getByTestId('component-filter')).toHaveTextContent('all');
      expect(screen.getByTestId('log-levels-count')).toHaveTextContent('0');
      expect(screen.getByTestId('expanded-components-count')).toHaveTextContent('0');
    });

    it('should render initial feature toggles', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('toggle-1')).toHaveTextContent('feature-1: enabled');
      expect(screen.getByTestId('toggle-2')).toHaveTextContent('feature-2: disabled');
    });

    it('should add new feature toggle', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('feature-toggles-count')).toHaveTextContent('2');

      await act(async () => {
        screen.getByTestId('add-toggle-btn').click();
      });

      expect(screen.getByTestId('feature-toggles-count')).toHaveTextContent('3');
      expect(screen.getByTestId('toggle-3')).toHaveTextContent('feature-3: enabled');
    });

    it('should expand toggle', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('expanded-toggles-count')).toHaveTextContent('0');

      await act(async () => {
        screen.getByTestId('expand-toggle-btn').click();
      });

      expect(screen.getByTestId('expanded-toggles-count')).toHaveTextContent('1');
    });

    it('should set toggle filter', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('toggle-filter')).toHaveTextContent('all');

      await act(async () => {
        screen.getByTestId('set-filter-btn').click();
      });

      expect(screen.getByTestId('toggle-filter')).toHaveTextContent('all-enabled');
    });

    it('should set log level', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('log-levels-count')).toHaveTextContent('0');

      await act(async () => {
        screen.getByTestId('set-log-level-btn').click();
      });

      expect(screen.getByTestId('log-levels-count')).toHaveTextContent('1');
    });

    it('should set component filter', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('component-filter')).toHaveTextContent('all');

      await act(async () => {
        screen.getByTestId('set-component-filter-btn').click();
      });

      expect(screen.getByTestId('component-filter')).toHaveTextContent('component-1');
    });

    it('should expand component', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('expanded-components-count')).toHaveTextContent('0');

      await act(async () => {
        screen.getByTestId('expand-component-btn').click();
      });

      expect(screen.getByTestId('expanded-components-count')).toHaveTextContent('1');
    });
  });

  describe('Helper Functions', () => {
    it('should get component health', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('component-health')).toHaveTextContent('UP');
    });

    it('should get component alerts', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('component-alerts')).toHaveTextContent('no-alerts');
    });

    it('should get deployed version', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('deployed-version')).toHaveTextContent('1.0.0');
    });

    it('should get status colors correctly', () => {
      const TestComponentWithStatusColors = () => {
        const { getStatusColor } = useData();
        return (
          <div>
            <div data-testid="healthy-color">{getStatusColor('healthy')}</div>
            <div data-testid="warning-color">{getStatusColor('warning')}</div>
            <div data-testid="error-color">{getStatusColor('error')}</div>
            <div data-testid="unknown-color">{getStatusColor('unknown')}</div>
          </div>
        );
      };

      renderWithProvider(<TestComponentWithStatusColors />);

      expect(screen.getByTestId('healthy-color')).toHaveTextContent('bg-success text-white');
      expect(screen.getByTestId('warning-color')).toHaveTextContent('bg-warning text-white');
      expect(screen.getByTestId('error-color')).toHaveTextContent('bg-destructive text-white');
      expect(screen.getByTestId('unknown-color')).toHaveTextContent('bg-muted text-muted-foreground');
    });

    it('should get available components', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('available-components')).toHaveTextContent('component-1,component-2');
    });

    it('should handle null values gracefully', () => {
      const TestComponentWithNullValues = () => {
        const { getComponentHealth, getComponentAlerts, getDeployedVersion, getAvailableComponents } = useData();
        return (
          <div>
            <div data-testid="health-null">{getComponentHealth('component-1', null)}</div>
            <div data-testid="alerts-null">{getComponentAlerts('component-1', null) ? 'has-alerts' : 'no-alerts'}</div>
            <div data-testid="version-null">{getDeployedVersion(null, 'dev') || 'no-version'}</div>
            <div data-testid="components-empty">{getAvailableComponents('nonexistent-project', []).join(',') || 'empty'}</div>
          </div>
        );
      };

      renderWithProvider(<TestComponentWithNullValues />);

      expect(screen.getByTestId('health-null')).toHaveTextContent('N/A');
      expect(screen.getByTestId('alerts-null')).toHaveTextContent('no-alerts');
      expect(screen.getByTestId('version-null')).toHaveTextContent('no-version');
      expect(screen.getByTestId('components-empty')).toHaveTextContent('empty');
    });
  });

  describe('useData', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useData must be used within a DataProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide all context values and functions', () => {
      renderWithProvider(<TestComponent />);

      // Check that all state values are available
      expect(screen.getByTestId('feature-toggles-count')).toBeInTheDocument();
      expect(screen.getByTestId('expanded-toggles-count')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-filter')).toBeInTheDocument();
      expect(screen.getByTestId('component-filter')).toBeInTheDocument();
      expect(screen.getByTestId('log-levels-count')).toBeInTheDocument();
      expect(screen.getByTestId('expanded-components-count')).toBeInTheDocument();

      // Check that all helper functions work
      expect(screen.getByTestId('component-health')).toBeInTheDocument();
      expect(screen.getByTestId('component-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('deployed-version')).toBeInTheDocument();
      expect(screen.getByTestId('status-color')).toBeInTheDocument();
      expect(screen.getByTestId('available-components')).toBeInTheDocument();

      // Check that all setter functions are available
      expect(screen.getByTestId('add-toggle-btn')).toBeInTheDocument();
      expect(screen.getByTestId('expand-toggle-btn')).toBeInTheDocument();
      expect(screen.getByTestId('set-filter-btn')).toBeInTheDocument();
      expect(screen.getByTestId('set-log-level-btn')).toBeInTheDocument();
      expect(screen.getByTestId('set-component-filter-btn')).toBeInTheDocument();
      expect(screen.getByTestId('expand-component-btn')).toBeInTheDocument();
    });
  });
});
