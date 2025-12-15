import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Puzzle, ExternalLink, Server } from 'lucide-react';
import { PluginMetadata } from '@/plugins/types/plugin.types';
import { BasePlugin } from '@/plugins/components/BasePlugin';

const demoMetadata: PluginMetadata = {
  id: 'demo-plugin',
  name: 'demo-plugin',
  title: 'Demo Plugin',
  description: 'A lightweight demo showing how plugins can be loaded dynamically from a JS bundle.',
  createdBy: 'Portal Team',
  version: '1.0.0',
  componentPath: 'DemoPlugin',
  jsPath: '/plugins/demo-plugin.js',
  bundleUrl: '/plugins/demo-plugin.js',
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const pluginOptions: PluginMetadata[] = [
  demoMetadata
];

const metadataTemplate = {
  id: 'string',
  created_by: 'string',
  name: 'string',
  title: 'string',
  description: 'string',
  component_path: 'string',
  js_path: 'string',
  version: 'string (optional)',
  icon: 'string (optional)',
};

export default function PluginsPage() {
  const [selectedPlugin, setSelectedPlugin] = useState<PluginMetadata | null>(null);
  const [customBundleUrl, setCustomBundleUrl] = useState('');
  const [customBackendUrl, setCustomBackendUrl] = useState('');
  const [customPluginMetadata, setCustomPluginMetadata] = useState<PluginMetadata | null>(null);
  const [backendProxyActive, setBackendProxyActive] = useState(false);

  const metadataTemplateString = useMemo(
    () => JSON.stringify(metadataTemplate, null, 2),
    []
  );

  const handleLoadCustomPlugin = () => {
    if (!customBundleUrl.trim()) {
      return;
    }

    // Create temporary metadata for the custom plugin
    const tempMetadata: PluginMetadata = {
      id: `custom-plugin-${Date.now()}`,
      name: 'custom-plugin',
      title: 'Custom Plugin Preview',
      description: 'Plugin loaded from custom bundle URL',
      createdBy: 'Developer',
      version: '1.0.0',
      componentPath: 'CustomPlugin',
      jsPath: customBundleUrl,
      bundleUrl: customBundleUrl,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add custom backend URL if provided
      ...(customBackendUrl.trim() && { backendUrl: customBackendUrl.trim() })
    };

    setCustomPluginMetadata(tempMetadata);
    setSelectedPlugin(null);
    
    // Set backend proxy flag if backend URL is provided
    if (customBackendUrl.trim()) {
      setBackendProxyActive(true);
      // Store backend URL in sessionStorage for the API client to use
      sessionStorage.setItem('plugin-backend-proxy', customBackendUrl.trim());
    } else {
      setBackendProxyActive(false);
      sessionStorage.removeItem('plugin-backend-proxy');
    }
  };

  const handleClearCustomPlugin = () => {
    setCustomPluginMetadata(null);
    setCustomBundleUrl('');
    setCustomBackendUrl('');
    setBackendProxyActive(false);
    sessionStorage.removeItem('plugin-backend-proxy');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-xl">Plugins</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Load plugin bundles on demand. Click a plugin below to fetch its metadata and JavaScript bundle, then render it inside the portal with the BasePlugin wrapper.
        </p>
      </div>

      {/* Custom Plugin Preview Section */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            <CardTitle className="text-lg">Test Your Plugin</CardTitle>
          </div>
          <CardDescription>
            Enter the URLs to your local plugin bundle and backend service to preview before registering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plugin Bundle URL */}
          <div className="space-y-2">
            <Label htmlFor="customBundleUrl" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              Plugin Bundle URL
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customBundleUrl"
              type="url"
              placeholder="e.g., http://localhost:8000/plugin.js"
              value={customBundleUrl}
              onChange={(e) => setCustomBundleUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLoadCustomPlugin();
                }
              }}
            />
          </div>

          {/* Backend URL (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="customBackendUrl" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Plugin Backend URL
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="customBackendUrl"
              type="url"
              placeholder="e.g., http://localhost:4000"
              value={customBackendUrl}
              onChange={(e) => setCustomBackendUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLoadCustomPlugin();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              If your plugin needs backend APIs, enter your local backend server URL. 
              API calls via <code className="bg-muted px-1 py-0.5 rounded">context.apiClient</code> will be proxied to this server.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleLoadCustomPlugin} disabled={!customBundleUrl.trim()}>
              Load Plugin
            </Button>
            {customPluginMetadata && (
              <Button onClick={handleClearCustomPlugin} variant="outline">
                Clear
              </Button>
            )}
          </div>

          {/* Status Messages */}
          {customPluginMetadata && (
            <div className="space-y-2">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  ✓ Plugin bundle loaded from: <code className="text-xs break-all">{customBundleUrl}</code>
                </p>
              </div>
              {backendProxyActive && customBackendUrl && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    ✓ Backend proxy active: <code className="text-xs break-all">{customBackendUrl}</code>
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    API calls will be proxied to this backend server
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Registered plugins */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Registered Plugins</h3>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {pluginOptions.map((plugin) => (
            <Card 
              key={plugin.id}
              className={`hover:shadow-md transition-shadow ${
                selectedPlugin?.id === plugin.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold leading-tight">
                    {plugin.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {plugin.version}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <CardDescription className="text-xs line-clamp-2">
                  {plugin.description}
                </CardDescription>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {plugin.createdBy}
                  </Badge>
                </div>
                <Button 
                  onClick={() => {
                    setSelectedPlugin(plugin);
                    setCustomPluginMetadata(null);
                    setBackendProxyActive(false);
                    sessionStorage.removeItem('plugin-backend-proxy');
                  }}
                  size="sm"
                  className="w-full"
                  variant={selectedPlugin?.id === plugin.id ? 'default' : 'outline'}
                >
                  {selectedPlugin?.id === plugin.id ? 'Selected' : 'Load Plugin'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Plugin metadata shape - Hidden but code kept */}
      {false && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plugin metadata shape</CardTitle>
            <CardDescription>Example payload used to request the JS bundle.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64 rounded-md border bg-muted/30 p-4 text-xs">
              <pre className="whitespace-pre-wrap break-all font-mono">{metadataTemplateString}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Plugin Preview */}
      {(selectedPlugin || customPluginMetadata) && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Plugin preview</h3>
            <p className="text-sm text-muted-foreground">
              {customPluginMetadata 
                ? backendProxyActive 
                  ? 'Previewing custom plugin with backend proxy enabled'
                  : 'Previewing custom plugin from provided URL' 
                : 'Using BasePlugin to mount the selected bundle'
              }
            </p>
          </div>
          <BasePlugin metadata={customPluginMetadata || selectedPlugin} />
        </div>
      )}
    </div>
  );
}