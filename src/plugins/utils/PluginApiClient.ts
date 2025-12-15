/**
 * Plugin API Client
 * 
 * Provides a scoped API client for plugins that automatically
 * prefixes all requests with /api/plugins/:pluginId/
 * 
 * This ensures plugins can only access their designated endpoints
 * and inherits authentication from the main portal API client.
 * 
 * For local development, supports proxying to a custom backend URL
 * via sessionStorage configuration.
 */

import { apiClient } from '@/services/ApiClient';
import type { PluginApiClient as IPluginApiClient, RequestOptions } from '../types/plugin.types';

/**
 * Implementation of the PluginApiClient interface
 * 
 * All API calls are automatically scoped to /api/plugins/:pluginId/*
 * and inherit authentication from the portal's main API client.
 * 
 * In local development mode, if a plugin backend proxy URL is set
 * in sessionStorage, requests will be sent directly to that URL
 * instead of the portal backend.
 */
export class PluginApiClient implements IPluginApiClient {
  private readonly pluginId: string;
  private readonly basePath: string;

  constructor(pluginId: string) {
    if (!pluginId || pluginId.trim() === '') {
      throw new Error('Plugin ID is required for PluginApiClient');
    }
    
    this.pluginId = pluginId;
    this.basePath = `/plugins/${pluginId}`;
  }

  /**
   * Get the effective backend URL for API requests
   * 
   * Checks sessionStorage for a plugin backend proxy URL.
   * If found, uses that for local testing. Otherwise, uses
   * the portal's normal backend.
   * 
   * @returns Base URL for API requests
   */
  private getBackendUrl(): string | null {
    try {
      return sessionStorage.getItem('plugin-backend-proxy');
    } catch (error) {
      console.warn('[PluginApiClient] Failed to read sessionStorage:', error);
      return null;
    }
  }

  /**
   * Build the full URL for a request
   * 
   * If a backend proxy is configured, constructs URL directly to that backend.
   * Otherwise, builds a scoped path for the portal backend.
   * 
   * @param path - The API path (e.g., '/data' or '/favorites')
   * @returns Full path or URL for the request
   */
  private buildRequestPath(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const backendProxy = this.getBackendUrl();

    if (backendProxy) {
      // Direct proxy mode - send to custom backend
      console.log(`[PluginApiClient] Using backend proxy: ${backendProxy}${normalizedPath}`);
      return `${backendProxy}${normalizedPath}`;
    }

    // Normal mode - scope to portal backend
    return `${this.basePath}${normalizedPath}`;
  }

  /**
   * Make a request with backend proxy support
   * 
   * If a backend proxy URL is configured, makes a direct fetch call.
   * Otherwise, uses the portal's authenticated API client.
   * 
   * @param path - API path
   * @param method - HTTP method
   * @param body - Request body (optional)
   * @param options - Request options
   * @returns Response data
   */
  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    const backendProxy = this.getBackendUrl();

    if (backendProxy) {
      // Direct proxy mode - bypass portal backend
      return this.directRequest<T>(path, method, body, options);
    }

    // Normal mode - use portal's API client
    return this.portalRequest<T>(path, method, body, options);
  }

  /**
   * Make a direct request to the plugin's backend (local testing mode)
   * 
   * Automatically includes the portal's authentication token in the request.
   * 
   * @param path - API path
   * @param method - HTTP method
   * @param body - Request body
   * @param options - Request options
   * @returns Response data
   */
  private async directRequest<T>(
    path: string,
    method: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    const backendProxy = this.getBackendUrl();
    if (!backendProxy) {
      throw new Error('Backend proxy URL not configured');
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${backendProxy}${normalizedPath}`;

    // Build query string if params exist
    const urlWithParams = new URL(url);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlWithParams.searchParams.append(key, String(value));
        }
      });
    }

    console.log(`[PluginApiClient] Direct request: ${method} ${urlWithParams.toString()}`);

    // Get the access token from the main API client
    let authToken: string | null = null;
    try {
      authToken = await apiClient.getToken();
      console.log('[PluginApiClient] Got auth token for direct request');
    } catch (error) {
      console.warn('[PluginApiClient] Failed to get auth token:', error);
      // Continue without token - the backend will handle auth error
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if we have a token
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options?.headers,
      },
      credentials: 'include', // Include cookies for CORS
      signal: options?.signal,
    };

    // Add body for non-GET requests
    if (body !== undefined && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(urlWithParams.toString(), fetchOptions);

      if (!response.ok) {
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch {
          // Error body not JSON
        }
        throw new Error(errorMessage);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      console.error('[PluginApiClient] Direct request failed:', error);
      throw error;
    }
  }

  /**
   * Make a request through the portal's API client (production mode)
   * 
   * @param path - API path
   * @param method - HTTP method
   * @param body - Request body
   * @param options - Request options
   * @returns Response data
   */
  private async portalRequest<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    const scopedPath = this.buildRequestPath(path);

    switch (method) {
      case 'GET':
        return apiClient.get<T>(scopedPath, {
          params: options?.params,
          headers: options?.headers,
          signal: options?.signal,
        });
      case 'POST':
        return apiClient.post<T>(scopedPath, body, {
          headers: options?.headers,
          signal: options?.signal,
        });
      case 'PUT':
        return apiClient.put<T>(scopedPath, body, {
          headers: options?.headers,
          signal: options?.signal,
        });
      case 'DELETE':
        return apiClient.delete<T>(scopedPath, {
          headers: options?.headers,
          signal: options?.signal,
        });
      case 'PATCH':
        return apiClient.patch<T>(scopedPath, body, {
          headers: options?.headers,
          signal: options?.signal,
        });
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  async get<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, 'GET', undefined, options);
  }

  async post<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, 'POST', body, options);
  }

  async put<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, 'PUT', body, options);
  }

  async delete<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, 'DELETE', undefined, options);
  }

  async patch<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, 'PATCH', body, options);
  }

  getPluginId(): string {
    return this.pluginId;
  }

  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Check if backend proxy mode is active
   * 
   * @returns true if requests are being proxied to a custom backend
   */
  isProxyMode(): boolean {
    return this.getBackendUrl() !== null;
  }

  /**
   * Get the current backend proxy URL (if set)
   * 
   * @returns Backend proxy URL or null
   */
  getProxyUrl(): string | null {
    return this.getBackendUrl();
  }
}