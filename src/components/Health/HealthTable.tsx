import { useState, useMemo } from 'react';
import type { ComponentHealthCheck } from '@/types/health';
import { HealthRow } from './HealthRow';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useComponentDisplay } from '@/contexts/ComponentDisplayContext';

interface HealthTableProps {
  healthChecks: ComponentHealthCheck[];
  isLoading: boolean;
  landscape: string;
  onComponentClick?: (componentName: string) => void;
  components?: Array<{
    id: string;
    name: string;
    owner_id?: string | null;
    github?: string;
    sonar?: string;
    'is-library'?: boolean;
    'central-service'?: boolean;
  }>;
  hideDownComponents?: boolean;
  isCentralLandscape?: boolean;
}

export function HealthTable({
  healthChecks,
  isLoading,
  landscape,
  onComponentClick,
  components = [],
  hideDownComponents = false,
  isCentralLandscape = false,
}: HealthTableProps) {
  // Get team data from context for sorting
  const { teamNamesMap } = useComponentDisplay();
  const componentOwnerMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    components.forEach(comp => {
      map[comp.id] = comp.owner_id || null;
    });
    return map;
  }, [components]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'alphabetic' | 'team'>('alphabetic');

  const { libraryComponents, nonLibraryComponents } = useMemo(() => {
    // Apply the same filtering logic as ProjectLayout: 
    // If hideDownComponents is false OR landscape is central, show all components
    // If hideDownComponents is true AND landscape is not central, hide central components
    let filteredComponents = components;
    if (hideDownComponents && !isCentralLandscape) {
      filteredComponents = components.filter(component => {
        return component['central-service'] !== true;
      });
    }

    // Create a map of health checks by component ID for quick lookup
    const healthCheckMap = new Map(healthChecks.map(check => [check.componentId, check]));

    // Start with filtered components and create display objects
    let allComponentsWithHealth = filteredComponents.map(component => {
      const healthCheck = healthCheckMap.get(component.id);
      
      // If no health check exists, create a placeholder with "Not Available" status (unkwnown)
      if (!healthCheck) {
        return {
          componentId: component.id,
          componentName: component.name,
          landscape: landscape,
          healthUrl: '',
          status: 'UNKNOWN' as const,
          responseTime: undefined,
          lastChecked: undefined,
          error: 'Not supported in this landscape',
          response: undefined,
          isUnsupported: true
        };
      }
      
      return {
        ...healthCheck,
        isUnsupported: false
      };
    });

    // Apply search filter
    if (searchQuery) {
      allComponentsWithHealth = allComponentsWithHealth.filter((item) =>
        item.componentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Separate library and non-library components
    const libraries: typeof allComponentsWithHealth = [];
    const nonLibraries: typeof allComponentsWithHealth = [];

    allComponentsWithHealth.forEach((item) => {
      const component = filteredComponents.find(comp => comp.id === item.componentId);
      if (component?.['is-library']) {
        libraries.push(item);
      } else {
        nonLibraries.push(item);
      }
    });

    // Sort both arrays
    const sortComponents = (componentsArray: typeof allComponentsWithHealth) => {
      return [...componentsArray].sort((a, b) => {
        if (sortOrder === 'team') {
          const ownerIdA = componentOwnerMap[a.componentId];
          const ownerIdB = componentOwnerMap[b.componentId];
          const teamA = ownerIdA ? teamNamesMap[ownerIdA] || '' : '';
          const teamB = ownerIdB ? teamNamesMap[ownerIdB] || '' : '';
          const teamCompare = teamA.localeCompare(teamB);
          if (teamCompare !== 0) return teamCompare;
        }
        return a.componentName.localeCompare(b.componentName);
      });
    };

    return {
      libraryComponents: sortComponents(libraries),
      nonLibraryComponents: sortComponents(nonLibraries),
    };
  }, [components, healthChecks, searchQuery, sortOrder, componentOwnerMap, teamNamesMap, hideDownComponents, isCentralLandscape, landscape]);

  const toggleRow = (componentId: string) => {
    // No longer toggle expansion in table view
    return;
  };

  if (isLoading && healthChecks.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center bg-white dark:bg-[#0D0D0D]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading components...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort (no HealthStatusFilter - managed in parent) */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <Select value={sortOrder} onValueChange={(value: 'alphabetic' | 'team') => setSortOrder(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alphabetic">Alphabetic</SelectItem>
            <SelectItem value="team">By Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Components Content */}
      {libraryComponents.length === 0 && nonLibraryComponents.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center bg-white dark:bg-[#0D0D0D]">
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? (
              <>No components found matching &quot;{searchQuery}&quot;</>
            ) : hideDownComponents ? (
              <>No healthy components available in {landscape}</>
            ) : (
              <>No components available in {landscape}</>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Non-Library Components Section */}
          {nonLibraryComponents.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-[#0D0D0D]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Component
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Response Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Checked
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        GitHub
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sonar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {nonLibraryComponents.map((item) => {
                      const component = components.find(comp => comp.id === item.componentId);
                      
                      return (
                        <HealthRow
                          key={item.componentId}
                          healthCheck={item}
                          isExpanded={false}
                          onToggle={() => toggleRow(item.componentId)}
                          onComponentClick={onComponentClick}
                          isUnsupported={item.isUnsupported}
                          component={{
                            ...component,
                            title: component?.name || '',
                            description: '',
                            owner_id: component?.owner_id || ''
                          }}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Library Components Section */}
          {libraryComponents.length > 0 && (
            <div className='space-y-4'>
              <h2 className="text-2xl font-bold">
                Library Components
              </h2>
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-[#0D0D0D]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Component
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Response Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Checked
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Team
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          GitHub
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Sonar
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {libraryComponents.map((item) => {
                        const component = components.find(comp => comp.id === item.componentId);
                        
                        return (
                        <HealthRow
                          key={item.componentId}
                          healthCheck={item}
                          isExpanded={false}
                          onToggle={() => toggleRow(item.componentId)}
                          onComponentClick={onComponentClick}
                          isUnsupported={item.isUnsupported}
                          component={{
                            ...component,
                            title: component?.name || '',
                            description: '',
                            owner_id: component?.owner_id || ''
                          }}
                        />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
