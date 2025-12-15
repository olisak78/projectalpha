import React, { useMemo } from 'react';
import type { ComponentHealthCheck } from '@/types/health';
import { StatusBadge } from './StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { GithubIcon } from '../icons/GithubIcon';
import { cn } from '@/lib/utils';
import { useComponentDisplay } from '@/contexts/ComponentDisplayContext';

interface HealthRowProps {
  healthCheck: ComponentHealthCheck;
  isExpanded: boolean;
  onToggle: () => void;
  teamName?: string;
  teamColor?: string;
  componentName?: string;
  onComponentClick?: (componentName: string) => void;
  githubUrl?: string;
  sonarUrl?: string;
  isUnsupported?: boolean;
  isDisabled?: boolean;
  component?: {
    id: string;
    name: string;
    title?: string;
    description?: string;
    project_id?: string;
    owner_id?: string | null;
    'central-service'?: boolean;
    [key: string]: any;
  };
}

export function HealthRow({
  healthCheck,
  isExpanded,
  onToggle,
  teamName,
  teamColor,
  componentName,
  onComponentClick,
  githubUrl,
  sonarUrl,
  isUnsupported = false,
  isDisabled = false,
  component,
}: HealthRowProps) {
  const { isCentralLandscape, componentSystemInfoMap, isLoadingSystemInfo } = useComponentDisplay();
  
  // Memoized version badges to avoid IIFE overhead on every render
  const versionBadges = useMemo(() => {
    if (!component) return null;
    
    const systemInfo = componentSystemInfoMap[component.id];
    
    if (!systemInfo) return null;
    
    // Check for direct app/sapui5 properties (from /version endpoint)
    if (systemInfo.app || systemInfo.sapui5) {
      return (
        <>
          {systemInfo.app && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground">
              App: {systemInfo.app}
            </Badge>
          )}
          {systemInfo.sapui5 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground">
              UI5: {systemInfo.sapui5}
            </Badge>
          )}
        </>
      );
    }
    
    // Check for version in buildProperties (from /systemInformation/public)
    const version = systemInfo.buildProperties?.version;
    if (version) {
      // Check if version is an object with app/sapui5 properties
      if (typeof version === 'object' && version !== null) {
        return (
          <>
            {version.app && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground">
                App: {version.app}
              </Badge>
            )}
            {version.sapui5 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground">
                UI5: {version.sapui5}
              </Badge>
            )}
          </>
        );
      }
      
      // Simple string version
      if (typeof version === 'string') {
        return (
          <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground">
            {version}
          </Badge>
        );
      }
    }
    
    return null;
  }, [component, componentSystemInfoMap]);

  const formatResponseTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatLastChecked = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString();
  };

  const hasDetails = healthCheck.response && healthCheck.response.components;

  const handleRowClick = () => {
    // Allow clicking on components that are UP, UNKNOWN, or unsupported (not DOWN/ERROR)
    if (onComponentClick && componentName && (isUnsupported || healthCheck.status === 'UP' || healthCheck.status === 'UNKNOWN')) {
      onComponentClick(componentName);
    }
  };

  const handleLinkClick = (url: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (url && url.trim() !== '' && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const isClickable = onComponentClick && componentName && (isUnsupported || healthCheck.status === 'UP' || healthCheck.status === 'UNKNOWN');

  return (
    <>
      <tr
        className={cn(
          "transition-colors",
          isDisabled && "opacity-50 bg-muted/50",
          !isDisabled && (healthCheck.status === 'UP' || healthCheck.status === 'UNKNOWN') && "hover:bg-gray-50 dark:hover:bg-gray-900/50",
          !isDisabled && (healthCheck.status === 'DOWN' || healthCheck.status === 'ERROR') && "opacity-50 grayscale",
          isClickable ? 'cursor-pointer' : ''
        )}
        onClick={isClickable ? handleRowClick : undefined}
      >
        <td className={cn(
          "px-6 py-4 whitespace-nowrap",
          isClickable ? 'cursor-pointer' : ''
        )}>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {healthCheck.componentName}
                </span>
                {/* Version badges for all components (central and non-central) */}
                {component && (
                  <>
                    {isLoadingSystemInfo ? (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground">
                        Loading...
                      </Badge>
                    ) : (
                      versionBadges
                    )}
                  </>
                )}
                {/* Central Service Badge */}
                {component?.['central-service'] && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground">
                    Central Service
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {healthCheck.componentId}
              </span>
            </div>
          </div>
        </td>
        <td className={cn(
          "px-6 py-4 whitespace-nowrap",
          isClickable ? 'cursor-pointer' : ''
        )}>
          <StatusBadge
            status={healthCheck.status}
            error={healthCheck.error}
          />
        </td>
        <td className={cn(
          "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400",
          isClickable ? 'cursor-pointer' : ''
        )}>
          {formatResponseTime(healthCheck.responseTime)}
        </td>
        <td className={cn(
          "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400",
          isClickable ? 'cursor-pointer' : ''
        )}>
          {formatLastChecked(healthCheck.lastChecked)}
        </td>
        <td className={cn(
          "px-6 py-4 whitespace-nowrap",
          isClickable ? 'cursor-pointer' : ''
        )}>
          {teamName ? (
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0.5 flex-shrink-0 text-white border-0 min-h-[24px] ${
                isDisabled ? 'bg-gray-500' : ''
              }`}
              {...(!isDisabled && teamColor ? { style: { backgroundColor: teamColor } } : {})}
            >
              {teamName}
            </Badge>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap pointer-events-auto">
          {githubUrl && githubUrl.trim() !== '' && githubUrl !== '#' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleLinkClick(githubUrl, e)}
              className="h-8 px-2"
            >
              <GithubIcon className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap pointer-events-auto">
          {sonarUrl && sonarUrl.trim() !== '' && sonarUrl !== '#' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleLinkClick(sonarUrl, e)}
              className="h-8 px-2"
            >
              <Activity className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
          )}
        </td>
      </tr>
    </>
  );
}
