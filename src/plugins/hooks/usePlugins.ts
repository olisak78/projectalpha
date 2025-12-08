/**
 * Plugin React Query Hooks
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type {
  PluginsListResponse,
  PluginResponse,
  PluginMutationResponse,
  RegisterPluginRequest,
  UpdatePluginRequest,
  PluginQueryParams,
} from '../types/plugin.types';
import { deletePlugin, fetchPlugin, fetchPlugins, registerPlugin, togglePlugin, updatePlugin } from '../services/pluginApi';


export const pluginQueryKeys = {
  all: ['plugins'] as const,
  lists: () => [...pluginQueryKeys.all, 'list'] as const,
  list: (params?: PluginQueryParams) => [...pluginQueryKeys.lists(), params] as const,
  details: () => [...pluginQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...pluginQueryKeys.details(), id] as const,
};

export function usePlugins(
  params?: PluginQueryParams,
  options?: Omit<UseQueryOptions<PluginsListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pluginQueryKeys.list(params),
    queryFn: () => fetchPlugins(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function usePlugin(
  id: string,
  options?: Omit<UseQueryOptions<PluginResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pluginQueryKeys.detail(id),
    queryFn: () => fetchPlugin(id),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useRegisterPlugin(
  options?: UseMutationOptions<PluginMutationResponse, Error, RegisterPluginRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerPlugin,
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: pluginQueryKeys.lists() });
      if (options?.onSuccess) {
        await options.onSuccess(data, variables, context);
      }
    },
  });
}

export function useUpdatePlugin(
  options?: UseMutationOptions<PluginMutationResponse, Error, { id: string; data: UpdatePluginRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updatePlugin(id, data),
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: pluginQueryKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: pluginQueryKeys.detail(variables.id) });
      if (options?.onSuccess) {
        await options.onSuccess(data, variables, context);
      }
    },
  });
}

export function useDeletePlugin(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlugin,
    ...options,
    onSuccess: async (data, pluginId, context) => {
      await queryClient.invalidateQueries({ queryKey: pluginQueryKeys.lists() });
      queryClient.removeQueries({ queryKey: pluginQueryKeys.detail(pluginId) });
      if (options?.onSuccess) {
        await options.onSuccess(data, pluginId, context);
      }
    },
  });
}

export function useTogglePlugin(
  options?: UseMutationOptions<PluginMutationResponse, Error, { id: string; enabled: boolean }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }) => togglePlugin(id, enabled),
    ...options,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: pluginQueryKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: pluginQueryKeys.detail(variables.id) });
      if (options?.onSuccess) {
        await options.onSuccess(data, variables, context);
      }
    },
  });
}