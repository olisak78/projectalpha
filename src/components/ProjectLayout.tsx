import { useState, useMemo, useEffect, ReactNode } from "react";
import { BreadcrumbPage } from "@/components/BreadcrumbPage";
import { LandscapeLinksSection } from "@/components/LandscapeLinksSection";
import { ComponentsTabContent } from "@/components/ComponentsTabContent";
import { HealthDashboard } from "@/components/Health/HealthDashboard";
import { HealthOverview } from "@/components/Health/HealthOverview";
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
import { useHealth } from "@/hooks/api/useHealth";
import type { Landscape } from "@/types/developer-portal";


export interface ProjectLayoutProps {
  projectName: string;
  projectId: string;
  defaultTab?: string;
  tabs: string[]; // Array of tab IDs from database
  componentsTitle?: string;
  emptyStateMessage?: string;
  system?: string;
  showLandscapeFilter?: boolean;
  showComponentsMetrics?: boolean; // NEW: Controls whether HealthOverview is shown on Components tab
  alertsUrl?: string; // NEW: URL for alerts configuration
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
  showComponentsMetrics = false, // NEW: Default to false
  alertsUrl,
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
    isLoading: landscapesLoading
  } = useLandscapesByProject(projectId);

  const { data: teamsData } = useTeams();

  // Process components data - ComponentListResponse is directly Component[]
  const apiComponents = useMemo(() => {
    return componentsData || [];
  }, [componentsData]);

  // Process landscapes data
  const landscapeGroupsRecord = useMemo(() => {
    if (!apiLandscapes) return {};
    
    // Group landscapes by environment_group
    const groups: Record<string, Landscape[]> = {};
    apiLandscapes.forEach((landscape) => {
      const group = landscape.environment || 'Other';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(landscape);
    });
    return groups;
  }, [apiLandscapes]);

  const landscapeGroupsArray = useMemo(() => {
    return Object.entries(landscapeGroupsRecord).map(([name, landscapes]) => ({
      id: name,
      name,
      landscapes: landscapes.map(l => ({
        id: l.id,
        name: l.name,
        isCentral: false // Adjust as needed
      }))
    }));
  }, [landscapeGroupsRecord]);

  const currentProjectLandscapes = apiLandscapes || [];

  // Find selected landscape object
  const selectedApiLandscape = useMemo(() => {
    if (!selectedLandscape || !apiLandscapes) return null;
    return apiLandscapes.find((l) => l.id === selectedLandscape)|| null;
  }, [selectedLandscape, apiLandscapes]);

  // Build landscape config for health checks
  const landscapeConfig = useMemo(() => {
    if (!selectedApiLandscape) return { name: '', route: '' };
    
    return {
      name: selectedApiLandscape.name,
      route: selectedApiLandscape.metadata?.route || 
             selectedApiLandscape.landscape_url || 
             'cfapps.sap.hana.ondemand.com',
    };
  }, [selectedApiLandscape]);

  // Health data hook - only fetch if showComponentsMetrics is true
  const {
    healthChecks,
    summary,
    isLoading: isLoadingHealth,
  } = useHealth({
    components: apiComponents,
    landscape: landscapeConfig,
    enabled: showComponentsMetrics && !!selectedLandscape && !componentsLoading,
  });

  // Build team maps
  const teamNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (teamsData?.teams) {
      teamsData.teams.forEach((team: any) => {
        map[team.id] = team.title || team.name;
      });
    }
    return map;
  }, [teamsData]);

  const teamColorsMap = useMemo(() => {
    const map: Record<string, string> = {};
    // Add color mapping logic if needed
    return map;
  }, []);

  // Tab label mapping
  const getTabLabel = (tabId: string): string => {
    const labelMap: Record<string, string> = {
      'components': 'Components',
      'health': 'Health',
      'alerts': 'Alerts',
    };
    return labelMap[tabId] || tabId.charAt(0).toUpperCase() + tabId.slice(1);
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
  }, [headerTabs, defaultTab, syncTabWithUrl]);

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

  // Set default landscape
  useEffect(() => {
    if (apiLandscapes && apiLandscapes.length > 0 && !selectedLandscape) {
      const defaultLandscape = apiLandscapes.find((l: any) => l.name === 'DEFAULT');
      if (defaultLandscape) {
        setSelectedLandscape(defaultLandscape.id);
      } else {
        setSelectedLandscape(apiLandscapes[0].id);
      }
    }
  }, [apiLandscapes, selectedLandscape, setSelectedLandscape]);

  // Handlers
  const handleToggleComponentExpansion = (componentId: string) => {
    setTeamComponentsExpanded(prev => ({
      ...prev,
      [componentId]: !(prev[componentId] ?? false)
    }));
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

            {/* Health Overview Metrics - only shown if showComponentsMetrics is true */}
            {showComponentsMetrics && (
              <HealthOverview
                summary={summary}
                isLoading={isLoadingHealth}
              />
            )}

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
            alertsUrl={alertsUrl}
          />
        );
      default:
        return null;
    }
  };

  const renderTabContent = () => {    
    return renderGenericTabContent();
  };

  return (
    <BreadcrumbPage>
      {children}
      {renderTabContent()}
    </BreadcrumbPage>
  );
}