import { RefreshCw, AlertCircle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TeamComponents } from "@/components/Team/TeamComponents";
import { ComponentsSearchFilter } from "@/components/ComponentsSearchFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComponentListResponse } from "@/types/api";
import { useMemo } from "react";

type SortOrder = 'alphabetic' | 'team';

interface ComponentsTabContentProps {
  title: string;
  components: ComponentListResponse;
  teamName: string;
  isLoading: boolean;
  error: Error | null;
  teamComponentsExpanded: Record<string, boolean>;
  onToggleExpanded: (componentId: string) => void;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  emptyStateMessage?: string;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  system: string;
  additionalControls?: React.ReactNode;
  showLandscapeFilter?: boolean;
  selectedLandscape?: string | null;
  selectedLandscapeData?: any;
  teamNamesMap?: Record<string, string>;
  teamColorsMap?: Record<string, string>;
  sortOrder?: SortOrder;
  onSortOrderChange?: (order: SortOrder) => void;
}

/**
 * Reusable Components Tab Content
 * 
 * This component displays a list of components with loading, error, and empty states.
 * Used across CisPage, CloudAutomationPage, and UnifiedServicesPage.
 */
export function ComponentsTabContent({
  title,
  components,
  teamName,
  isLoading,
  error,
  teamComponentsExpanded,
  onToggleExpanded,
  onRefresh,
  showRefreshButton = false,
  emptyStateMessage,
  searchTerm = "",
  onSearchTermChange,
  system,
  additionalControls,
  showLandscapeFilter = false,
  selectedLandscape,
  selectedLandscapeData,
  teamNamesMap = {},
  teamColorsMap = {},
  sortOrder = 'alphabetic',
  onSortOrderChange
}: ComponentsTabContentProps) {
  // Filter and sort components based on search term and sort order
  const filteredAndSortedComponents = useMemo(() => {
    // First, filter based on search term
    let result = components;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = components.filter(component => {
        const displayName = 'display_name' in component ? component.display_name : ('title' in component ? component.title : '');
        return (
          component.name.toLowerCase().includes(searchLower) ||
          displayName?.toString().toLowerCase().includes(searchLower) ||
          component.description?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Then, sort based on sort order
    const sorted = [...result];

    if (sortOrder === 'alphabetic') {
      // Sort alphabetically by component name
      sorted.sort((a, b) => {
        const nameA = (a.title || a.name).toLowerCase();
        const nameB = (b.title || b.name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (sortOrder === 'team') {
      // Sort by team name, then alphabetically within each team
      sorted.sort((a, b) => {
        const teamA = a.owner_id ? (teamNamesMap[a.owner_id] || '') : '';
        const teamB = b.owner_id ? (teamNamesMap[b.owner_id] || '') : '';

        // First compare by team name
        const teamComparison = teamA.localeCompare(teamB);
        if (teamComparison !== 0) {
          return teamComparison;
        }

        // If same team (or both have no team), sort alphabetically by component name
        const nameA = (a.title || a.name).toLowerCase();
        const nameB = (b.title || b.name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    return sorted;
  }, [components, searchTerm, sortOrder, teamNamesMap]);

  return (
    <div>
      <div className="space-y-4">
        {/* Header Section */}
        <div className="border-b border-border pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left side - Title and count */}
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <Badge variant="secondary" className="text-sm px-2.5 py-0.5">
                {filteredAndSortedComponents.length}
              </Badge>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              {!isLoading && !error && onSortOrderChange && (
                <Select value={sortOrder} onValueChange={onSortOrderChange}>
                  <SelectTrigger className="w-[160px] h-9">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabetic">Alphabetic</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {/* Search Filter */}
              {!isLoading && !error && onSearchTermChange && (
                <ComponentsSearchFilter
                  searchTerm={searchTerm}
                  setSearchTerm={onSearchTermChange}
                />
              )}
              {/* Additional controls */}
              {additionalControls && (
                <div className="flex-shrink-0">
                  {additionalControls}
                </div>
              )}
              {showRefreshButton && onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading {teamName} components...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load {teamName} components: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Components Display using TeamComponents */}
        {!isLoading && !error && (
          <TeamComponents
            components={filteredAndSortedComponents}
            teamName={teamName}
            teamComponentsExpanded={teamComponentsExpanded}
            onToggleExpanded={onToggleExpanded}
            system={system}
            showProjectGrouping={false} // Project-specific pages don't show grouping
            selectedLandscape={selectedLandscape}
            selectedLandscapeData={selectedLandscapeData}
            teamNamesMap={teamNamesMap}
            teamColorsMap={teamColorsMap}
          />
        )}
      </div>
    </div>
  );
}
