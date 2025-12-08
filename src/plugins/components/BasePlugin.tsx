/**
 * BasePlugin Component
 * 
 * Wrapper component that provides a standardized environment for all plugins.
 */

import React, { Suspense, useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { loadPlugin } from '../utils/pluginLoader';
import { PluginContext, PluginMetadata, PluginState, PluginTheme } from '../types/plugin.types';
import { PluginApiClient } from '../utils/PluginApiClient';


interface BasePluginProps {
  metadata: PluginMetadata;
  config?: Record<string, any>;
}

class PluginErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Plugin Error Boundary]', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <PluginCrashScreen
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }
    return this.props.children;
  }
}

function PluginSkeleton() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading plugin...</p>
      </div>
    </div>
  );
}

function PluginCrashScreen({ error, onRetry }: { error?: Error; onRetry: () => void }) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Plugin Crashed</CardTitle>
        </div>
        <CardDescription>The plugin encountered an error.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-mono text-destructive">{error.message}</p>
          </div>
        )}
        <Button onClick={onRetry} variant="outline">Retry</Button>
      </CardContent>
    </Card>
  );
}

function PluginLoadError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Failed to Load Plugin</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <Button onClick={onRetry} variant="outline">Retry</Button>
      </CardContent>
    </Card>
  );
}

export function BasePlugin({ metadata, config }: BasePluginProps) {
  const { actualTheme } = useTheme();
  const navigate = useNavigate();
  const [pluginState, setPluginState] = useState<PluginState>({ loadState: 'idle' });

  const apiClient = React.useMemo(() => new PluginApiClient(metadata.id), [metadata.id]);

  const pluginTheme: PluginTheme = React.useMemo(() => {
    const isDark = actualTheme === 'dark';
    return {
      mode: actualTheme,
      primaryColor: '#2563eb',
      colors: {
        background: isDark ? '#1f2937' : '#ffffff',
        foreground: isDark ? '#f3f4f6' : '#111827',
        muted: isDark ? '#374151' : '#f3f4f6',
        accent: isDark ? '#3b82f6' : '#2563eb',
        destructive: '#ef4444',
        border: isDark ? '#374151' : '#e5e7eb',
      },
    };
  }, [actualTheme]);

  const context: PluginContext = React.useMemo(
    () => ({
      theme: pluginTheme,
      apiClient,
      metadata,
      config,
      utils: {
        toast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => {
          toast({ title: message, variant: type === 'error' ? 'destructive' : 'default' });
        },
        navigate: (path: string) => navigate(path),
      },
    }),
    [pluginTheme, apiClient, metadata, config, navigate]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!metadata.enabled) {
        setPluginState({
          loadState: 'error',
          error: { type: 'compatibility', message: 'Plugin is disabled' },
        });
        return;
      }

      setPluginState({ loadState: 'loading' });

      try {
        const manifest = await loadPlugin(metadata.bundleUrl);
        if (cancelled) return;

        setPluginState({
          loadState: 'ready',
          manifest,
          loadedAt: new Date().toISOString(),
        });

        if (manifest.hooks?.onMount) {
          try {
            await manifest.hooks.onMount();
          } catch (error) {
            console.error('[Plugin] onMount error:', error);
          }
        }
      } catch (error: any) {
        if (cancelled) return;
        setPluginState({
          loadState: 'error',
          error: {
            type: error.type || 'runtime',
            message: error.message || 'Failed to load plugin',
            originalError: error,
          },
        });
      }
    }

    load();

    return () => {
      cancelled = true;
      if (pluginState.manifest?.hooks?.onUnmount) {
        try {
          pluginState.manifest.hooks.onUnmount();
        } catch (error) {
          console.error('[Plugin] onUnmount error:', error);
        }
      }
    };
  }, [metadata.bundleUrl, metadata.enabled, metadata.version]);

  useEffect(() => {
    if (pluginState.manifest?.hooks?.onConfigChange && config) {
      try {
        pluginState.manifest.hooks.onConfigChange(config);
      } catch (error) {
        console.error('[Plugin] onConfigChange error:', error);
      }
    }
  }, [config]);

  const handleRuntimeError = (error: Error) => {
    toast({ title: 'Plugin Error', description: error.message, variant: 'destructive' });
  };

  const handleRetry = () => setPluginState({ loadState: 'idle' });

  if (pluginState.loadState === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{metadata.name}</CardTitle>
          <CardDescription>{metadata.description}</CardDescription>
        </CardHeader>
        <CardContent><PluginSkeleton /></CardContent>
      </Card>
    );
  }

  if (pluginState.loadState === 'error' && pluginState.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{metadata.name}</CardTitle>
          <CardDescription>{metadata.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <PluginLoadError error={pluginState.error.message} onRetry={handleRetry} />
        </CardContent>
      </Card>
    );
  }

  if (pluginState.loadState === 'ready' && pluginState.manifest) {
    const PluginComponent = pluginState.manifest.component;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{metadata.name}</CardTitle>
          <CardDescription>{metadata.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <PluginErrorBoundary onError={handleRuntimeError}>
            <Suspense fallback={<PluginSkeleton />}>
              <PluginComponent context={context} />
            </Suspense>
          </PluginErrorBoundary>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{metadata.name}</CardTitle>
        <CardDescription>{metadata.description}</CardDescription>
      </CardHeader>
      <CardContent><p className="text-muted-foreground">Initializing plugin...</p></CardContent>
    </Card>
  );
}