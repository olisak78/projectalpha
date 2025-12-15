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
  // Get team data from context
  const { teamNamesMap, teamColorsMap } = useComponentDisplay();
  const componentOwnerMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    components.forEach(comp => {
      map[comp.id] = comp.owner_id || null;
    });
    return map;
  }, [components]);

  const componentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    components.forEach(comp => {
      map[comp.id] = comp.name;
    });
    return map;
  }, [components]);

  // Create maps for GitHub and Sonar URLs
  const componentGithubMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    components.forEach(comp => {
      map[comp.id] = comp.github;
    });
    return map;
  }, [components]);

  const componentSonarMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    components.forEach(comp => {
      map[comp.id] = comp.sonar;
    });
    return map;
  }, [components]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'alphabetic' | 'team'>('alphabetic');

  const { libraryComponents, nonLibraryComponents } = useMemo(() => {
    // Create a map of health checks by component ID for quick lookup
    const healthCheckMap = new Map(healthChecks.map(check => [check.componentId, check]));

    // Start with all components and create display objects
    let allComponentsWithHealth = components.map(component => {
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

    // Apply hideDownComponents filter
    if (hideDownComponents) {
      allComponentsWithHealth = allComponentsWithHealth.filter(item => 
        item.status === 'UP' || item.isUnsupported
      );
    }

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
      const component = components.find(comp => comp.id === item.componentId);
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
  }, [components, healthChecks, searchQuery, sortOrder, componentOwnerMap, teamNamesMap, hideDownComponents, landscape]);

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
                      const ownerId = componentOwnerMap[item.componentId];
                      const teamName = ownerId ? teamNamesMap[ownerId] : undefined;
                      const teamColor = ownerId ? teamColorsMap[ownerId] : undefined;
                      const componentName = componentNameMap[item.componentId];
                      const githubUrl = componentGithubMap[item.componentId];
                      const sonarUrl = componentSonarMap[item.componentId];

                      const component = components.find(comp => comp.id === item.componentId);
                      
                      // Use same disabled logic as grid view: only disable central services in non-central landscapes
                      const isDisabled = component?.['central-service'] === true && !isCentralLandscape;
                      
                      return (
                        <HealthRow
                          key={item.componentId}
                          healthCheck={item}
                          isExpanded={false}
                          onToggle={() => toggleRow(item.componentId)}
                          teamName={teamName}
                          teamColor={teamColor}
                          componentName={componentName}
                          onComponentClick={onComponentClick}
                          githubUrl={githubUrl}
                          sonarUrl={sonarUrl}
                          isUnsupported={item.isUnsupported}
                          isDisabled={isDisabled}
                          component={component}
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
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Library Components
              </h3>
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
                        const ownerId = componentOwnerMap[item.componentId];
                        const teamName = ownerId ? teamNamesMap[ownerId] : undefined;
                        const teamColor = ownerId ? teamColorsMap[ownerId] : undefined;
                        const componentName = componentNameMap[item.componentId];
                        const githubUrl = componentGithubMap[item.componentId];
                        const sonarUrl = componentSonarMap[item.componentId];

                        const component = components.find(comp => comp.id === item.componentId);
                        
                        // Use same disabled logic as grid view: only disable central services in non-central landscapes
                        const isDisabled = component?.['central-service'] === true && !isCentralLandscape;
                        
                        return (
                          <HealthRow
                            key={item.componentId}
                            healthCheck={item}
                            isExpanded={false}
                            onToggle={() => toggleRow(item.componentId)}
                            teamName={teamName}
                            teamColor={teamColor}
                            componentName={componentName}
                            onComponentClick={onComponentClick}
                            githubUrl={githubUrl}
                            sonarUrl={sonarUrl}
                            isUnsupported={item.isUnsupported}
                            isDisabled={isDisabled}
                            component={component}
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
