# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grain Analytics Web SDK - a lightweight, privacy-first TypeScript SDK for analytics and remote configuration. Zero runtime dependencies, ~7KB gzipped. Supports browser, Node.js, and React Native.

## Commands

```bash
# Build (generates ESM, CJS, IIFE, React, and types in dist/)
npm run build

# Test
npm test                          # Run all tests
npm run test:watch               # Watch mode
npx jest tests/core.test.ts      # Single test file
npx jest -t "should initialize"  # Test by name pattern

# Size analysis (enforced limits: IIFE 6KB gzipped, ESM 12KB)
npm run size:limit

# Development
npm run watch                    # Rebuild on src changes
npm run dev:mini-app            # Run Next.js demo app
```

No ESLint/Prettier configured - formatting relies on IDE defaults.

## Architecture

### Core SDK (`src/index.ts`)
The main `GrainAnalytics` class (~2500 lines) handles:
- Event tracking with automatic batching and retry (exponential backoff)
- User identification (login/logout, session management)
- Remote configuration management
- Consent management delegation

### Modular Managers
Each feature is a separate module instantiated by the core SDK:
- **ConsentManager** (`consent.ts`) - Three privacy modes: `cookieless` (default, no consent needed), `gdpr-strict`, `gdpr-opt-out`
- **IdManager** (`id-manager.ts`) - UUID generation, session/permanent ID persistence
- **ActivityDetector** (`activity.ts`) - Mouse, keyboard, scroll activity monitoring
- **HeartbeatManager** (`heartbeat.ts`) - Periodic heartbeat tracking
- **PageTrackingManager** (`page-tracking.ts`) - Auto page view events
- **SectionTrackingManager** (`section-tracking.ts`) - IntersectionObserver-based visibility tracking
- **InteractionTrackingManager** (`interaction-tracking.ts`) - Click tracking
- **HeatmapTrackingManager** (`heatmap-tracking.ts`) - Click heatmaps + scroll depth
- **AttentionQualityManager** (`attention-quality.ts`) - Ensures genuine user attention

### React Integration (`src/react/`)
- **GrainProvider** - Context provider supporting two patterns: pass existing client OR let provider create one
- **Hooks**: `useGrainAnalytics`, `useTrack`, `useConfig`, `useAllConfigs`, `useConsent`, `usePrivacyPreferences`, `useDataDeletion`
- **Components**: `ConsentBanner`, `PrivacyPreferenceCenter`, `CookieNotice`

### Build Outputs
```
dist/
├── index.mjs          # ESM
├── index.js           # CommonJS
├── index.global.js    # IIFE (browser global as window.Grain)
├── index.d.ts         # Types
└── react/             # React-specific builds
```

## Key Patterns

- **Factory function**: Use `createGrainAnalytics()` not `new GrainAnalytics()`
- **Privacy-first**: Cookieless by default with daily rotating session IDs
- **Event batching**: Events queue and auto-flush on interval or size threshold
- **TypeScript strict mode**: All code must pass strict type checking

## Testing

Tests use Jest with jsdom. Test tenant: `grain-test-lab` (real API integration in some tests).

Setup file `tests/setup.ts` mocks IntersectionObserver and cleans localStorage/sessionStorage between tests.
