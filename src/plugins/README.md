# Plugin System

A flexible, extensible plugin architecture that allows developers to create and integrate custom components into the Developer Portal.

## Overview

The plugin system enables developers to:
- Create custom React components as standalone plugins
- Build and host plugins independently
- Register plugins via the portal UI or API
- Access portal resources (theme, API client, utilities)
- Integrate seamlessly with the portal's design system

## Architecture

```
Portal
  └── BasePlugin (wrapper component)
      ├── PluginContainer (theme wrapper)
      ├── PluginHeader (title, metadata)
      ├── PluginBody (content area)
      │   ├── ErrorBoundary (crash protection)
      │   └── Your Plugin Component ← Loaded from bundle URL
      └── PluginApiClient (scoped API helper)
```

## Directory Structure

```
src/plugins/
├── types/
│   └── plugin.types.ts         # Core type definitions
├── examples/
│   └── DogBreedsPlugin.example.tsx  # Example plugin implementation
├── DEVELOPER_GUIDE.md          # Complete developer guide
└── README.md                   # This file
```

## Quick Start

### For Plugin Developers

1. **Read the Developer Guide**: Start with `DEVELOPER_GUIDE.md` for step-by-step instructions

2. **Copy the Example**: Use `examples/DogBreedsPlugin.example.tsx` as a template

3. **Key Requirements**:
   - Export a `PluginManifest` as default
   - Component must accept `PluginProps`
   - Build to ES module format
   - Host bundle on GitHub or CDN

4. **Register**: Submit plugin metadata with bundle URL to the portal

### For Portal Developers

The next implementation steps are:

1. **BasePlugin Component** (`src/plugins/components/BasePlugin.tsx`)
   - PluginContainer with theme wrapper
   - PluginHeader for title and metadata
   - PluginBody with error boundary
   - Integration with portal theme

2. **Plugin Loader** (`src/plugins/utils/pluginLoader.ts`)
   - Fetch bundle from URL
   - Parse and validate manifest
   - Handle loading states and errors
   - Security checks

3. **API Services** (`src/plugins/services/pluginApi.ts`)
   - CRUD operations for plugin metadata
   - Backend integration
   - React Query hooks

4. **Plugin Viewer** (`src/plugins/components/PluginViewer.tsx`)
   - Main component that loads and displays plugins
   - Plugin selection UI
   - Error handling and fallbacks

## Core Concepts

### Plugin Metadata

Stored in database, contains:
- Name, description, version, author
- Bundle URL (where compiled JS lives)
- Category, tags, icon
- Configuration schema
- Enable/disable status

### Plugin Context

Portal provides plugins with:
- **Theme**: Current theme mode and colors
- **API Client**: Helper for `/api/plugins/:id/*` calls
- **Metadata**: Plugin's own information
- **Utils**: Toast notifications, navigation

### Plugin Lifecycle

1. **Registration** → Metadata saved to DB
2. **Loading** → Bundle fetched from URL
3. **Validation** → Manifest checked
4. **Mounting** → Component rendered with context
5. **Runtime** → Plugin interacts via context API
6. **Unmounting** → Cleanup hooks called

## Type Definitions

All types are defined in `types/plugin.types.ts`:

- `PluginMetadata` - Database structure
- `PluginContext` - Portal resources provided to plugins
- `PluginProps` - Props received by plugin components
- `PluginManifest` - Required default export
- `PluginComponent` - Component type signature
- `PluginApiClient` - API helper interface

## Security Considerations

- Plugins are sandboxed via `<ErrorBoundary>`
- API calls scoped to `/api/plugins/:pluginId/*`
- Bundle URLs validated before loading
- CSP policies enforce safe script execution
- Version compatibility checks

## Example Plugin

See `examples/DogBreedsPlugin.example.tsx` for a complete working example that:
- Fetches data from Dog API
- Implements search and filtering
- Uses portal theme
- Handles loading and error states
- Shows proper TypeScript typing

## Integration Points

### Theme System
Plugins access theme via `context.theme`:
```typescript
const isDark = context.theme.mode === 'dark';
const primaryColor = context.theme.primaryColor;
```

### API Communication
Plugins use scoped API client:
```typescript
const data = await context.apiClient.get('users');
const result = await context.apiClient.post('data', { query: 'test' });
```

### User Notifications
Plugins show toasts:
```typescript
context.utils.toast('Success!', 'success');
context.utils.toast('Error occurred', 'error');
```

### Navigation
Plugins can navigate:
```typescript
context.utils.navigate('/projects');
```

## Best Practices

1. **Always handle errors** - Wrap API calls in try-catch
2. **Show loading states** - Never leave users guessing
3. **Use portal theme** - Maintain consistent appearance
4. **Be responsive** - Support mobile and desktop
5. **Optimize performance** - Lazy load, paginate, memoize
6. **Version properly** - Follow semantic versioning
7. **Document thoroughly** - Help users understand your plugin

## Development Workflow

```
Developer                          Portal
    │                                │
    ├─ Create plugin component      │
    ├─ Build ES module              │
    ├─ Push to GitHub               │
    ├─ Get bundle URL               │
    │                                │
    ├─── Register plugin ────────►  │
    │                               ├─ Save metadata to DB
    │                               ├─ Validate bundle URL
    │                               └─ Make available
    │                                │
User clicks plugin in portal        │
    │                               ├─ Fetch bundle
    │                               ├─ Load & validate
    │                               ├─ Inject context
    │                               └─ Render plugin
```

## Future Enhancements

Potential future features:
- Plugin marketplace UI
- Plugin ratings and reviews
- Automatic version updates
- Plugin dependencies
- Shared plugin libraries
- Plugin analytics
- A/B testing framework
- Plugin templates library

## Resources

- **Developer Guide**: `DEVELOPER_GUIDE.md` - Complete step-by-step guide
- **Example Plugin**: `examples/DogBreedsPlugin.example.tsx` - Working reference
- **Type Definitions**: `types/plugin.types.ts` - TypeScript interfaces
- **Portal Docs**: Main portal documentation for context

## Contributing

To add new example plugins:
1. Create new file in `examples/`
2. Follow the pattern of existing examples
3. Add comprehensive comments
4. Update this README

## Questions?

- Check `DEVELOPER_GUIDE.md` for detailed instructions
- Review example plugins for patterns
- Consult type definitions for contracts
- Reach out to the portal team

---

**Status**: Design Phase  
**Next Steps**: Implement BasePlugin component and plugin loader