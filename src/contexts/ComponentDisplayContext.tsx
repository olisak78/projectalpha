import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import type { ComponentHealthCheck } from '@/types/health';
import { fetchSystemInformation, type SystemInformation } from '@/services/healthApi';

interface ComponentDisplayContextType {
  // Landscape data
  selectedLandscape: string | null;
  selectedLandscapeData: any;
  isCentralLandscape: boolean;
  
  // Team mappings
  teamNamesMap: Record<string, string>;
  teamColorsMap: Record<string, string>;
  
  // Health data
  componentHealthMap: Record<string, ComponentHealthCheck>;
  isLoadingHealth: boolean;
  
  // System information
  componentSystemInfoMap: Record<string, SystemInformation>;
  isLoadingSystemInfo: boolean;
  
  // Display state
  expandedComponents: Record<string, boolean>;
  onToggleExpanded: (componentId: string) => void;
  
  // System context
  system: string;
}

const ComponentDisplayContext = createContext<ComponentDisplayContextType | undefined>(undefined);

interface ComponentDisplayProviderProps {
  children: ReactNode;
  selectedLandscape: string | null;
  selectedLandscapeData: any;
  isCentralLandscape: boolean;
  teamNamesMap: Record<string, string>;
  teamColorsMap: Record<string, string>;
  componentHealthMap: Record<string, ComponentHealthCheck>;
  isLoadingHealth: boolean;
  expandedComponents: Record<string, boolean>;
  onToggleExpanded: (componentId: string) => void;
  system: string;
  components?: Array<{
    id: string;
    name: string;
    title?: string;
    description?: string;
    project_id?: string;
    owner_id?: string | null;
    'central-service'?: boolean;
    [key: string]: any;
  }>;
}

export function ComponentDisplayProvider({
  children,
  selectedLandscape,
  selectedLandscapeData,
  isCentralLandscape,
  teamNamesMap,
  teamColorsMap,
  componentHealthMap,
  isLoadingHealth,
  expandedComponents,
  onToggleExpanded,
  system,
  components = [],
}: ComponentDisplayProviderProps) {
  const [componentSystemInfoMap, setComponentSystemInfoMap] = useState<Record<string, SystemInformation>>({});
  const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(false);

  // Memoize component IDs to prevent unnecessary re-renders
  const componentIds = useMemo(() => {
    return components.map(c => c.id).sort().join(',');
  }, [components]);

  // Memoize landscape config to prevent unnecessary re-renders
  const landscapeConfig = useMemo(() => {
    if (!selectedLandscapeData) return null;
    return {
      name: selectedLandscapeData.name || 'default',
      route: selectedLandscapeData.metadata?.route ||
        selectedLandscapeData.landscape_url ||
        'cfapps.sap.hana.ondemand.com',
    };
  }, [selectedLandscapeData]);

  // Fetch system information for all components
  useEffect(() => {
    let isCancelled = false;

    const fetchSystemInfoForComponents = async () => {
      if (!landscapeConfig || !components.length) {
        if (!isCancelled) {
          setComponentSystemInfoMap({});
        }
        return;
      }

      if (!isCancelled) {
        setIsLoadingSystemInfo(true);
      }

      const systemInfoMap: Record<string, SystemInformation> = {};

      // Fetch system info for each component
      await Promise.allSettled(
        components.map(async (component) => {
          try {
            const result = await fetchSystemInformation(component as any, landscapeConfig);
            if (result.status === 'success' && result.data && !isCancelled) {
              systemInfoMap[component.id] = result.data;
            }
          } catch (error) {
            if (!isCancelled) {
              console.error(`Failed to fetch system info for ${component.name}:`, error);
            }
          }
        })
      );

      // Only update state if this effect hasn't been cancelled
      if (!isCancelled) {
        setComponentSystemInfoMap(systemInfoMap);
        setIsLoadingSystemInfo(false);
      }
    };

    fetchSystemInfoForComponents();

    // Cleanup function to cancel the effect when dependencies change
    return () => {
      isCancelled = true;
    };
  }, [landscapeConfig, componentIds]);

  const value: ComponentDisplayContextType = {
    selectedLandscape,
    selectedLandscapeData,
    isCentralLandscape,
    teamNamesMap,
    teamColorsMap,
    componentHealthMap,
    isLoadingHealth,
    componentSystemInfoMap,
    isLoadingSystemInfo,
    expandedComponents,
    onToggleExpanded,
    system,
  };

  return (
    <ComponentDisplayContext.Provider value={value}>
      {children}
    </ComponentDisplayContext.Provider>
  );
}

export function useComponentDisplay() {
  const context = useContext(ComponentDisplayContext);
  if (context === undefined) {
    throw new Error('useComponentDisplay must be used within a ComponentDisplayProvider');
  }
  return context;
}
