# @grainql/analytics-web

A lightweight, dependency-free TypeScript SDK for sending analytics events to Grain's REST API with automatic batching, retry logic, and reliable event delivery.

## Features

- 🚀 **Zero dependencies** - Tiny bundle size
- 📦 **Automatic batching** - Efficient event queueing and bulk sending
- 🔄 **Retry logic** - Exponential backoff for failed requests
- 📡 **Beacon API** - Reliable event delivery on page exit
- 🔐 **Multiple auth strategies** - NONE, server-side, and JWT support
- 📱 **Cross-platform** - Works in browsers, Node.js, and React Native
- 🎯 **TypeScript first** - Full type safety out of the box
- 👤 **Global user tracking** - Set user ID once, used for all events
- 📊 **Template events** - Pre-built event tracking for common scenarios
- ⚙️ **Remote Config** - Dynamic configuration management with caching and real-time updates

## Installation

```bash
npm install @grainql/analytics-web
```

## Quick Start

### Basic Usage (No Authentication)

```typescript
import { createGrainAnalytics } from '@grainql/analytics-web';

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
  userId: 'user123'  // Note: Subject to same security restrictions as setProperty
});
```

### Global User ID

Set a user ID once and it will be used for all subsequent events:

```typescript
// Set global user ID in config
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  userId: 'user123' // Global user ID for all events
});

// Or set it after initialization
grain.setUserId('user123');

// All events will now use this user ID
grain.track('page_view', { page: '/dashboard' });
```

### User Properties

Set user properties that can be used for analytics and segmentation:

```typescript
// Set properties for the current user
await grain.setProperty({
  plan: 'premium',
  status: 'active',
  signupDate: '2024-01-15',
  source: 'web'
});

// Set properties for a specific user
await grain.setProperty({
  plan: 'free',
  lastLogin: new Date().toISOString()
}, { userId: 'user123' });

// Properties are automatically serialized to strings
await grain.setProperty({
  isActive: true,           // Becomes "true"
  count: 42,               // Becomes "42"
  metadata: {              // Becomes JSON string
    source: 'api',
    version: '2.0'
  }
});
```

**Important Security Notes:**
- You can set up to 4 properties per request, and all values are automatically converted to strings
- **UserId Override Restrictions**: When using `{ userId: 'specific-user' }` in options, ensure you have proper permissions:
  - If your tenant requires JWT authentication, the userId must match the JWT subject
  - Grain may block requests if too many distinct userIds are used from the same instance, browser, device, or IP
  - Use userId overrides only when you have explicit permission to set properties for other users

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

## Remote Config

The SDK includes powerful remote configuration capabilities that allow you to dynamically control your application's behavior without code deployments.

### Basic Usage

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  userId: 'user123',
  // Set default values for immediate access
  defaultConfigurations: {
    hero_text: 'Welcome to our app!',
    button_color: 'blue',
    feature_enabled: 'false'
  }
});

// Get configuration value (synchronous, from cache or defaults)
const heroText = grain.getConfig('hero_text'); // Returns cached value or default

// Get configuration asynchronously (cache-first, with API fallback)
const buttonColor = await grain.getConfigAsync('button_color');

// Get all configurations
const allConfigs = grain.getAllConfigs();
```

### Preloading Configurations

Preload configurations at page load for immediate access:

```typescript
// Set user ID first
grain.setUserId('user123');

// Preload specific keys for immediate access
await grain.preloadConfig(['hero_text', 'button_color', 'feature_enabled']);

// Now these values are available synchronously
const heroText = grain.getConfig('hero_text');
const buttonColor = grain.getConfig('button_color');
```

### Advanced Configuration Options

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  userId: 'user123',
  // Default values for immediate access
  defaultConfigurations: {
    hero_text: 'Default Hero Text',
    button_color: 'blue',
    feature_enabled: 'false'
  },
  // Custom cache key
  configCacheKey: 'my_app_config',
  // Auto-refresh every 2 minutes
  configRefreshInterval: 120000,
  // Enable/disable caching
  enableConfigCache: true
});
```

### Fetching Configurations with Properties

Send user properties to get personalized configurations:

```typescript
// Fetch with user properties for personalization
const configs = await grain.getAllConfigsAsync({
  properties: {
    plan: 'premium',
    location: 'US',
    signup_date: '2024-01-15'
  }
});

// Or fetch specific keys with properties
const heroText = await grain.getConfigAsync('hero_text', {
  properties: {
    plan: 'premium',
    location: 'US'
  }
});
```

