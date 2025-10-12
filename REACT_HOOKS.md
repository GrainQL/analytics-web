# Grain Analytics React Hooks

## Overview

The Grain Analytics SDK now includes a complete React hooks package that provides seamless integration for React applications. The hooks eliminate boilerplate code and provide a superior developer experience for configuration management and event tracking.

## Architecture

- **Single Package**: Everything is included in `@grainql/analytics-web` using subpath exports
- **Zero Additional Dependencies**: React is an optional peer dependency
- **Tree-Shakeable**: Non-React users won't bundle React code
- **Fully Typed**: Complete TypeScript support for all hooks and components

## Import Paths

```typescript
// Core SDK
import { GrainAnalytics } from '@grainql/analytics-web';

// React Hooks
import { GrainProvider, useConfig, useTrack } from '@grainql/analytics-web/react';
```

## Components & Hooks

### GrainProvider
Context provider supporting two patterns:
- **Provider-managed**: Pass `config` prop (recommended for most cases)
- **External client**: Pass `client` prop (advanced use cases)

### useConfig(key, options?)
Cache-first configuration access with:
- Instant synchronous access to cached/default values
- Background refresh for fresh data
- Automatic updates when config changes
- Manual refresh function

### useAllConfigs(options?)
Get all configurations as a reactive object with the same benefits as `useConfig`.

### useTrack()
Returns a stable, memoized track function that:
- Prevents unnecessary re-renders
- Is safe to pass to child components
- Works with all event tracking features

### useGrainAnalytics()
Access the full client instance for advanced operations like:
- User identification
- Setting user properties
- Manual flushes
- Direct API access

## Benefits

1. **Reduced Boilerplate**: No need for manual state management, listeners, or effects
2. **Cache-First Strategy**: Instant UI updates with background data fetching
3. **Automatic Updates**: Components re-render when configs change
4. **Type Safety**: Full TypeScript support with inference
5. **Performance**: Optimized with React.memo, useCallback, and proper deps
6. **Developer Experience**: Intuitive API that follows React patterns

## Use Cases

- **A/B Testing**: Dynamic component variants based on config
- **Feature Flags**: Conditional rendering based on feature toggles
- **Personalization**: User-specific content based on properties
- **Event Tracking**: Seamless analytics integration
- **Configuration Dashboard**: Real-time config management UI

## Build Output

The React package is compiled to:
- `dist/react/index.mjs` - ESM format
- `dist/react/index.js` - CommonJS format
- `dist/react/index.d.ts` - TypeScript definitions

All hooks and nested modules are also available with their own entry points.

## Testing

Comprehensive test suite includes:
- Provider lifecycle tests
- Hook behavior tests
- Cache and refresh tests
- Listener cleanup tests
- Type safety tests

## Documentation

- Full API documentation in README.md
- Real-world examples in examples/react-hooks-example.tsx
- TypeScript types exported for all interfaces

## Future Enhancements

Potential additions (based on user feedback):
- React Server Components support
- Suspense integration for config loading
- DevTools integration for debugging
- React Native optimizations

