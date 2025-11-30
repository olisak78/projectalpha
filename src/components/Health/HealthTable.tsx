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

interface HealthTableProps {
  healthChecks: ComponentHealthCheck[];
  isLoading: boolean;
  landscape: string;
  teamNamesMap?: Record<string, string>;
  onComponentClick?: (componentName: string) => void;
  components?: Array<{ 
    id: string; 
    name: string; 
    owner_id?: string | null;
    github?: string;
    sonar?: string;
  }>;
  hideDownComponents?: boolean; // NEW PROP
}

export function HealthTable({ 
  healthChecks, 
  isLoading, 
  landscape, 
  teamNamesMap = {}, 
  onComponentClick, 
  components = [],
  hideDownComponents = false, // NEW PROP with default
}: HealthTableProps) {
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

  const filteredAndSortedHealthChecks = useMemo(() => {
    let filtered = healthChecks;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(check =>
        check.componentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply health status filter (using prop instead of local state)
    if (hideDownComponents) {
      filtered = filtered.filter(check => check.status === 'UP');
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
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

    return sorted;
  }, [healthChecks, searchQuery, sortOrder, componentOwnerMap, teamNamesMap, hideDownComponents]);

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

      {/* Table */}
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
              {filteredAndSortedHealthChecks.map((check) => {
                const ownerId = componentOwnerMap[check.componentId];
                const teamName = ownerId ? teamNamesMap[ownerId] : undefined;
                const componentName = componentNameMap[check.componentId];
                const githubUrl = componentGithubMap[check.componentId];
                const sonarUrl = componentSonarMap[check.componentId];
                
                return (
                  <HealthRow
                    key={check.componentId}
                    healthCheck={check}
                    isExpanded={false}
                    onToggle={() => toggleRow(check.componentId)}
                    teamName={teamName}
                    componentName={componentName}
                    onComponentClick={onComponentClick}
                    githubUrl={githubUrl}
                    sonarUrl={sonarUrl}
                  />
                );
              })}
            </tbody>
          </table>

          {filteredAndSortedHealthChecks.length === 0 && !isLoading && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? (
                <>No components found matching &quot;{searchQuery}&quot;</>
              ) : hideDownComponents ? (
                <>No healthy components available in {landscape}</>
              ) : (
                <>No components available in {landscape}</>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}