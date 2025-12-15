import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Component } from "@/types/api";
import { type SystemInformation, fetchSystemInformation } from "@/services/healthApi";
import { cn } from "@/lib/utils";
import { ComponentHeader } from "./ComponentCard/ComponentHeader";
import { ActionButtons } from "./ComponentCard/ActionButtons";
import { QualityMetricsGrid } from "./ComponentCard/QualityMetricsGrid";
import { useComponentDisplay } from "@/contexts/ComponentDisplayContext";

interface ComponentCardProps {
  component: Component;
  onClick?: () => void;
}

export default function ComponentCard({
  component,
  onClick,
}: ComponentCardProps) {
  const {
    selectedLandscape,
    selectedLandscapeData,
    isCentralLandscape,
    teamNamesMap,
    teamColorsMap,
    componentHealthMap,
    isLoadingHealth,
  } = useComponentDisplay();
  const [systemInfo, setSystemInfo] = useState<SystemInformation | null>(null);
  const [loadingSystemInfo, setLoadingSystemInfo] = useState(false);

  // Get team info from context
  const teamName = component.owner_id ? teamNamesMap[component.owner_id] : undefined;
  const teamColor = component.owner_id ? teamColorsMap[component.owner_id] : undefined;
  const healthCheck = componentHealthMap[component.id];

  const isDisabled = component['central-service'] === true && !isCentralLandscape;

  // Fetch system information when landscape changes
  useEffect(() => {
    const loadSystemInfo = async () => {
      if (!selectedLandscape || !selectedLandscapeData || isDisabled) {
        setSystemInfo(null);
        return;
      }

      setLoadingSystemInfo(true);
      try {
        const landscapeConfig = {
          name: selectedLandscapeData.name || selectedLandscape,
          route: selectedLandscapeData.metadata?.route ||
            selectedLandscapeData.landscape_url ||
            'cfapps.sap.hana.ondemand.com',
        };
        
        const result = await fetchSystemInformation(component, landscapeConfig);
        
        if (result.status === 'success' && result.data) {
          setSystemInfo(result.data);
        } else {
          setSystemInfo(null);
        }
      } catch (error) {
        console.error('Failed to fetch system info:', error);
        setSystemInfo(null);
      } finally {
        setLoadingSystemInfo(false);
      }
    };

    loadSystemInfo();
  }, [component, selectedLandscape, selectedLandscapeData, isDisabled]);

  // Handle card click - only navigate if not clicking on buttons
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    if (!target.closest('button') && !target.closest('a') && onClick) {
      onClick();
    }
  };

  const isClickable = onClick && true; // Always clickable when onClick is provided

  return (
    <Card 
      style={isClickable ? { cursor: 'pointer' } : undefined}
      onClick={isClickable ? handleCardClick : undefined} 
      className={cn(
        "transition-all duration-200 border-border/60",
        isDisabled && "border-gray-300 dark:border-gray-600 bg-muted/50",
        !isDisabled && healthCheck && healthCheck.status !== 'UP',
        !isDisabled && "hover:shadow-lg hover:border-border"
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className={cn(
          isDisabled && "opacity-50",
          !isDisabled && healthCheck && healthCheck.status !== 'UP'
            ? "opacity-50 grayscale"
            : ""
        )}>
          <ComponentHeader
            component={component}
            teamName={teamName}
            teamColor={teamColor}
            systemInfo={systemInfo}
            loadingSystemInfo={loadingSystemInfo}
            isDisabled={isDisabled}
          />
        </div>

        {/* Action Buttons */}
        <ActionButtons component={component} />

        {/* Quality Metrics Grid */}
        <div className={cn(
          isDisabled && "opacity-50",
          !isDisabled && healthCheck && healthCheck.status !== 'UP'
            ? "opacity-50 grayscale"
            : ""
        )}>
          <QualityMetricsGrid component={component} />
        </div>
      </CardContent>
    </Card>
  );
}
