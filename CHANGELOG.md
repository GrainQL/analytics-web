# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.4] - 2025-11-30

### Fixed
- **UTM Parameter Enrichment**: Fixed critical issue where custom events (signup, purchase, etc.) were not automatically enriched with UTM parameters and attribution data
- **Matrix Analysis Attribution**: Matrices analyzing custom events by utm_source/utm_campaign now properly show attribution data instead of "Unknown"
- **Automatic Property Propagation**: All custom events now automatically include session-level UTM parameters, first-touch attribution, and session_id when consent is granted
- **Event Tracking Consistency**: System events continue to manage their own properties while custom events benefit from automatic enrichment

### Technical Details
- Enhanced `formatEvent()` method to automatically enrich all non-system events with session attribution properties
- UTM parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content) now propagate from page_view to all subsequent events
- First-touch attribution properties (first_touch_source, first_touch_medium, first_touch_campaign, first_touch_referrer_category) automatically added
- Session ID automatically included for event correlation
- Backend matrix dimension extractors already properly configured to read these properties from ClickHouse

## [2.5.3] - 2025-11-25

### Fixed
- **Section Tracking**: Added 3-second split duration to prevent event loss when users view sections for extended periods
- **Beacon API Format**: Fixed 400 error on navigation by sending events array directly (not wrapped in object) to match API expectation
- **Navigation Click Tracking**: Added immediate flush for navigation link clicks to ensure events are sent before page unload
- **Authenticated Beacon Requests**: Updated beacon API to skip for authenticated requests (beacon doesn't support headers) and use fetch with keepalive instead

## [2.5.2] - 2025-11-25

### Fixed
- **XPath Selector Parsing**: Fixed XPath evaluation error by stripping `xpath=` prefix from Stagehand selectors
- **Interaction Tracking**: Resolved "cannot be converted to the desired type" error in interaction tracking
- **Section Tracking**: Applied same XPath prefix fix to section tracking for consistency

## [2.5.1] - 2025-11-25

### Fixed
- **Auto-Tracking Initialization**: Fixed issue where SDK did not fetch auto-tracking configurations from backend
- **Remote Config Request**: Added missing `currentUrl` field to `RemoteConfigRequest` interface
- **Debug Logging**: Enhanced initialization logging to help diagnose auto-tracking setup issues
- **Manager Setup**: Improved auto-tracking manager initialization with better error visibility

## [2.5.0] - 2025-11-25

### Added

#### Auto-Tracking System
- **Automatic Interaction Tracking**: SDK automatically attaches click and focus listeners to detected interactive elements using XPath selectors
- **Intelligent Section Tracking**: Scroll-based section visibility tracking with viewport metrics, scroll depth, and engagement analysis
- **Smart Event Sanitization**: Filters rapid scrolling and short dwell times to prevent noisy data
- **Event Batching**: Section view events are batched and sent efficiently to reduce API calls
- **Dynamic Content Support**: MutationObserver handles dynamically added elements automatically

### Technical Details
- **InteractionTrackingManager**: XPath-based element detection with caching and dynamic content handling
- **SectionTrackingManager**: IntersectionObserver-based visibility tracking with scroll velocity analysis
- **Remote Config Integration**: Auto-tracking configurations fetched automatically from remote config API
- **Performance Optimized**: Passive event listeners, debounced handlers, and lazy module loading

## [2.4.0] - 2025-10-27

### Added

#### Privacy-First Country Detection
- **Timezone-Based Country Mapping**: Client-side country detection using IANA timezone data (no IP tracking)
- **TIMEZONE_TO_COUNTRY Map**: Comprehensive mapping of 150+ timezones to ISO 3166-1 alpha-2 country codes
- **getCountryFromTimezone()**: Public API for converting timezone to country code

### Changed

#### Privacy Improvements
- **Removed IP Geolocation**: Eliminated server-side IP-to-country lookups to third-party APIs
- **Client-Side Detection**: Country is now derived from user's timezone setting (privacy-friendly)

### Technical Details
- **Timezone Mapping**: Added `timezone-country.ts` with extensive timezone-to-country mappings
- **Page View Events**: Now include `country` property derived from timezone
- **Backward Compatibility**: No breaking changes, country detection is automatic

## [2.3.1] - 2025-10-27

### Added

#### User Context Dimensions
- **Server-Side Country Detection**: The backend now automatically enriches events with country information using IP geolocation
- **Cross-Event Dimension Analysis**: User context dimensions (country, device, browser, os, language, timezone) are now queryable across all events, not just page_view events
- **Smart Dimension Fallback**: When analyzing events that don't log device/location properties, the backend automatically derives them from the user's most recent page_view event

### Changed

#### Matrix Analytics Improvements
- **User Context Query Logic**: Matrix queries now use intelligent fallback to derive user dimensions from page_view events
- **Country Dimension**: Now populated server-side via IP geolocation (no client-side changes required)
- **Enhanced Dimension Support**: Device, browser, OS, language, and timezone dimensions now work seamlessly across all event types in matrix analysis

### Technical Details
- **GeoIP Service**: Added server-side IP geolocation service for country detection
- **Dimension Extraction**: Enhanced ClickHouse queries with subquery fallback for user-context dimensions
- **Event Enrichment**: EventPublisherController now enriches events with country data from client IP address

## [2.3.0] - 2025-10-27

### Added

#### Enhanced Matrix Analytics Support
- **Device Type Detection**: Added `device` property (Mobile/Tablet/Desktop) to page_view and session_start events
- **Session Duration Tracking**: Added `session_duration` property (in seconds) to session_end events for better analytics
- **Pages Per Session**: Added `pages_per_session` property to session_end events for engagement analysis
- **Backward Compatibility**: Maintained existing property names (`duration`, `page_count`) for seamless migration

#### Matrix Dimension Support
- **Session Duration Bucketing**: Backend now properly buckets session duration into meaningful ranges (< 30s, 30-60s, 1-3m, 3-5m, 5-10m, 10-30m, > 30m)
- **Pages Per Session Bucketing**: Backend buckets page counts into user-friendly ranges (1 page, 2 pages, 3 pages, 4-5 pages, 6-10 pages, > 10 pages)
- **Full Matrix Template Compatibility**: All 23 pre-built matrix templates now work seamlessly with SDK logging and backend queries

### Technical Details
- **Device Detection**: Uses user agent parsing and viewport width for accurate device type classification
- **Session Analytics**: Enhanced session tracking with duration and page count metrics
- **Matrix Integration**: Complete compatibility between frontend templates, SDK logging, and backend dimension extraction

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

[2.5.0]: https://github.com/GrainQL/analytics-web/releases/tag/v2.5.0
[2.4.0]: https://github.com/GrainQL/analytics-web/releases/tag/v2.4.0
[2.1.3]: https://github.com/GrainQL/analytics-web/releases/tag/v2.1.3
[2.1.2]: https://github.com/GrainQL/analytics-web/releases/tag/v2.1.2
[2.1.0]: https://github.com/GrainQL/analytics-web/releases/tag/v2.1.0
[2.0.0]: https://github.com/GrainQL/analytics-web/releases/tag/v2.0.0
[1.7.4]: https://github.com/GrainQL/analytics-web/releases/tag/v1.7.4