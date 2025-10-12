# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-12

### Added

#### React Hooks Package
- **React Hooks Integration**: New `@grainql/analytics-web/react` subpath export provides seamless React integration
- **GrainProvider Component**: Context provider supporting two patterns:
  - Provider-managed: Pass `config` prop for automatic client lifecycle management
  - External client: Pass `client` prop for fine-grained control
- **useConfig() Hook**: Cache-first configuration access with automatic background refresh and live updates
  - Returns cached/default values immediately
  - Fetches fresh data in background
  - Auto-updates components when configuration changes
  - Includes `isRefreshing`, `error`, and `refresh()` function
- **useAllConfigs() Hook**: Get all configurations as a reactive object
- **useTrack() Hook**: Returns stable, memoized track function that prevents unnecessary re-renders
- **useGrainAnalytics() Hook**: Access full client instance from context for advanced operations

#### Documentation
- Comprehensive React Hooks documentation in README with real-world examples
- New `REACT_HOOKS.md` architecture documentation
- Added `examples/react-hooks-example.tsx` with 10 complete usage examples

#### Testing
- Complete test suite for React hooks in `tests/react/`
- Tests for provider lifecycle, hook behavior, cache strategies, and listener cleanup

#### Build System
- Separate React build pipeline with ESM and CommonJS outputs
- Subpath exports configuration in `package.json`
- React as optional peer dependency (won't be bundled for non-React users)

### Changed
- React is now an optional peer dependency (>=16.8.0)
- Build process updated to compile React package separately

### Technical Details
- Zero additional dependencies for React package
- Tree-shakeable: Non-React users won't bundle React code
- Full TypeScript support with exported types for all hooks and components
- Build outputs: `dist/react/index.mjs` (ESM), `dist/react/index.js` (CJS), `dist/react/index.d.ts` (Types)

### Migration Guide
This is a major version bump due to the addition of React hooks and build system changes, but it's **fully backwards compatible** with v1.x. Existing code will continue to work without any changes.

To use the new React hooks:
```bash
npm install @grainql/analytics-web@2.0.0
```

```tsx
import { GrainProvider, useConfig, useTrack } from '@grainql/analytics-web/react';

function App() {
  return (
    <GrainProvider config={{ tenantId: 'your-tenant-id' }}>
      <YourApp />
    </GrainProvider>
  );
}

function YourComponent() {
  const { value } = useConfig('hero_variant');
  const track = useTrack();
  
  return <button onClick={() => track('clicked')}>Click</button>;
}
```

## [1.7.4] - Previous Release

### Features
- Critical bugfixes
- New userId system
- Anonymous remote config support
- Comprehensive set of built-in functions
- Template events for common use cases
- Multiple authentication strategies (NONE, SERVER_SIDE, JWT)
- Automatic event batching and retry logic
- Remote configuration management with caching
- User property management
- Global user ID tracking
- Persistent anonymous user IDs

---

[2.0.0]: https://github.com/GrainQL/analytics-web/releases/tag/v2.0.0
[1.7.4]: https://github.com/GrainQL/analytics-web/releases/tag/v1.7.4

