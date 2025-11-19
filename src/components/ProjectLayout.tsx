import { useState, useMemo, useEffect, ReactNode } from "react";
import { BreadcrumbPage } from "@/components/BreadcrumbPage";
import { LandscapeLinksSection } from "@/components/LandscapeLinksSection";
import { ComponentsTabContent } from "@/components/ComponentsTabContent";
import { HealthDashboard } from "@/components/Health/HealthDashboard";
import AlertsPage from "@/pages/AlertsPage";
import { useHeaderNavigation } from "@/contexts/HeaderNavigationContext";
import {
  usePortalState,
  useLandscapeManagement,
  useComponentManagement,
  useFeatureToggles
} from "@/contexts/hooks";
import { useTabRouting } from "@/hooks/useTabRouting";
import { useComponentsByProject } from "@/hooks/api/useComponents";
import { useLandscapesByProject } from "@/hooks/api/useLandscapes";
import { useTeams } from "@/hooks/api/useTeams";

export interface ProjectLayoutProps {
  projectName: string;
  projectId: string;
  defaultTab?: string;
  tabs: string[]; // Array of tab IDs from database
  componentsTitle?: string;
  emptyStateMessage?: string;
  system?: string;
  showLandscapeFilter?: boolean;
  children?: ReactNode;
}

