# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-10-21

### Added

#### Strict GDPR Compliance for Opt-in Mode
- **Ephemeral-Only Tracking**: Opt-in mode now uses ONLY ephemeral session IDs (memory-only JavaScript variables) until consent is granted
- **No Persistent Storage Without Consent**: Eliminates all cookies and localStorage identifiers in opt-in mode before consent
- **Consent Upgrade Flow**: Seamless transition from ephemeral to persistent IDs when consent is granted
- **Consent Mapping Event**: `_grain_consent_granted` event automatically tracks the mapping between ephemeral and persistent user IDs

#### Functional/Essential Purpose Exceptions
- **Explicit User Identification**: When users are identified via `identify()` or `login()`, persistent IDs are allowed (functional purpose)
- **JWT Authentication Support**: JWT auth strategy allows persistent IDs as they're essential for authentication
- **Remote Config Caching**: Config cache continues to use localStorage (functional purpose for sticky configurations)
- **Consent Preferences Storage**: Consent choices stored in localStorage (necessary for compliance)

#### Helper Methods & Utilities
- **`shouldAllowPersistentStorage()`**: Centralized GDPR compliance logic checking consent, mode, user identification, and auth strategy
- **Enhanced `handleConsentGranted()`**: Automatically initializes persistent IDs after consent is granted
- **GDPR Compliance Comments**: Comprehensive code documentation explaining compliance decisions

### Changed

#### Core Behavior Updates
- **`initializePersistentAnonymousUserId()`**: Now checks GDPR compliance before loading/creating persistent IDs
- **`savePersistentAnonymousUserId()`**: Respects opt-in mode and skips saving without proper authorization
- **`setUserId()`**: Uses GDPR-compliant save method instead of direct localStorage access
- **System Event Tracking**: Uses ephemeral session IDs in opt-in mode without consent

### Technical Details

#### Opt-in Mode Without Consent
- ✅ Ephemeral session ID (JavaScript memory variable only)
- ✅ Basic page views and heartbeat events  
- ✅ Remote config cache (functional)
- ✅ Consent preferences (necessary)
- ❌ No cookies
- ❌ No localStorage for user identifiers
- ❌ No persistent cross-session tracking
- ❌ No personal information

#### Opt-in Mode With Consent
- ✅ Persistent user ID (localStorage/cookie)
- ✅ Full tracking with all features
- ✅ Cross-session tracking enabled
- ✅ Enhanced event properties

#### Compliance
- **GDPR Article 6**: Legitimate interest for functional storage
- **GDPR Article 7**: Clear consent mechanism
- **ePrivacy Directive**: No cookies without consent
- **Data Minimization**: Minimal data collection by default

### Migration Notes

This is a **backward compatible** update. Existing opt-out and disabled modes continue to work exactly as before. The changes only affect opt-in mode behavior to ensure strict GDPR compliance.

## [2.1.3] - 2025-10-20

### Fixed
- Next.js SSR compatibility: Guarded all browser-only APIs with `typeof window !== 'undefined'`
  - `startFlushTimer()` uses browser check to avoid `window is not defined`
  - `startConfigRefreshTimer()` guarded for server environments
  - Cookie `secure` flag now checks `window.location` safely
- Mini-app hydration: corrected provider usage and client-only state initialization with `useEffect`

### Changed
- Onboarding snippets updated to correct APIs and use proper Shiki-based code highlighting

## [2.1.2] - 2025-10-18

### Added

#### Heartbeat Tracking Enhancement
- **Page Load Heartbeat**: Heartbeat events are now automatically sent when the page finishes loading, in addition to periodic heartbeats
- **Heartbeat Type Differentiation**: Added `heartbeat_type` property to distinguish between `'page_load'` and `'periodic'` heartbeats
- **Consent-Aware Page Load Tracking**: Page load heartbeats respect consent settings and use appropriate user IDs (ephemeral vs persistent)

### Changed
- **Heartbeat Behavior**: HeartbeatManager now sends an initial heartbeat on page load completion, providing immediate session tracking
- **Event Properties**: Page load heartbeats exclude duration and event count metrics (since they're the first heartbeat)

### Technical Details
- **Automatic Detection**: Uses `document.readyState` and `load` event to detect page completion
- **Non-Browser Support**: Gracefully handles non-browser environments by sending heartbeat immediately
- **Backward Compatible**: Existing periodic heartbeat functionality remains unchanged

## [2.1.0] - 2025-10-18

### Added

#### Privacy & GDPR Compliance System
- **Consent Management**: Configurable consent modes (opt-in, opt-out, disabled) with event queueing
- **Cookie Support**: Optional first-party cookies with configurable options (domain, sameSite, secure, maxAge)
- **Data Minimization**: IP anonymization, property whitelisting, and automatic property controls
- **Consent Methods**: `grantConsent()`, `revokeConsent()`, `getConsentState()`, `hasConsent()`
- **Privacy-Safe Mode**: No tracking or storage until explicit consent granted

#### Automatic Tracking Features
- **Heartbeat Tracking**: Session activity monitoring (2min active, 5min inactive intervals)
- **Auto Page View Tracking**: Framework-agnostic navigation detection with query param stripping
- **Consent-Aware Behavior**: Minimal tracking before consent, full tracking after consent
- **Ephemeral Sessions**: Memory-only session IDs for pre-consent tracking
- **Consent Upgrade Flow**: Automatic linking of pre/post-consent data

#### React Privacy Components
- **ConsentBanner**: Glassmorphic consent popup with themes and positions
- **PrivacyPreferenceCenter**: Detailed preference management with category toggles
- **Privacy Hooks**: `useConsent()`, `usePrivacyPreferences()`, `useDataDeletion()`

#### Backend Privacy API
- **Privacy Settings**: Tenant-configurable consent modes, data retention, and privacy policies
- **Data Management**: User data deletion, anonymization, and export endpoints
- **Consent Audit**: Complete audit trail of consent changes for compliance
- **Data Retention**: Configurable auto-deletion policies (7-365 days)

### Changed
- **Default Behavior**: Opt-out mode enabled by default (tracking allowed, easy opt-out)
- **Session Tracking**: Enhanced with automatic heartbeat and page view detection
- **Privacy Compliance**: Built-in GDPR/CCPA compliance features

### Technical Details
- **Framework Support**: Automatic tracking works with React, Vue, Next.js, and vanilla JS
- **Privacy-First**: Minimal data collection before consent, full features after consent
- **Performance**: Debounced activity detection and efficient event batching
- **Compliance**: Legitimate interest justification for minimal tracking

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

[2.1.3]: https://github.com/GrainQL/analytics-web/releases/tag/v2.1.3
[2.1.2]: https://github.com/GrainQL/analytics-web/releases/tag/v2.1.2
[2.1.0]: https://github.com/GrainQL/analytics-web/releases/tag/v2.1.0
[2.0.0]: https://github.com/GrainQL/analytics-web/releases/tag/v2.0.0
[1.7.4]: https://github.com/GrainQL/analytics-web/releases/tag/v1.7.4