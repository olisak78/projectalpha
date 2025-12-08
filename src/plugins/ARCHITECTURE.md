# Plugin System Architecture

## Overview

The plugin system enables developers to extend the Developer Portal with custom React components that integrate seamlessly with the portal's infrastructure. This document describes the architecture, design decisions, and implementation details.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Portal                         │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Plugin Management Layer                    │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │   │
│  │  │   Plugin     │  │   Plugin     │  │   Plugin    │ │   │
│  │  │   Registry   │→ │   Loader     │→ │   Runtime   │ │   │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │   │
│  │         ↑                  ↑                  ↓       │   │
│  │         │                  │                  │       │   │
│  │    [Database]         [GitHub/CDN]      [BasePlugin] │   │
│  └────────────────────────────────────────────────────────┘   │
│                                 ↓                              │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                   BasePlugin Wrapper                    │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │   │
│  │  │   Plugin     │  │   Plugin     │  │   Plugin    │ │   │
│  │  │  Container   │  │   Header     │  │    Body     │ │   │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │   │
│  │         ↓                  ↓                  ↓       │   │
│  │         └──────────────────┴──────────────────┘       │   │
│  │                            ↓                          │   │
│  │                  ┌────────────────────┐               │   │
│  │                  │  Plugin Component  │               │   │
│  │                  │  (User's React)    │               │   │
│  │                  └────────────────────┘               │   │
│  │                            ↓                          │   │
│  │                  ┌────────────────────┐               │   │
│  │                  │  PluginApiClient   │               │   │
│  │                  └────────────────────┘               │   │
│  └────────────────────────────────────────────────────────┘   │
│                                 ↓                              │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                  Portal Infrastructure                  │   │
│  │                                                         │   │
│  │  • Theme Context (Dark/Light)                          │   │
│  │  • React Query (Caching, State Management)             │   │
│  │  • Backend API (/api/plugins/:pluginId/*)              │   │
│  │  • Error Boundaries & Suspense                         │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Plugin Registry (Database)

**Responsibility:** Store plugin metadata and configuration

**Schema:**
```sql
CREATE TABLE plugins (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL,
  author VARCHAR(255) NOT NULL,
  bundle_url TEXT NOT NULL,
  icon VARCHAR(50),
  tags JSON,
  enabled BOOLEAN DEFAULT true,
  config JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoint:**
```
GET /api/plugins          # List all plugins
GET /api/plugins/:id      # Get single plugin
POST /api/plugins         # Create plugin
PUT /api/plugins/:id      # Update plugin
DELETE /api/plugins/:id   # Delete plugin
```

### 2. Plugin Loader

**Responsibility:** Dynamically load JavaScript bundles from URLs

**Implementation Approach:**
```typescript
async function loadPluginBundle(bundleUrl: string): Promise<PluginModule> {
  // Fetch the bundle
  const response = await fetch(bundleUrl);
  const code = await response.text();
  
  // Create a module scope
  const module = { exports: {} };
  const require = (name: string) => {
    // Provide React and other dependencies
    const dependencies = {
      'react': React,
      'react-dom': ReactDOM,
    };
    return dependencies[name];
  };
  
  // Execute the code
  const fn = new Function('module', 'exports', 'require', code);
  fn(module, module.exports, require);
  
  return module.exports as PluginModule;
}
```

**Caching Strategy:**
- Cache loaded bundles in memory
- Invalidate cache when plugin version changes
- Support force-reload for development

### 3. Plugin Runtime

**Responsibility:** Manage plugin lifecycle and context

**Lifecycle Phases:**
1. **Load Metadata** - Fetch from database
2. **Load Bundle** - Fetch JavaScript from URL
3. **Initialize** - Call optional `initialize()` function
4. **Render** - Mount React component
5. **Cleanup** - Call optional `cleanup()` function on unmount

**Context Creation:**
```typescript
const pluginContext: PluginContext = {
  metadata: pluginMetadata,
  apiClient: new PluginApiClient(pluginId),
  theme: {
    theme: currentTheme,
    actualTheme: resolvedTheme,
  },
  config: pluginMetadata.config,
};
```

### 4. BasePlugin Wrapper

**Responsibility:** Provide consistent UI and infrastructure

**Component Hierarchy:**
```tsx
<BasePlugin pluginId="my-plugin">
  <PluginContainer>
    <PluginHeader 
      title={metadata.name}
      description={metadata.description}
      icon={metadata.icon}
    />
    <PluginBody 
      isLoading={loading}
      error={error}
    >
      <ErrorBoundary>
        <Suspense fallback={<Skeleton />}>
          <PluginComponent context={context} />
        </Suspense>
      </ErrorBoundary>
    </PluginBody>
  </PluginContainer>
</BasePlugin>
```

**Features Provided:**
- Consistent theming (dark/light mode)
- Loading states (skeleton UI)
- Error handling (error boundaries)
- Standard layout (header, body, actions)

---

## Data Flow

### Loading a Plugin

```
1. User navigates to plugin page
   ↓
2. Portal fetches plugin metadata from database
   GET /api/plugins/:pluginId
   ↓
3. Portal loads plugin bundle from URL
   fetch(metadata.bundleUrl)
   ↓
4. Portal executes bundle and extracts component
   const PluginComponent = module.default
   ↓
5. Portal creates plugin context
   { metadata, apiClient, theme, config }
   ↓
6. Portal renders BasePlugin with component
   <BasePlugin><PluginComponent /></BasePlugin>
   ↓
7. Plugin component renders with access to context
```

### Plugin API Call

```
1. Plugin calls apiClient.get('data')
   ↓
2. PluginApiClient constructs URL
   /api/plugins/:pluginId/data
   ↓
3. Request sent to backend
   ↓
4. Backend routes to plugin-specific handler
   ↓
5. Response returned to plugin component
   ↓
6. Plugin updates UI with data
```

---

## Security Considerations

### 1. Bundle Validation

**Risks:**
- Malicious code execution
- XSS attacks
- Data exfiltration

**Mitigations:**
- Whitelist trusted bundle sources (GitHub, internal CDN)
- Content Security Policy (CSP) headers
- Sandbox iframes for untrusted plugins (future)
- Code review process for new plugins

### 2. API Access Control

**Risks:**
- Unauthorized data access
- Cross-plugin data leakage

**Mitigations:**
- Namespace all API calls by plugin ID
- Backend validates plugin ID in requests
- Rate limiting per plugin
- Authentication/authorization checks

### 3. Data Isolation

**Risks:**
- Plugins accessing other plugins' data
- Plugins modifying portal state

**Mitigations:**
- Each plugin gets isolated PluginApiClient
- No direct access to portal's React Query cache
- No access to other plugins' contexts

---

## Performance Considerations

### 1. Bundle Size

**Best Practices:**
- Keep bundles under 500KB
- Use tree-shaking and minification
- Externalize common dependencies (React, etc.)
- Lazy load heavy components

### 2. Loading Strategy

**Options:**
- **Eager:** Load all plugins on portal startup
- **Lazy:** Load plugins on-demand when navigated to
- **Prefetch:** Load plugins in background after portal loads

**Recommendation:** Lazy loading with optional prefetching

### 3. Caching

**Levels:**
- **Memory:** Keep loaded bundles in memory
- **Service Worker:** Cache bundles in browser
- **CDN:** Use CDN for bundle distribution
- **Versioned URLs:** Cache bust with version in URL

---

## Error Handling

### Error Boundary Strategy

```tsx
<ErrorBoundary
  fallback={(error) => (
    <PluginBody error={error} onRetry={() => reloadPlugin()} />
  )}
  onError={(error) => {
    logPluginError(pluginId, error);
    notifyAdmins(pluginId, error);
  }}
>
  <PluginComponent context={context} />
</ErrorBoundary>
```

### Error Types

1. **Metadata Errors**
   - Plugin not found in database
   - Invalid metadata format

2. **Bundle Errors**
   - Bundle URL unreachable
   - Invalid JavaScript syntax
   - Missing default export

3. **Runtime Errors**
   - Component threw exception
   - API call failed
   - Invalid data format

4. **Initialization Errors**
   - `initialize()` function failed
   - Missing required dependencies

---

## Testing Strategy

### Unit Tests

```typescript
describe('PluginApiClient', () => {
  it('should construct correct URLs', () => {
    const client = new PluginApiClient('test-plugin');
    expect(client.getBaseUrl()).toBe('/api/plugins/test-plugin');
  });
  
  it('should handle errors gracefully', async () => {
    // Mock failed response
    fetchMock.mockReject(new Error('Network error'));
    
    const client = new PluginApiClient('test-plugin');
    await expect(client.get('data')).rejects.toThrow('Network error');
  });
});
```

### Integration Tests

```typescript
describe('Plugin Loading', () => {
  it('should load and render plugin', async () => {
    // Mock plugin metadata API
    mockPluginMetadata({ id: 'test', bundleUrl: '...' });
    
    // Mock bundle fetch
    mockBundleFetch(() => TestPluginComponent);
    
    // Render BasePlugin
    render(<BasePlugin pluginId="test" />);
    
    // Verify plugin component rendered
    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

```typescript
test('complete plugin workflow', async ({ page }) => {
  // Navigate to plugins page
  await page.goto('/plugins');
  
  // Select plugin
  await page.click('[data-testid="plugin-test"]');
  
  // Verify plugin loaded
  await expect(page.locator('.plugin-container')).toBeVisible();
  
  // Interact with plugin
  await page.click('[data-testid="fetch-data"]');
  
  // Verify data displayed
  await expect(page.locator('.data-table')).toBeVisible();
});
```

---

## Future Enhancements

### Phase 2: Advanced Features

1. **Plugin Marketplace**
   - Browse and install plugins
   - Ratings and reviews
   - Version management

2. **Plugin SDK**
   - CLI tool for plugin creation
   - Local development server
   - Hot module reloading

3. **Plugin Communication**
   - Event bus for inter-plugin messaging
   - Shared state management
   - Plugin dependencies

4. **Enhanced Security**
   - Sandbox iframes
   - Permission system
   - Code signing

### Phase 3: Enterprise Features

1. **Plugin Analytics**
   - Usage tracking
   - Performance monitoring
   - Error reporting

2. **A/B Testing**
   - Feature flags per plugin
   - Gradual rollouts
   - User segmentation

3. **Multi-tenancy**
   - Organization-specific plugins
   - Private plugin repositories
   - Custom plugin catalogs

---

## Migration Guide

### From Monolithic to Plugin Architecture

If migrating existing features to plugins:

1. **Extract Component**
   ```tsx
   // Before: src/features/MyFeature.tsx
   export const MyFeature = () => { ... };
   
   // After: plugins/my-feature/src/MyFeaturePlugin.tsx
   const MyFeaturePlugin: React.FC<PluginComponentProps> = ({ context }) => {
     // Adapt to use context.apiClient, context.theme
   };
   export default MyFeaturePlugin;
   ```

2. **Update API Routes**
   ```typescript
   // Before: /api/my-feature/*
   app.get('/api/my-feature/data', handler);
   
   // After: /api/plugins/my-feature/*
   app.get('/api/plugins/my-feature/data', handler);
   ```

3. **Register Plugin**
   ```sql
   INSERT INTO plugins (id, name, ...) VALUES ('my-feature', ...);
   ```

4. **Remove Old Code**
   - Delete feature from portal codebase
   - Update navigation/routing
   - Remove feature-specific dependencies

---

## Contributing

### Adding New Base Components

1. Create component in `src/plugins/components/`
2. Export from `src/plugins/index.ts`
3. Document in `README.md`
4. Add tests

### Improving Plugin API

1. Update types in `src/plugins/types/`
2. Update implementation
3. Update documentation
4. Add migration guide if breaking

---

## References

- [Plugin Development Guide](./README.md)
- [Example Plugins](./examples/)
- [Type Definitions](./types/)
- [API Documentation](../docs/api/)