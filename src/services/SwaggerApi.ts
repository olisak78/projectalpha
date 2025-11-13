import { getNewBackendUrl } from '@/constants/developer-portal';
import type { Component } from '@/types/api';

/**
 * Landscape configuration for building URLs
 */
export interface LandscapeConfig {
  name: string;
  route: string;
}

/**
 * Swagger API response structure
 */
export interface SwaggerApiResponse {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths?: Record<string, any>;
  components?: Record<string, any>;
  [key: string]: any;
}

/**
 * Build component Swagger API docs endpoint URL
 * Example: https://accounts-service.cfapps.stagingaws.hanavlab.ondemand.com/v3/api-docs
 */
function buildComponentSwaggerEndpoint(
  component: Component,
  landscape: LandscapeConfig
): string {
  const componentName = component.name.toLowerCase();
  const domain = landscape.route;
  return `https://${componentName}.cfapps.${domain}/v3/api-docs`;
}

/**
 * Build component Swagger API docs endpoint URL with subdomain prefix
 */
function buildComponentSwaggerEndpointWithSubdomain(
  component: Component,
  landscape: LandscapeConfig,
  subdomain: string
): string {
  const componentName = component.name.toLowerCase();
  const domain = landscape.route;
  return `https://${subdomain}.${componentName}.cfapps.${domain}/v3/api-docs`;
}

/**
 * Build the Swagger UI URL for opening in new tab
 * Uses /api endpoint with scope parameter
 */
function buildSwaggerUIUrl(
  component: Component,
  landscape: LandscapeConfig
): string {
  const componentName = component.name.toLowerCase();
  const domain = landscape.route;
  const subdomain = component.metadata?.subdomain;
  
  if (subdomain && typeof subdomain === 'string') {
    return `https://${subdomain}.${componentName}.cfapps.${domain}/api?scope=cis-system`;
  }
  return `https://${componentName}.cfapps.${domain}/api?scope=cis-system`;
}

/**
 * Build proxy URL for Swagger API docs
 * Routes through backend proxy to handle authentication
 * 
 * @param componentUrl - The component's Swagger API docs URL
 * @returns Proxied URL with authentication
 */
export function buildSwaggerProxyURL(componentUrl: string): string {
  const backendUrl = getNewBackendUrl();
  return `${backendUrl}/api/v1/cis-public/proxy?url=${encodeURIComponent(componentUrl)}`;
}

/**
 * Fetch Swagger API schema through proxy
 * Similar to fetchHealthStatus, uses proxy with credentials
 * 
 * @param component - The component
 * @param landscape - The landscape configuration
 * @returns Promise with the Swagger schema JSON
 */
export async function fetchSwaggerSchema(
  component: Component,
  landscape: LandscapeConfig
): Promise<{
  status: 'success' | 'error';
  data?: SwaggerApiResponse;
  error?: string;
  swaggerUiUrl?: string;
}> {
  try {
    const subdomain = component.metadata?.subdomain;
    
    // Build the component's API docs URL
    const componentUrl = subdomain && typeof subdomain === 'string'
      ? buildComponentSwaggerEndpointWithSubdomain(component, landscape, subdomain)
      : buildComponentSwaggerEndpoint(component, landscape);

    // Build the Swagger UI URL for opening in new tab
    const swaggerUiUrl = buildSwaggerUIUrl(component, landscape);

    // Use proxy to fetch the schema with proper authorization
    const proxyUrl = buildSwaggerProxyURL(componentUrl);
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      return {
        status: 'error',
        error: `Failed to fetch Swagger schema: ${response.status} ${response.statusText}`,
        swaggerUiUrl,
      };
    }

    const data: SwaggerApiResponse = await response.json();

    return {
      status: 'success',
      data,
      swaggerUiUrl,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error fetching Swagger schema',
    };
  }
}