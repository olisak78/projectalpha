/**
 * Plugin API Service
 */

import { apiClient } from '@/services/ApiClient';
import type {
  PluginsListResponse,
  PluginResponse,
  PluginMutationResponse,
  RegisterPluginRequest,
  UpdatePluginRequest,
  PluginQueryParams,
} from '../types/plugin.types';

export async function fetchPlugins(params?: PluginQueryParams): Promise<PluginsListResponse> {
  return apiClient.get<PluginsListResponse>('/plugins', {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function fetchPlugin(id: string): Promise<PluginResponse> {
  return apiClient.get<PluginResponse>(`/plugins/${id}`);
}

export async function validatePluginBundle(
  bundleUrl: string
): Promise<{ valid: boolean; error?: string; manifest?: any }> {
  return apiClient.post<{ valid: boolean; error?: string; manifest?: any }>(
    '/plugins/validate-bundle',
    { bundleUrl }
  );
}

export async function registerPlugin(data: RegisterPluginRequest): Promise<PluginMutationResponse> {
  return apiClient.post<PluginMutationResponse>('/plugins', data);
}

export async function updatePlugin(id: string, data: UpdatePluginRequest): Promise<PluginMutationResponse> {
  return apiClient.put<PluginMutationResponse>(`/plugins/${id}`, data);
}

export async function deletePlugin(id: string): Promise<void> {
  return apiClient.delete(`/plugins/${id}`);
}

export async function togglePlugin(id: string, enabled: boolean): Promise<PluginMutationResponse> {
  return updatePlugin(id, { enabled });
}