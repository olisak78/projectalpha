import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentDisplayProvider, useComponentDisplay } from '../../src/contexts/ComponentDisplayContext';
import type { ComponentHealthCheck } from '../../src/types/health';
import '@testing-library/jest-dom/vitest';

// Test component that uses the context
function TestComponent() {
  const context = useComponentDisplay();
  
  return (
    <div>
      <div data-testid="selected-landscape">{context.selectedLandscape || 'null'}</div>
      <div data-testid="is-central-landscape">{context.isCentralLandscape.toString()}</div>
      <div data-testid="system">{context.system}</div>
      <div data-testid="loading-health">{context.isLoadingHealth.toString()}</div>
      <div data-testid="team-names-count">{Object.keys(context.teamNamesMap).length}</div>
      <div data-testid="team-colors-count">{Object.keys(context.teamColorsMap).length}</div>
      <div data-testid="health-map-count">{Object.keys(context.componentHealthMap).length}</div>
      <div data-testid="expanded-count">{Object.keys(context.expandedComponents).length}</div>
    </div>
  );
}

describe('ComponentDisplayContext', () => {
  const mockOnToggleExpanded = vi.fn();
  
  const defaultProps = {
    selectedLandscape: 'prod',
    selectedLandscapeData: { name: 'Production', route: 'prod.example.com' },
    isCentralLandscape: false,
    teamNamesMap: { 'team-1': 'Team Alpha', 'team-2': 'Team Beta' },
    teamColorsMap: { 'team-1': '#ff0000', 'team-2': '#00ff00' },
    componentHealthMap: {
      'comp-1': { componentId: 'comp-1', componentName: 'Service A', landscape: 'prod', healthUrl: 'http://example.com', status: 'UP' } as ComponentHealthCheck,
      'comp-2': { componentId: 'comp-2', componentName: 'Service B', landscape: 'prod', healthUrl: 'http://example.com', status: 'DOWN' } as ComponentHealthCheck,
    },
    isLoadingHealth: false,
    expandedComponents: { 'comp-1': true, 'comp-2': false },
    onToggleExpanded: mockOnToggleExpanded,
    system: 'test-system',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider', () => {
    it('should provide context values to children', () => {
      render(
        <ComponentDisplayProvider {...defaultProps}>
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('selected-landscape')).toHaveTextContent('prod');
      expect(screen.getByTestId('is-central-landscape')).toHaveTextContent('false');
      expect(screen.getByTestId('system')).toHaveTextContent('test-system');
      expect(screen.getByTestId('loading-health')).toHaveTextContent('false');
      expect(screen.getByTestId('team-names-count')).toHaveTextContent('2');
      expect(screen.getByTestId('team-colors-count')).toHaveTextContent('2');
      expect(screen.getByTestId('health-map-count')).toHaveTextContent('2');
      expect(screen.getByTestId('expanded-count')).toHaveTextContent('2');
    });

    it('should handle null selectedLandscape', () => {
      render(
        <ComponentDisplayProvider {...defaultProps} selectedLandscape={null}>
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('selected-landscape')).toHaveTextContent('null');
    });

    it('should handle central landscape', () => {
      render(
        <ComponentDisplayProvider {...defaultProps} isCentralLandscape={true}>
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('is-central-landscape')).toHaveTextContent('true');
    });

    it('should handle loading state', () => {
      render(
        <ComponentDisplayProvider {...defaultProps} isLoadingHealth={true}>
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('loading-health')).toHaveTextContent('true');
    });

    it('should handle empty maps', () => {
      render(
        <ComponentDisplayProvider 
          {...defaultProps} 
          teamNamesMap={{}}
          teamColorsMap={{}}
          componentHealthMap={{}}
          expandedComponents={{}}
        >
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('team-names-count')).toHaveTextContent('0');
      expect(screen.getByTestId('team-colors-count')).toHaveTextContent('0');
      expect(screen.getByTestId('health-map-count')).toHaveTextContent('0');
      expect(screen.getByTestId('expanded-count')).toHaveTextContent('0');
    });
  });

  describe('useComponentDisplay hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useComponentDisplay must be used within a ComponentDisplayProvider');
      
      consoleSpy.mockRestore();
    });

    it('should return context when used within provider', () => {
      let contextValue: any;
      
      function ContextConsumer() {
        contextValue = useComponentDisplay();
        return null;
      }

      render(
        <ComponentDisplayProvider {...defaultProps}>
          <ContextConsumer />
        </ComponentDisplayProvider>
      );

      expect(contextValue).toBeDefined();
      expect(contextValue.selectedLandscape).toBe('prod');
      expect(contextValue.isCentralLandscape).toBe(false);
      expect(contextValue.system).toBe('test-system');
      expect(contextValue.isLoadingHealth).toBe(false);
      expect(contextValue.onToggleExpanded).toBe(mockOnToggleExpanded);
      expect(contextValue.teamNamesMap).toEqual(defaultProps.teamNamesMap);
      expect(contextValue.teamColorsMap).toEqual(defaultProps.teamColorsMap);
      expect(contextValue.componentHealthMap).toEqual(defaultProps.componentHealthMap);
      expect(contextValue.expandedComponents).toEqual(defaultProps.expandedComponents);
    });
  });

  describe('Context updates', () => {
    it('should update context when props change', () => {
      const { rerender } = render(
        <ComponentDisplayProvider {...defaultProps}>
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('selected-landscape')).toHaveTextContent('prod');

      rerender(
        <ComponentDisplayProvider {...defaultProps} selectedLandscape="dev">
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('selected-landscape')).toHaveTextContent('dev');
    });

    it('should update loading state', () => {
      const { rerender } = render(
        <ComponentDisplayProvider {...defaultProps}>
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('loading-health')).toHaveTextContent('false');

      rerender(
        <ComponentDisplayProvider {...defaultProps} isLoadingHealth={true}>
          <TestComponent />
        </ComponentDisplayProvider>
      );

      expect(screen.getByTestId('loading-health')).toHaveTextContent('true');
    });
  });

  describe('Callback functions', () => {
    it('should call onToggleExpanded when accessed from context', () => {
      let contextValue: any;
      
      function ContextConsumer() {
        contextValue = useComponentDisplay();
        return null;
      }

      render(
        <ComponentDisplayProvider {...defaultProps}>
          <ContextConsumer />
        </ComponentDisplayProvider>
      );

      contextValue.onToggleExpanded('comp-1');
      expect(mockOnToggleExpanded).toHaveBeenCalledWith('comp-1');
    });
  });

  describe('Data structure validation', () => {
    it('should handle complex landscape data', () => {
      const complexLandscapeData = {
        name: 'Production',
        route: 'prod.example.com',
        metadata: {
          region: 'us-east-1',
          environment: 'production'
        }
      };

      let contextValue: any;
      
      function ContextConsumer() {
        contextValue = useComponentDisplay();
        return null;
      }

      render(
        <ComponentDisplayProvider {...defaultProps} selectedLandscapeData={complexLandscapeData}>
          <ContextConsumer />
        </ComponentDisplayProvider>
      );

      expect(contextValue.selectedLandscapeData).toEqual(complexLandscapeData);
    });

    it('should handle complex health check data', () => {
      const complexHealthMap = {
        'comp-1': {
          componentId: 'comp-1',
          componentName: 'Service A',
          landscape: 'prod',
          healthUrl: 'http://example.com/health',
          status: 'UP' as const,
          lastChecked: new Date(),
          responseTime: 150
        } as ComponentHealthCheck
      };

      let contextValue: any;
      
      function ContextConsumer() {
        contextValue = useComponentDisplay();
        return null;
      }

      render(
        <ComponentDisplayProvider {...defaultProps} componentHealthMap={complexHealthMap}>
          <ContextConsumer />
        </ComponentDisplayProvider>
      );

      expect(contextValue.componentHealthMap).toEqual(complexHealthMap);
    });
  });

  // New tests for recent code additions
  describe('System Information Management', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should provide system information map and loading state', () => {
      let contextValue: any;
      
      function ContextConsumer() {
        contextValue = useComponentDisplay();
        return null;
      }

      render(
        <ComponentDisplayProvider {...defaultProps}>
          <ContextConsumer />
        </ComponentDisplayProvider>
      );

      expect(contextValue.componentSystemInfoMap).toBeDefined();
      expect(contextValue.isLoadingSystemInfo).toBeDefined();
      expect(typeof contextValue.isLoadingSystemInfo).toBe('boolean');
    });

    it('should handle empty components array', () => {
      let contextValue: any;
      
      function ContextConsumer() {
        contextValue = useComponentDisplay();
        return null;
      }

      render(
        <ComponentDisplayProvider {...defaultProps} components={[]}>
          <ContextConsumer />
        </ComponentDisplayProvider>
      );

      expect(contextValue.componentSystemInfoMap).toEqual({});
      expect(contextValue.isLoadingSystemInfo).toBe(false);
    });
  });

  describe('Context Provider Props', () => {
    it('should handle all required props correctly', () => {
      let contextValue: any;
      
      function ContextConsumer() {
        contextValue = useComponentDisplay();
        return null;
      }

      render(
        <ComponentDisplayProvider {...defaultProps}>
          <ContextConsumer />
        </ComponentDisplayProvider>
      );

      expect(contextValue.selectedLandscape).toBe(defaultProps.selectedLandscape);
      expect(contextValue.selectedLandscapeData).toBe(defaultProps.selectedLandscapeData);
      expect(contextValue.isCentralLandscape).toBe(defaultProps.isCentralLandscape);
      expect(contextValue.teamNamesMap).toBe(defaultProps.teamNamesMap);
      expect(contextValue.teamColorsMap).toBe(defaultProps.teamColorsMap);
      expect(contextValue.componentHealthMap).toBe(defaultProps.componentHealthMap);
      expect(contextValue.isLoadingHealth).toBe(defaultProps.isLoadingHealth);
      expect(contextValue.expandedComponents).toBe(defaultProps.expandedComponents);
      expect(contextValue.onToggleExpanded).toBe(defaultProps.onToggleExpanded);
      expect(contextValue.system).toBe(defaultProps.system);
    });
  });
});