### Configuration Change Listeners

Listen for configuration changes in real-time:

```typescript
// Add a listener for configuration changes
grain.addConfigChangeListener((configurations) => {
  console.log('Configurations updated:', configurations);
  
  // Update UI based on new configurations
  if (configurations.hero_text) {
    document.getElementById('hero').textContent = configurations.hero_text;
  }
  
  if (configurations.button_color) {
    document.getElementById('cta-button').style.backgroundColor = configurations.button_color;
  }
});

// Remove listener when no longer needed
const listener = (configs) => { /* ... */ };
grain.addConfigChangeListener(listener);
grain.removeConfigChangeListener(listener);
```

### Force Refresh

Force refresh configurations from the API:

```typescript
// Force refresh a specific configuration
const latestHeroText = await grain.getConfigAsync('hero_text', {
  forceRefresh: true
});

// Force refresh all configurations
const allLatestConfigs = await grain.getAllConfigsAsync({
  forceRefresh: true
});
```

### Error Handling

The SDK gracefully handles configuration fetch failures:

```typescript
try {
  const configs = await grain.getAllConfigsAsync();
  // Use configurations
} catch (error) {
  console.error('Failed to fetch configurations:', error);
  // Fall back to default values
  const heroText = grain.getConfig('hero_text'); // Returns default if available
}
```

### React Integration Example

```typescript
import { useEffect, useState } from 'react';
import { createGrainAnalytics } from '@grainql/analytics-web';

const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  userId: 'user123',
  defaultConfigurations: {
    hero_text: 'Loading...',
    button_color: 'blue'
  }
});

function App() {
  const [configs, setConfigs] = useState(grain.getAllConfigs());

  useEffect(() => {
    // Preload configurations
    grain.preloadConfig(['hero_text', 'button_color']).then(() => {
      setConfigs(grain.getAllConfigs());
    });

    // Listen for configuration changes
    const handleConfigChange = (newConfigs) => {
      setConfigs(newConfigs);
    };

    grain.addConfigChangeListener(handleConfigChange);

    return () => {
      grain.removeConfigChangeListener(handleConfigChange);
    };
  }, []);

  return (
    <div>
      <h1 style={{ color: configs.button_color }}>
        {configs.hero_text}
      </h1>
    </div>
  );
}
```

## Template Events

The SDK provides pre-built event tracking methods for common scenarios:

### User Authentication

```typescript
// Track login
await grain.trackLogin({
  method: 'email',
  success: true,
  rememberMe: true
});

// Track signup
await grain.trackSignup({
  method: 'google',
  source: 'landing_page',
  plan: 'pro',
  success: true
});
```

### E-commerce

```typescript
// Track checkout
await grain.trackCheckout({
  orderId: 'order_123',
  total: 99.99,
  currency: 'USD',
  items: [
    { id: 'prod_1', name: 'Product 1', price: 49.99, quantity: 1 },
    { id: 'prod_2', name: 'Product 2', price: 50.00, quantity: 1 }
  ],
  paymentMethod: 'credit_card',
  success: true
});

// Track purchase
await grain.trackPurchase({
  orderId: 'order_123',
  total: 99.99,
  currency: 'USD',
  paymentMethod: 'credit_card',
  shipping: 5.99,
  tax: 8.50
});

// Track cart interactions
await grain.trackAddToCart({
  itemId: 'prod_1',
  itemName: 'Product 1',
  price: 49.99,
  quantity: 1,
  currency: 'USD'
});

await grain.trackRemoveFromCart({
  itemId: 'prod_2',
  itemName: 'Product 2',
  price: 50.00,
  quantity: 1
});
```

### Page Views and Search

```typescript
// Track page view
await grain.trackPageView({
  page: '/products',
  title: 'Product Catalog',
  referrer: 'https://google.com',
  url: 'https://yoursite.com/products'
});

// Track search
await grain.trackSearch({
  query: 'blue shoes',
  results: 24,
  filters: { category: 'footwear', color: 'blue' },
  sortBy: 'price_asc'
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
  userId?: string;               // Global user ID for all events
  batchSize?: number;            // Events per batch (default: 50)
  flushInterval?: number;        // Auto-flush interval in ms (default: 5000)
  retryAttempts?: number;        // Retry attempts for failed requests (default: 3)
  retryDelay?: number;           // Base retry delay in ms (default: 1000)
  debug?: boolean;               // Enable debug logging (default: false)
  // Remote Config options
  defaultConfigurations?: Record<string, string>; // Default values for configurations
  configCacheKey?: string;       // Custom cache key for configurations (default: 'grain_config')
  configRefreshInterval?: number; // Auto-refresh interval in ms (default: 300000)
  enableConfigCache?: boolean;   // Enable/disable configuration caching (default: true)
}
```

