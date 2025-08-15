# @grain-analytics/web

A lightweight, dependency-free TypeScript SDK for sending analytics events to Grain's REST API with automatic batching, retry logic, and reliable event delivery.

## Features

- 🚀 **Zero dependencies** - Tiny bundle size
- 📦 **Automatic batching** - Efficient event queueing and bulk sending
- 🔄 **Retry logic** - Exponential backoff for failed requests
- 📡 **Beacon API** - Reliable event delivery on page exit
- 🔐 **Multiple auth strategies** - NONE, server-side, and JWT support
- 📱 **Cross-platform** - Works in browsers, Node.js, and React Native
- 🎯 **TypeScript first** - Full type safety out of the box

## Installation

```bash
npm install @grain-analytics/web
```

## Quick Start

### Basic Usage (No Authentication)

```typescript
import { createGrainAnalytics } from '@grain-analytics/web';

const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  authStrategy: 'NONE'
});

// Track an event
grain.track('page_view', {
  page: '/home',
  referrer: document.referrer
});

// Track with user ID
grain.track('button_click', {
  button: 'signup',
  userId: 'user123'
});
```

### Server-Side Authentication

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  authStrategy: 'SERVER_SIDE',
  secretKey: 'your-secret-key'
});
```

### JWT Authentication

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  authStrategy: 'JWT',
  authProvider: {
    async getToken() {
      // Return your JWT token from Auth0, next-auth, etc.
      return await getAccessToken();
    }
  }
});
```

## API Reference

### Configuration Options

```typescript
interface GrainConfig {
  tenantId: string;              // Required: Your Grain tenant ID
  apiUrl?: string;               // API base URL (default: 'https://api.grainql.com')
  authStrategy?: AuthStrategy;   // 'NONE' | 'SERVER_SIDE' | 'JWT' (default: 'NONE')
  secretKey?: string;            // Required for SERVER_SIDE auth
  authProvider?: AuthProvider;   // Required for JWT auth
  batchSize?: number;            // Events per batch (default: 50)
  flushInterval?: number;        // Auto-flush interval in ms (default: 5000)
  retryAttempts?: number;        // Retry attempts for failed requests (default: 3)
  retryDelay?: number;           // Base retry delay in ms (default: 1000)
  debug?: boolean;               // Enable debug logging (default: false)
}
```

### Methods

#### `track(eventName, properties?, options?)`

Track a single event:

```typescript
grain.track('purchase', {
  product_id: 'abc123',
  price: 29.99,
  currency: 'USD'
});
```

#### `track(event, options?)`

Track with a full event object:

```typescript
grain.track({
  eventName: 'purchase',
  userId: 'user123',
  properties: {
    product_id: 'abc123',
    price: 29.99
  },
  timestamp: new Date()
});
```

#### `flush()`

Manually flush all queued events:

```typescript
await grain.flush();
```

#### `identify(userId)`

Set user ID for subsequent events:

```typescript
grain.identify('user123');
```

#### `destroy()`

Clean up resources and send remaining events:

```typescript
grain.destroy();
```

## Authentication Strategies

### NONE
No authentication required. Events are sent directly to the API.

### SERVER_SIDE
Use a secret key for server-side authentication:
- Obtain your secret key from the Grain dashboard
- Include it in your configuration
- Events are sent with `Authorization: Chase {SECRET}` header

### JWT
Use JWT tokens for client-side authentication:
- Configure JWT settings in your Grain tenant
- Provide an auth provider that returns valid tokens
- Supports Auth0, next-auth, and other JWT providers

## Build Outputs

The package provides multiple build formats:

- **ESM**: `dist/index.mjs` - Modern ES modules
- **CommonJS**: `dist/index.js` - Node.js compatible
- **IIFE**: `dist/index.global.js` - Browser global (`window.Grain`)
- **Types**: `dist/index.d.ts` - TypeScript definitions

### Browser Usage (Script Tag)

```html
<script src="https://unpkg.com/@grain-analytics/web/dist/index.global.js"></script>
<script>
  const grain = Grain.createGrainAnalytics({
    tenantId: 'your-tenant-id'
  });
  
  grain.track('page_view');
</script>
```

## Advanced Usage

### Custom Auth Provider

```typescript
class Auth0Provider {
  constructor(private auth0Client) {}
  
  async getToken() {
    return await this.auth0Client.getTokenSilently();
  }
}

const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  authStrategy: 'JWT',
  authProvider: new Auth0Provider(auth0Client)
});
```

### Error Handling

```typescript
try {
  await grain.track('event', { data: 'value' }, { flush: true });
} catch (error) {
  console.error('Failed to send event:', error);
}
```

### Debug Mode

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  debug: true // Enables console logging
});
```

## License

MIT

## Support

For questions and support, please visit [grainql.com](https://grainql.com) or contact our support team.
