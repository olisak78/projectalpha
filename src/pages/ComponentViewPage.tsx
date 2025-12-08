import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { BreadcrumbPage } from "@/components/BreadcrumbPage";
import { useComponentsByProject } from "@/hooks/api/useComponents";
import { useLandscapesByProject } from "@/hooks/api/useLandscapes";
import { usePortalState } from "@/contexts/hooks";
import { useHeaderNavigation } from "@/contexts/HeaderNavigationContext";
import { fetchHealthStatus, buildHealthEndpoint } from "@/services/healthApi";
import { useSonarMeasures } from "@/hooks/api/useSonarMeasures";
import { getDefaultLandscapeId } from "@/services/LandscapesApi";
import type { Component } from "@/types/api";
import type { HealthResponse } from "@/types/health";
import { useSwaggerUI } from "@/hooks/api/useSwaggerUI";
import { ComponentViewApi } from "@/components/ComponentViewApi";
import { ComponentViewOverview } from "@/components/ComponentViewOverview";

export function ComponentViewPage() {
    const params = useParams<{ projectName?: string; componentName?: string; componentId?: string; tabId?: string }>();
    const componentName = params.componentName || params.componentId;
    const tabId = params.tabId;
    const navigate = useNavigate();
    const { getSelectedLandscapeForProject, setSelectedLandscapeForProject } = usePortalState();
    const { setTabs, activeTab, setActiveTab } = useHeaderNavigation();

    const projectName = params.projectName || 'cis20';
    
    // Fetch components and landscapes
    const { data: landscapesData, isLoading: isLoadingLandscapes } = useLandscapesByProject(projectName);
    const { data: components } = useComponentsByProject(projectName);
    const { data: apiLandscapes } = useLandscapesByProject(projectName);
    
    // Get project-specific selected landscape (reactive to changes)
    const effectiveSelectedLandscape = useMemo(() => {
        return getSelectedLandscapeForProject(projectName);
    }, [getSelectedLandscapeForProject, projectName]);

    const component = components?.find((c: Component) => c.name === componentName);


    // Find the selected landscape from API data
    const selectedApiLandscape = useMemo(() => {
        return apiLandscapes?.find((l: any) => l.id === effectiveSelectedLandscape);
    }, [apiLandscapes, effectiveSelectedLandscape]);

    // State for health data
    const [healthData, setHealthData] = useState<HealthResponse | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const [statusCode, setStatusCode] = useState<number | null>(null);

    // Find the selected landscape data
    const landscapeConfig = useMemo(() => {
        if (!landscapesData || !effectiveSelectedLandscape) return null;
        const landscape = landscapesData.find(l => l.id === effectiveSelectedLandscape);
        if (!landscape) return null;
        return {
            name: landscape.name,
            route: landscape.landscape_url || 'sap.hana.ondemand.com'
        };
    }, [landscapesData, effectiveSelectedLandscape]);

    // Fetch Swagger data
    const { data: swaggerData, isLoading: isLoadingSwagger, error: swaggerError } = useSwaggerUI(
        component,
        landscapeConfig,
        {
            enabled: activeTab === 'api' && !!component && !!landscapeConfig
        }
    );

    // Fetch Sonar measures
    const { data: sonarData, isLoading: sonarLoading } = useSonarMeasures(
        component?.sonar || null,
        true
    );

    // Set up header navigation tabs
    useEffect(() => {
        setTabs([
            { id: 'overview', label: 'Overview' },
            { id: 'api', label: 'API' }
        ]);
    }, []); // Remove setTabs from dependency array to prevent infinite loop

    // Set initial tab from URL
    useEffect(() => {
        if (tabId && ['overview', 'api'].includes(tabId)) {
            setActiveTab(tabId);
        }
    }, [tabId, setActiveTab]);

    // Set default landscape when landscapes are loaded
    useEffect(() => {
        if (apiLandscapes && apiLandscapes.length > 0) {
            // Check if the currently selected landscape is valid for this project
            const isSelectedLandscapeValid = effectiveSelectedLandscape && 
                apiLandscapes.some(landscape => landscape.id === effectiveSelectedLandscape);
            
            // If no landscape is selected or the selected one is invalid for this project,
            // set a default landscape
            if (!isSelectedLandscapeValid) {
                const defaultLandscapeId = getDefaultLandscapeId(apiLandscapes, projectName);
                if (defaultLandscapeId) {
                    setSelectedLandscapeForProject(projectName, defaultLandscapeId);
                }
            }
        }
    }, [apiLandscapes, effectiveSelectedLandscape, setSelectedLandscapeForProject, projectName]);

    // Fetch health data when component or landscape changes
    useEffect(() => {
        if (!component || !selectedApiLandscape) {
            setHealthData(null);
            return;
        }

        const fetchHealth = async () => {
            setHealthLoading(true);
            setHealthError(null);

            try {
                const healthUrl = buildHealthEndpoint(component, {
                    name: selectedApiLandscape.name,
                    route: selectedApiLandscape.landscape_url || selectedApiLandscape.domain || 'sap.hana.ondemand.com',
                });

                const result = await fetchHealthStatus(healthUrl);

                if (result.status === 'success' && result.data) {
                    setHealthData(result.data);
                    setResponseTime(result.responseTime || null);
                    setStatusCode(200);
                } else {
                    setHealthError(result.error || 'Failed to fetch health data');
                    setStatusCode(result.error ? 500 : 404);
                }
            } catch (error) {
                 setHealthError(error.message || 'Unknown error');
            } finally {
                setHealthLoading(false);
            }
        };

        fetchHealth();
    }, [component, selectedApiLandscape]);


    if (!component) {
        return (
            <BreadcrumbPage>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold mb-2">Component not found</h2>
                        <p className="text-muted-foreground mb-4">
                            The component "{componentName}" does not exist in this project.
                        </p>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-primary hover:underline"
                        >
                            Go back
                        </button>
                    </div>
                </div>
            </BreadcrumbPage>
        );
    }

    return (
        <BreadcrumbPage>
            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <ComponentViewOverview
                        component={component}
                        selectedLandscape={effectiveSelectedLandscape}
                        selectedApiLandscape={selectedApiLandscape}
                        healthData={healthData}
                        healthLoading={healthLoading}
                        healthError={healthError}
                        responseTime={responseTime}
                        statusCode={statusCode}
                        sonarData={sonarData}
                        sonarLoading={sonarLoading}
                    />
                )}

                {activeTab === 'api' && (
                    <ComponentViewApi
                        isLoading={isLoadingSwagger}
                        error={swaggerError}
                        swaggerData={swaggerData}
                    />
                )}
            </div>
        </BreadcrumbPage>
    );
}

export default ComponentViewPage;
