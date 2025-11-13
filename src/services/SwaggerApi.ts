
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
 * Build component Swagger endpoint URL
 * Example: https://accounts-service.cfapps.stagingaws.hanavlab.ondemand.com/api?scope=cis-system
 */
function buildComponentSwaggerEndpoint(
  component: Component,
  landscape: LandscapeConfig
): string {
  const componentName = component.name.toLowerCase();
  const domain = landscape.route;
  return `https://${componentName}.cfapps.${domain}/api?scope=cis-system`;
}

/**
 * Build component Swagger endpoint URL with subdomain prefix
 */
function buildComponentSwaggerEndpointWithSubdomain(
  component: Component,
  landscape: LandscapeConfig,
  subdomain: string
): string {
  const componentName = component.name.toLowerCase();
  const domain = landscape.route;
  return `https://${subdomain}.${componentName}.cfapps.${domain}/api?scope=cis-system`;
}

/**
 * Build proxy URL for Swagger UI
 * Routes through backend proxy to handle authentication and redirects
 * 
 * @param componentUrl - The component's Swagger URL
 * @returns Proxied URL with authentication
 */
export function buildSwaggerProxyURL(componentUrl: string): string {
  const backendUrl = getNewBackendUrl();
  return `${backendUrl}/api/v1/cis-public/proxy?url=${encodeURIComponent(componentUrl)}`;
}

/**
 * Get Swagger UI URL for a component
 * Returns the direct component URL (not proxied) for opening in new tab
 * 
 * @param component - The component
 * @param landscape - The landscape configuration
 * @returns Object with the direct Swagger URL
 */
export function getSwaggerURL(
  component: Component,
  landscape: LandscapeConfig
): {
  status: 'success';
  url: string;
} {
  const subdomain = component.metadata?.subdomain;
  
  // Build the component's direct URL
  const componentUrl = subdomain && typeof subdomain === 'string'
    ? buildComponentSwaggerEndpointWithSubdomain(component, landscape, subdomain)
    : buildComponentSwaggerEndpoint(component, landscape);

  // Return direct URL (not proxied) for opening in new tab
  // The browser will handle authentication with cookies
  return {
    status: 'success',
    url: componentUrl,
  };
}