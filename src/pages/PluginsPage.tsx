import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BasePlugin } from '@/plugins/components/BasePlugin';
import type { PluginMetadata } from '@/plugins/types/plugin.types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Puzzle } from 'lucide-react';

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

const pluginOptions: PluginMetadata[] = [demoMetadata];

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
  const [selectedPlugin, setSelectedPlugin] = useState<PluginMetadata | null>(demoMetadata);

  const metadataTemplateString = useMemo(
    () => JSON.stringify(metadataTemplate, null, 2),
    []
  );

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-xl">Plugins</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Load plugin bundles on demand. Click the demo plugin below to fetch its metadata and JavaScript bundle, then render it inside the portal with the BasePlugin wrapper.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pluginOptions.map((plugin) => (
          <Card key={plugin.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{plugin.title}</CardTitle>
                  <CardDescription>{plugin.description}</CardDescription>
                </div>
                <Badge variant="secondary">{plugin.version}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{plugin.createdBy}</Badge>
                <Badge variant="outline">Bundle: {plugin.jsPath}</Badge>
              </div>
              <Button onClick={() => setSelectedPlugin(plugin)} size="sm">
                Load demo plugin
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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

      <Separator />

      {selectedPlugin && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Plugin preview</h3>
            <p className="text-sm text-muted-foreground">Using BasePlugin to mount the selected bundle.</p>
          </div>
          <BasePlugin metadata={selectedPlugin} />
        </div>
      )}
    </div>
  );
}