export function ProjectLayout({
  projectName,
  projectId,
  defaultTab = "components",
  tabs,
  componentsTitle,
  emptyStateMessage,
  system = "services",
  showLandscapeFilter = false,
  children
}: ProjectLayoutProps) {
  // Common state management
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [teamComponentsExpanded, setTeamComponentsExpanded] = useState<Record<string, boolean>>({});
  const [componentSearchTerm, setComponentSearchTerm] = useState("");
  const [componentSortOrder, setComponentSortOrder] = useState<'alphabetic' | 'team'>('alphabetic');

  // Navigation and routing hooks
  const { setTabs, activeTab: headerActiveTab } = useHeaderNavigation();
  const { currentTabFromUrl, syncTabWithUrl } = useTabRouting();

  // Context hooks
  const { selectedLandscape, setSelectedLandscape, setShowLandscapeDetails } = usePortalState();
  const {
    getFilteredLandscapeIds, 
    getProductionLandscapeIds,
  } = useLandscapeManagement();
  const { componentFilter, setComponentFilter, getAvailableComponents } = useComponentManagement();
  const { 
    featureToggles, 
    expandedToggles, 
    toggleFilter, 
    setToggleFilter, 
    toggleFeature, 
    toggleExpanded, 
    bulkToggle, 
    getGroupStatus, 
    getFilteredToggles 
  } = useFeatureToggles();

  // API hooks
  const {
    data: componentsData,
    isLoading: componentsLoading,
    error: componentsError,
    refetch: refetchComponents
  } = useComponentsByProject(projectId);

  const {
    data: apiLandscapes,
    isLoading: landscapesLoading,
    error: landscapesError,
  } = useLandscapesByProject(projectId);

  const { data: teamsData } = useTeams();

  // Data processing
  const apiComponents = useMemo(() => {
    if (!componentsData) return [];
    return componentsData;
  }, [componentsData]);

  // Create team mappings
  const teamNamesMap = useMemo(() => {
    if (!teamsData?.teams) return {};
    return teamsData.teams.reduce((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {} as Record<string, string>);
  }, [teamsData]);

  const teamColorsMap = useMemo(() => {
    if (!teamsData?.teams) return {};
    return teamsData.teams.reduce((acc, team) => {
      let metadata = team.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('Failed to parse team metadata:', e);
        }
      }
      if (metadata?.color) {
        acc[team.id] = metadata.color;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [teamsData]);

  // Find selected landscape from API data - memoize to prevent infinite re-renders
  const selectedApiLandscape = useMemo(() => {
    if (!selectedLandscape || !apiLandscapes) return undefined;
    return apiLandscapes.find((l: any) => l.id === selectedLandscape);
  }, [apiLandscapes, selectedLandscape]);

  // Use apiLandscapes directly instead of context functions
  const currentProjectLandscapes = apiLandscapes || [];
  
  // Group landscapes by environment for display
  const landscapeGroupsRecord = useMemo(() => {
    if (!apiLandscapes) return {};
    
    const groupedByEnvironment: Record<string, any[]> = {};
    
    apiLandscapes.forEach(landscape => {
      const environment = (landscape as any).environment || 'Unknown';
      
      // Capitalize first letter for display
      const groupName = environment.charAt(0).toUpperCase() + environment.slice(1);
      
      if (!groupedByEnvironment[groupName]) {
        groupedByEnvironment[groupName] = [];
      }
      groupedByEnvironment[groupName].push(landscape);
    });
    
    return groupedByEnvironment;
  }, [apiLandscapes]);
  
  // Transform landscape groups for LandscapeLinksSection (expects LandscapeGroup[])
  const landscapeGroupsArray = useMemo(() => {
    return Object.entries(landscapeGroupsRecord).map(([groupName, landscapes]) => ({
      id: groupName.toLowerCase().replace(/\s+/g, '-'),
      name: groupName,
      landscapes: landscapes.map(landscape => ({
        id: landscape.id,
        name: landscape.name,
        isCentral: landscape.isCentral || false
      }))
    }));
  }, [landscapeGroupsRecord]);
  
  const filteredToggles = getFilteredToggles(projectName, selectedLandscape, componentFilter, toggleFilter);
  const availableComponents = getAvailableComponents(projectName, featureToggles);

  // Tab ID to label mapping
  const getTabLabel = (tabId: string): string => {
    const tabLabels: Record<string, string> = {
      'components': 'Components',
      'health': 'Health',
      'alerts': 'Alerts',
    };
    return tabLabels[tabId] || tabId.charAt(0).toUpperCase() + tabId.slice(1);
  };

  // Build header tabs from database array
  const headerTabs = useMemo(() => {
    return tabs.map(tabId => ({
      id: tabId,
      label: getTabLabel(tabId)
    }));
  }, [tabs]);

  // Set up header tabs and sync with URL
  useEffect(() => {
    syncTabWithUrl(headerTabs, defaultTab);
  }, [headerTabs, defaultTab, syncTabWithUrl]); // Include syncTabWithUrl but it should be stable

  // Update local activeTab when URL tab changes
  useEffect(() => {
    if (currentTabFromUrl && currentTabFromUrl !== activeTab) {
      setActiveTab(currentTabFromUrl);
    }
  }, [currentTabFromUrl, activeTab]);

  // Sync local activeTab with header activeTab when header tab is clicked
  useEffect(() => {
    if (headerActiveTab && headerActiveTab !== activeTab) {
      setActiveTab(headerActiveTab);
    }
  }, [headerActiveTab, activeTab]);

  // Set default landscape - use apiLandscapes directly
  useEffect(() => {
    if (apiLandscapes && apiLandscapes.length > 0 && !selectedLandscape) {
      // Look for DEFAULT landscape first
      const defaultLandscape = apiLandscapes.find((l: any) => l.name === 'DEFAULT');
      if (defaultLandscape) {
        setSelectedLandscape(defaultLandscape.id);
      } else {
        // If DEFAULT not found, use first landscape
        setSelectedLandscape(apiLandscapes[0].id);
      }
    }
  }, [apiLandscapes, selectedLandscape]);

  // Handlers
  const handleToggleComponentExpansion = (componentId: string) => {
    setTeamComponentsExpanded(prev => ({
      ...prev,
      [componentId]: !(prev[componentId] ?? false)
    }));
  };

  // Prepare common props for custom tab content
  const commonTabProps = {
    // Data
    components: apiComponents,
    selectedLandscape,
    selectedApiLandscape,
    landscapeGroups: landscapeGroupsArray,
    currentProjectLandscapes,
    filteredToggles,
    availableComponents,
    teamNamesMap,
    teamColorsMap,
    
    // State
    componentsLoading,
    componentsError,
    teamComponentsExpanded,
    componentSearchTerm,
    componentSortOrder,
    expandedToggles,
    toggleFilter,
    componentFilter,
    
    // Handlers
    onLandscapeChange: setSelectedLandscape,
    onShowLandscapeDetails: () => setShowLandscapeDetails(true),
    onToggleComponentExpansion: handleToggleComponentExpansion,
    onRefresh: refetchComponents,
    onSearchTermChange: setComponentSearchTerm,
    onSortOrderChange: setComponentSortOrder,
    onToggleFeature: toggleFeature,
    onToggleExpanded: toggleExpanded,
    onBulkToggle: bulkToggle,
    onToggleFilterChange: setToggleFilter,
    onComponentFilterChange: setComponentFilter,
    
    // Project info
    projectName,
    activeProject: projectName,
    
    // Utility functions
    getFilteredLandscapeIds,
    getProductionLandscapeIds,
    getGroupStatus
  };

  const renderGenericTabContent = () => {
    switch (activeTab) {
      case "components":
        return (
          <>
            {/* Landscape Links Section */}
            <LandscapeLinksSection
              selectedLandscape={selectedLandscape}
              selectedLandscapeData={selectedApiLandscape}
              landscapeGroups={landscapeGroupsArray}
              onLandscapeChange={setSelectedLandscape}
              onShowLandscapeDetails={() => setShowLandscapeDetails(true)}
            />

            {/* Components Section */}
            <ComponentsTabContent
              title={componentsTitle || `${projectName} Components`}
              components={apiComponents}
              teamName={projectName}
              isLoading={componentsLoading}
              error={componentsError}
              teamComponentsExpanded={teamComponentsExpanded}
              onToggleExpanded={handleToggleComponentExpansion}
              onRefresh={refetchComponents}
              showRefreshButton={false}
              emptyStateMessage={emptyStateMessage || `No ${projectName} components found for this organization.`}
              searchTerm={componentSearchTerm}
              onSearchTermChange={setComponentSearchTerm}
              system={system}
              showLandscapeFilter={showLandscapeFilter}
              selectedLandscape={selectedLandscape}
              selectedLandscapeData={selectedApiLandscape}
              teamNamesMap={teamNamesMap}
              teamColorsMap={teamColorsMap}
              sortOrder={componentSortOrder}
              onSortOrderChange={setComponentSortOrder}
            />
          </>
        );
      case "health":
        return (
          <HealthDashboard
            projectId={projectId}
            components={apiComponents}
            landscapeGroups={landscapeGroupsRecord}
            selectedLandscape={selectedLandscape}
            onLandscapeChange={setSelectedLandscape}
            onShowLandscapeDetails={() => setShowLandscapeDetails(true)}
            isLoadingComponents={componentsLoading}
          />
        );
      case "alerts":
        return (
          <AlertsPage
            projectId={projectId}
            projectName={projectName}
          />
        );
      default:
        return null;
    }
  };

  const renderTabContent = () => {    
    // Use generic tab content based on tabs from database
    return renderGenericTabContent();
  };

  return (
    <BreadcrumbPage>
      {children}
      {renderTabContent()}
    </BreadcrumbPage>
  );
}
