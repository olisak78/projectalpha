import { useMemo } from 'react';

import type { Component } from '@/types/api';
import { getSwaggerURL, LandscapeConfig } from '@/services/SwaggerApi';

/**
 * Response type for Swagger UI
 */
export interface SwaggerUIResponse {
  url: string;
}

/**
 * Hook to get Swagger UI URL for a component
 * Returns the proxy URL that can be opened in a new tab
 * 
 * @param component - The component to get Swagger UI for
 * @param landscape - The landscape configuration
 * @param options - Additional options (enabled, etc.)
 * @returns Swagger UI proxy URL
 * 
 * @example
 * const { data } = useSwaggerUI(component, landscape);
 * if (data?.url) {
 *   // Open in new tab: window.open(data.url, '_blank')
 * }
 */
export function useSwaggerUI(
  component: Component | null | undefined,
  landscape: LandscapeConfig | null | undefined,
  options?: { enabled?: boolean }
): { data: SwaggerUIResponse | null; isLoading: boolean; error: Error | null } {
  const enabled = options?.enabled ?? true;

  const result = useMemo(() => {
    // If not enabled or missing required data, return null
    if (!enabled || !component || !landscape) {
      return { data: null, isLoading: false, error: null };
    }

    try {
      const swaggerResult = getSwaggerURL(component, landscape);
      return {
        data: { url: swaggerResult.url },
        isLoading: false,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to generate Swagger URL'),
      };
    }
  }, [component, landscape, enabled]);

  return result;
}