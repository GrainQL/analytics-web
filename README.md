# Grain Analytics Web SDK

A lightweight, dependency-free TypeScript SDK for analytics and remote configuration management.

[![npm version](https://badge.fury.io/js/@grainql%2Fanalytics-web.svg)](https://www.npmjs.com/package/@grainql/analytics-web)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@grainql/analytics-web)](https://bundlephobia.com/package/@grainql/analytics-web)

## Features

- 🚀 **Zero dependencies** - ~6KB gzipped
- 📦 **Automatic batching** - Efficient event delivery
- 🔄 **Retry logic** - Reliable with exponential backoff
- 🎯 **TypeScript first** - Full type safety
- ⚙️ **Remote Config** - Dynamic app control without deployments
- ⚛️ **React Hooks** - Seamless React integration
- 📱 **Cross-platform** - Browser, Node.js, React Native

## Installation

```bash
npm install @grainql/analytics-web
```

## Quick Start

### Vanilla JavaScript/TypeScript

```typescript
import { createGrainAnalytics } from '@grainql/analytics-web';

const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id'
});

// Track events
grain.track('page_viewed', { page: '/home' });

// Get remote config
const heroText = grain.getConfig('hero_text');
```

### React

```typescript
import { GrainProvider, useConfig, useTrack } from '@grainql/analytics-web/react';

function App() {
  return (
    <GrainProvider config={{ tenantId: 'your-tenant-id' }}>
      <HomePage />
    </GrainProvider>
  );
}

function HomePage() {
  const { value: heroText } = useConfig('hero_text');
  const track = useTrack();
  
  return (
    <div>
      <h1>{heroText || 'Welcome!'}</h1>
      <button onClick={() => track('cta_clicked')}>
        Get Started
      </button>
    </div>
  );
}
```

## Documentation

For comprehensive guides, API reference, and examples, visit our documentation:

**📚 [Full Documentation](https://docs.grainql.com)** <!-- Update with actual docs URL -->

### Key Topics

- **[Quick Start Guide](https://docs.grainql.com/quickstart)** - Get started in 5 minutes
- **[Event Tracking](https://docs.grainql.com/core/event-tracking)** - Track user actions
- **[Remote Configuration](https://docs.grainql.com/core/remote-config)** - Dynamic app control
- **[React Hooks](https://docs.grainql.com/react/overview)** - React integration
- **[API Reference](https://docs.grainql.com/api-reference/overview)** - Complete API docs
- **[Examples](https://docs.grainql.com/examples/react)** - Real-world examples


## Key Concepts

### Event Tracking
Track user actions with automatic batching and retry logic:
```typescript
grain.track('button_clicked', { button: 'signup' });
await grain.trackPurchase({ orderId: '123', total: 99.99 });
```

### Remote Configuration
Control your app dynamically without code deployments:
```typescript
const featureEnabled = grain.getConfig('new_feature');
if (featureEnabled === 'true') {
  // Show feature
}
```

### User Identification
Track users across sessions:
```typescript
grain.setUserId('user_123');
await grain.setProperty({ plan: 'premium' });
```

## More Examples

Check the [examples directory](./examples) for:
- Vanilla JavaScript usage
- React integration
- Next.js setup
- E-commerce tracking
- Authentication flows

## Contributing

We welcome contributions! Please see our contributing guidelines for more details.

## License

MIT © Grain Analytics

## Support

- **Documentation**: [docs.grainql.com](https://docs.grainql.com)
- **Dashboard**: [grainql.com/dashboard](https://grainql.com/dashboard)
- **Issues**: [GitHub Issues](https://github.com/GrainQL/analytics-web/issues)
- **Email**: support@grainql.com
