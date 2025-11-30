import type { ComponentHealthCheck } from '@/types/health';
import { StatusBadge } from './StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { GithubIcon } from '../icons/GithubIcon';
import { cn } from '@/lib/utils';

interface HealthRowProps {
  healthCheck: ComponentHealthCheck;
  isExpanded: boolean;
  onToggle: () => void;
  teamName?: string;
  componentName?: string;
  onComponentClick?: (componentName: string) => void;
  githubUrl?: string;
  sonarUrl?: string;
}

export function HealthRow({
  healthCheck,
  isExpanded,
  onToggle,
  teamName,
  componentName,
  onComponentClick,
  githubUrl,
  sonarUrl,
}: HealthRowProps) {
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
    if (onComponentClick && componentName && healthCheck.status === 'UP') {
      onComponentClick(componentName);
    }
  };

  const handleLinkClick = (url: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (url && url.trim() !== '' && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const isClickable = onComponentClick && componentName && healthCheck.status === 'UP';

  return (
    <>
      <tr
        className={cn(
          "transition-colors",
          healthCheck.status !== 'UP'
            ? ""
            : "hover:bg-gray-50 dark:hover:bg-gray-900/50",
          isClickable && healthCheck.status === 'UP' ? 'cursor-pointer' : ''
        )}
        onClick={isClickable ? handleRowClick : undefined}
      >
        <td className={cn(
          "px-6 py-4 whitespace-nowrap",
          healthCheck.status !== 'UP'
            ? "opacity-50 grayscale pointer-events-none"
            : "hover:bg-gray-50 dark:hover:bg-gray-900/50",
          isClickable && healthCheck.status === 'UP' ? 'cursor-pointer' : ''
        )}>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {healthCheck.componentName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {healthCheck.componentId}
              </span>
            </div>
          </div>
        </td>
        <td className={cn(
          "px-6 py-4 whitespace-nowrap",
          healthCheck.status !== 'UP'
            ? "opacity-50 grayscale pointer-events-none"
            : "hover:bg-gray-50 dark:hover:bg-gray-900/50",
          isClickable && healthCheck.status === 'UP' ? 'cursor-pointer' : ''
        )}

        >
          <StatusBadge
            status={healthCheck.status}
            error={healthCheck.error}
          />
        </td>
        <td className={cn(
          "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400",
          healthCheck.status !== 'UP'
            ? "opacity-50 grayscale pointer-events-none"
            : "hover:bg-gray-50 dark:hover:bg-gray-900/50",
          isClickable && healthCheck.status === 'UP' ? 'cursor-pointer' : ''
        )}
        >
          {formatResponseTime(healthCheck.responseTime)}
        </td>
        <td className={cn(
          "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400",
          healthCheck.status !== 'UP'
            ? "opacity-50 grayscale pointer-events-none"
            : "hover:bg-gray-50 dark:hover:bg-gray-900/50",
          isClickable && healthCheck.status === 'UP' ? 'cursor-pointer' : ''
        )}
        >
          {formatLastChecked(healthCheck.lastChecked)}
        </td>
        <td className={cn(
          "px-6 py-4 whitespace-nowrap",
          healthCheck.status !== 'UP'
            ? "opacity-50 grayscale pointer-events-none"
            : "hover:bg-gray-50 dark:hover:bg-gray-900/50",
          isClickable && healthCheck.status === 'UP' ? 'cursor-pointer' : ''
        )}
        >
          {teamName ? (
            <Badge variant="secondary" className="text-xs">
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