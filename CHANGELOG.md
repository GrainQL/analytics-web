# Changelog

All notable changes to the Grain Analytics Web SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-08

### Added
- **Event Batching Limits**: New `maxEventsPerRequest` configuration option to limit events per API request
- **Automatic Event Chunking**: Large event batches are automatically split into chunks (default: 160 events max)
- **Sequential Processing**: Event chunks are sent sequentially to maintain proper event ordering
- **Backend Compliance**: Ensures no single request exceeds backend limits

### Changed
- **Payload Structure**: Removed auto-generated fields (`insertId`, `eventTs`, `eventDate`) from client payload - now handled by backend
- **Event Processing**: Enhanced flush logic to handle large batches with automatic chunking
- **Page Unload Handling**: Updated beacon API usage to respect event limits during page exit

### Technical Details
- Default `maxEventsPerRequest` set to 160 events
- Maintains backward compatibility - no breaking changes to existing API
- Events maintain their original order across multiple chunked requests
- All event handlers (auto-flush, manual flush, page unload) respect the new limits

## [1.0.1] - 2025-08-15

### Added
- Initial release of @grain-analytics/web SDK
- Zero-dependency TypeScript SDK for analytics event tracking
- Multiple authentication strategies:
  - NONE: No authentication required
  - SERVER_SIDE: Secret key authentication with `Authorization: Chase {SECRET}` header
  - JWT: Token-based authentication with configurable auth providers
- Automatic event batching with configurable batch size and flush intervals
- Robust error handling with exponential backoff retry logic
- Beacon API support for reliable event delivery on page exit
- Cross-platform compatibility (browsers, Node.js, React Native)
- Multiple build outputs:
  - ESM: `dist/index.mjs`
  - CommonJS: `dist/index.js`
  - IIFE: `dist/index.global.js` (exposes `window.Grain`)
  - TypeScript definitions: `dist/index.d.ts`
- Comprehensive documentation and examples
- React Hook examples for easy integration
- Auth provider examples for Auth0, NextAuth, Firebase, and custom JWT providers

### Features
- Event tracking with automatic batching
- User identification support
- Manual event flushing
- Debug logging mode
- Configurable retry attempts and delays
- Automatic page unload event sending via Beacon API
- Memory-efficient event queueing
- Graceful error handling and recovery

### API
- `createGrainAnalytics(config)` - Create analytics client
- `track(eventName, properties?, options?)` - Track events
- `identify(userId)` - Identify users
- `flush()` - Manually send queued events
- `destroy()` - Clean up resources

### Configuration Options
- `tenantId` (required) - Your Grain tenant identifier
- `apiUrl` - API base URL (default: 'https://api.grainql.com')
- `authStrategy` - Authentication strategy ('NONE', 'SERVER_SIDE', 'JWT')
- `secretKey` - Secret key for server-side auth
- `authProvider` - Token provider for JWT auth
- `batchSize` - Events per batch (default: 50)
- `flushInterval` - Auto-flush interval in ms (default: 5000)
- `retryAttempts` - Retry attempts for failed requests (default: 3)
- `retryDelay` - Base retry delay in ms (default: 1000)
- `debug` - Enable debug logging (default: false)

## [1.0.0] - 2025-08-15

### Added
- Initial release of @grain-analytics/web SDK
- Zero-dependency TypeScript SDK for analytics event tracking
- Multiple authentication strategies:
  - NONE: No authentication required
  - SERVER_SIDE: Secret key authentication with `Authorization: Chase {SECRET}` header
  - JWT: Token-based authentication with configurable auth providers
- Automatic event batching with configurable batch size and flush intervals
- Robust error handling with exponential backoff retry logic
- Beacon API support for reliable event delivery on page exit
- Cross-platform compatibility (browsers, Node.js, React Native)
- Multiple build outputs:
  - ESM: `dist/index.mjs`
  - CommonJS: `dist/index.js`
  - IIFE: `dist/index.global.js` (exposes `window.Grain`)
  - TypeScript definitions: `dist/index.d.ts`
- Comprehensive documentation and examples
- React Hook examples for easy integration
- Auth provider examples for Auth0, NextAuth, Firebase, and custom JWT providers

### Features
- Event tracking with automatic batching
- User identification support
- Manual event flushing
- Debug logging mode
- Configurable retry attempts and delays
- Automatic page unload event sending via Beacon API
- Memory-efficient event queueing
- Graceful error handling and recovery

### API
- `createGrainAnalytics(config)` - Create analytics client
- `track(eventName, properties?, options?)` - Track events
- `identify(userId)` - Identify users
- `flush()` - Manually send queued events
- `destroy()` - Clean up resources

### Configuration Options
- `tenantId` (required) - Your Grain tenant identifier
- `apiUrl` - API base URL (default: 'https://api.grainql.com')
- `authStrategy` - Authentication strategy ('NONE', 'SERVER_SIDE', 'JWT')
- `secretKey` - Secret key for server-side auth
- `authProvider` - Token provider for JWT auth
- `batchSize` - Events per batch (default: 50)
- `flushInterval` - Auto-flush interval in ms (default: 5000)
- `retryAttempts` - Retry attempts for failed requests (default: 3)
- `retryDelay` - Base retry delay in ms (default: 1000)
- `debug` - Enable debug logging (default: false)