### Core Methods

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

#### `setUserId(userId)`

Set global user ID for all subsequent events:

```typescript
grain.setUserId('user123');
```

#### `getUserId()`

Get current global user ID:

```typescript
const userId = grain.getUserId(); // Returns 'user123' or null
```

#### `identify(userId)`

Alias for `setUserId()` - sets user ID for subsequent events:

```typescript
grain.identify('user123');
```

#### `setProperty(properties, options?)`

Set user properties for analytics and segmentation:

```typescript
// Set properties for current user
await grain.setProperty({
  plan: 'premium',
  status: 'active',
  signupDate: '2024-01-15'
});

// Set properties for specific user
await grain.setProperty({
  plan: 'free'
}, { userId: 'user123' });
```

**Parameters:**
- `properties`: Object with up to 4 key-value pairs
- `options.userId`: Optional user ID override

**Security Considerations:**
- When using `options.userId`, ensure you have proper permissions to set properties for other users
- With JWT authentication, the userId must match the JWT subject
- Grain may block requests if too many distinct userIds are used from the same source

#### `flush()`

Manually flush all queued events:

```typescript
await grain.flush();
```

#### `destroy()`

Clean up resources and send remaining events:

```typescript
grain.destroy();
```

### Remote Config Methods

#### `getConfig(key)`

Get configuration value synchronously (from cache or defaults):

```typescript
const heroText = grain.getConfig('hero_text'); // Returns string | undefined
```

#### `getAllConfigs()`

Get all configurations synchronously (from cache or defaults):

```typescript
const configs = grain.getAllConfigs(); // Returns Record<string, string>
```

#### `getConfigAsync(key, options?)`

Get configuration value asynchronously (cache-first with API fallback):

```typescript
const heroText = await grain.getConfigAsync('hero_text');
const buttonColor = await grain.getConfigAsync('button_color', {
  properties: { plan: 'premium' },
  forceRefresh: true
});
```

#### `getAllConfigsAsync(options?)`

Get all configurations asynchronously (cache-first with API fallback):

```typescript
const configs = await grain.getAllConfigsAsync();
const allConfigs = await grain.getAllConfigsAsync({
  properties: { plan: 'premium', location: 'US' },
  forceRefresh: true
});
```

#### `fetchConfig(options?)`

Fetch configurations directly from API:

```typescript
const response = await grain.fetchConfig({
  immediateKeys: ['hero_text', 'button_color'],
  properties: { plan: 'premium' }
});
// Returns RemoteConfigResponse with full API response
```

#### `preloadConfig(immediateKeys?, properties?)`

Preload configurations for immediate access:

```typescript
await grain.preloadConfig(['hero_text', 'button_color']);
// Configurations are now available synchronously
```

#### `addConfigChangeListener(listener)`

Add listener for configuration changes:

```typescript
const listener = (configurations) => {
  console.log('Configs updated:', configurations);
};
grain.addConfigChangeListener(listener);
```

#### `removeConfigChangeListener(listener)`

Remove configuration change listener:

```typescript
grain.removeConfigChangeListener(listener);
```

### Template Event Methods

#### Authentication Events

- `trackLogin(properties?, options?)` - Track user login
- `trackSignup(properties?, options?)` - Track user signup

#### E-commerce Events

- `trackCheckout(properties?, options?)` - Track checkout process
- `trackPurchase(properties?, options?)` - Track completed purchase
- `trackAddToCart(properties?, options?)` - Track item added to cart
- `trackRemoveFromCart(properties?, options?)` - Track item removed from cart

#### Navigation Events

- `trackPageView(properties?, options?)` - Track page views
- `trackSearch(properties?, options?)` - Track search queries

### Template Event Properties

All template events support their own typed properties:

```typescript
// Login event properties
interface LoginEventProperties {
  method?: string;           // 'email', 'google', 'facebook', etc.
  success?: boolean;         // Whether login was successful
  errorMessage?: string;     // Error message if login failed
  loginAttempt?: number;     // Attempt number
  rememberMe?: boolean;      // Whether "remember me" was checked
  twoFactorEnabled?: boolean; // Whether 2FA was used
}

// Checkout event properties
interface CheckoutEventProperties {
  orderId?: string;          // Unique order identifier
  total?: number;            // Total amount
  currency?: string;         // Currency code
  items?: Array<{            // Array of items
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  paymentMethod?: string;    // 'credit_card', 'paypal', 'stripe', etc.
  success?: boolean;         // Whether checkout was successful
  errorMessage?: string;     // Error message if checkout failed
  couponCode?: string;       // Applied coupon code
  discount?: number;         // Discount amount
}
```

## Security Considerations

### User ID Override Restrictions

When using userId overrides in event tracking or property setting, be aware of these security restrictions:

- **JWT Authentication**: If your tenant requires JWT authentication, any userId override must match the JWT subject
- **Rate Limiting**: Grain may block requests if too many distinct userIds are used from the same instance, browser, device, or IP address
- **Permissions**: Only use userId overrides when you have explicit permission to track events or set properties for other users

**Best Practices:**
- Use global `setUserId()` for the current user instead of per-event userId overrides
- Avoid switching between many different userIds from the same client
- Ensure your authentication strategy aligns with your userId usage patterns

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
<script src="https://unpkg.com/@grainql/analytics-web/dist/index.global.js"></script>
<script>
  const grain = Grain.createGrainAnalytics({
    tenantId: 'your-tenant-id',
    userId: 'user123'
  });
  
  grain.trackPageView({ page: '/home' });
  grain.trackLogin({ method: 'email', success: true });
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

### User Session Management

```typescript
// Set user ID when user logs in
grain.setUserId('user123');

// Track user-specific events
await grain.trackLogin({ method: 'email', success: true });
await grain.trackPageView({ page: '/dashboard' });

// Clear user ID when user logs out
grain.setUserId(null);
```

## Changelog

### [1.5.0] - 2024-12-19

#### Added
- **Remote Config API**: Complete remote configuration management system
  - `getConfig()` and `getAllConfigs()` for synchronous access
  - `getConfigAsync()` and `getAllConfigsAsync()` for async access with cache-first strategy
  - `fetchConfig()` for direct API calls
  - `preloadConfig()` for preloading configurations at page load
  - Configuration change listeners with `addConfigChangeListener()` and `removeConfigChangeListener()`
  - Automatic configuration caching with localStorage persistence
  - Auto-refresh timer for keeping configurations up-to-date
  - Default values support for immediate access without API calls
  - User properties support for personalized configurations
  - Force refresh option to bypass cache
  - Full authentication support (NONE, SERVER_SIDE, JWT)
- **Enhanced Configuration Options**:
  - `defaultConfigurations` for setting default values
  - `configCacheKey` for custom cache keys
  - `configRefreshInterval` for auto-refresh timing
  - `enableConfigCache` for cache control

#### Technical
- Added comprehensive remote config interfaces and types
- Implemented robust error handling and retry logic for config API
- Added localStorage-based caching with graceful fallbacks
- Integrated config refresh timer with proper cleanup
- Enhanced TypeScript interfaces for better type safety

### [1.4.0] - 2024-12-19

#### Added
- **User Properties API**: New `setProperty()` method for setting user properties
  - Set up to 4 properties per request
  - Automatic string serialization for all values
  - Support for user-specific property overrides
  - Full authentication support (NONE, SERVER_SIDE, JWT)
- **Updated API Endpoints**: 
  - Events now use `/v1/events/{tenant}/multi` endpoint
  - Properties use `/v1/events/{tenant}/properties` endpoint

#### Changed
- Updated all event sending to use the new `/multi` endpoint
- Enhanced error handling and retry logic for properties API

#### Technical
- Added comprehensive test coverage for properties functionality
- Updated all existing tests to use new endpoint structure
- Improved TypeScript interfaces for better type safety

### [1.3.0] - Previous Release

- Template events for common analytics scenarios
- Enhanced user ID management
- Improved error handling and retry logic
- Cross-platform compatibility improvements

## License

MIT

## Support

For questions and support, please visit [grainql.com](https://grainql.com) or contact our support team.
