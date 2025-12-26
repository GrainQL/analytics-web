# Event Properties Reference

This document lists all properties automatically tracked by the Grain Analytics SDK and those that developers need to collect manually.

## Legend

- ✅ **Auto-tracked**: Automatically collected by the SDK
- 🔧 **Developer-collected**: Must be manually tracked by developers
- 🔒 **Consent-required**: Only collected with user consent

---

## Standard Events

### `page_view`

Automatically tracked on every page navigation.

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `page` | string | ✅ | Current page path (with or without query params based on config) |
| `title` | string | ✅ 🔒 | Document title |
| `full_url` | string | ✅ 🔒 | Complete URL including query params and hash |
| `referrer` | string | ✅ 🔒 | Previous page URL (document.referrer) |
| `referrer_domain` | string | ✅ 🔒 | Domain extracted from referrer |
| `referrer_category` | string | ✅ 🔒 | Categorized referrer: organic, paid, social, direct, email, referral |
| `previous_page` | string | ✅ 🔒 | Previous page within the same session |
| `landing_page` | string | ✅ 🔒 | First page of the session (only on subsequent page views) |
| `session_id` | string | ✅ 🔒 | Current session identifier |
| `utm_source` | string | ✅ 🔒 | UTM source parameter (if present) |
| `utm_medium` | string | ✅ 🔒 | UTM medium parameter (if present) |
| `utm_campaign` | string | ✅ 🔒 | UTM campaign parameter (if present) |
| `utm_term` | string | ✅ 🔒 | UTM term parameter (if present) |
| `utm_content` | string | ✅ 🔒 | UTM content parameter (if present) |
| `first_touch_source` | string | ✅ 🔒 | First-touch attribution source |
| `first_touch_medium` | string | ✅ 🔒 | First-touch attribution medium |
| `first_touch_campaign` | string | ✅ 🔒 | First-touch attribution campaign |
| `first_touch_referrer_category` | string | ✅ 🔒 | First-touch referrer category |
| `browser` | string | ✅ 🔒 | Browser name (Chrome, Firefox, Safari, Edge, Opera, Unknown) |
| `os` | string | ✅ 🔒 | Operating system (Windows, macOS, Linux, Android, iOS, Unknown) |
| `language` | string | ✅ 🔒 | Browser language (navigator.language) |
| `timezone` | string | ✅ 🔒 | User timezone (e.g., "America/New_York") |
| `screen_resolution` | string | ✅ 🔒 | Screen resolution (e.g., "1920x1080") |
| `viewport` | string | ✅ 🔒 | Viewport size (e.g., "1440x900") |
| `timestamp` | number | ✅ | Event timestamp (milliseconds since epoch) |

---

### `_grain_session_start`

Automatically tracked when a new session begins (page load).

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `session_id` | string | ✅ | Unique session identifier |
| `landing_page` | string | ✅ 🔒 | First page of the session |
| `referrer` | string | ✅ 🔒 | Referrer URL (if present) |
| `referrer_domain` | string | ✅ 🔒 | Referrer domain (if present) |
| `referrer_category` | string | ✅ 🔒 | Categorized referrer source |
| `utm_source` | string | ✅ 🔒 | UTM source (if present) |
| `utm_medium` | string | ✅ 🔒 | UTM medium (if present) |
| `utm_campaign` | string | ✅ 🔒 | UTM campaign (if present) |
| `utm_term` | string | ✅ 🔒 | UTM term (if present) |
| `utm_content` | string | ✅ 🔒 | UTM content (if present) |
| `first_touch_source` | string | ✅ 🔒 | First-touch attribution source |
| `first_touch_medium` | string | ✅ 🔒 | First-touch attribution medium |
| `first_touch_campaign` | string | ✅ 🔒 | First-touch attribution campaign |
| `first_touch_referrer_category` | string | ✅ 🔒 | First-touch referrer category |
| `screen_resolution` | string | ✅ 🔒 | Screen resolution |
| `viewport` | string | ✅ 🔒 | Viewport size |
| `browser` | string | ✅ 🔒 | Browser name |
| `os` | string | ✅ 🔒 | Operating system |
| `language` | string | ✅ 🔒 | Browser language |
| `timezone` | string | ✅ 🔒 | User timezone |
| `timestamp` | number | ✅ | Session start time |

---

### `_grain_session_end`

Automatically tracked when a session ends (page unload/close).

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `session_id` | string | ✅ | Session identifier |
| `duration` | number | ✅ | Session duration in milliseconds |
| `event_count` | number | ✅ | Total events tracked during session |
| `page_count` | number | ✅ 🔒 | Total pages viewed during session |
| `timestamp` | number | ✅ | Session end time |

---

### `_grain_heartbeat`

Automatically tracked at regular intervals to measure engagement.

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `heartbeat_type` | string | ✅ | Type: "periodic" or "page_load" |
| `status` | string | ✅ | User activity: "active" or "inactive" |
| `page` | string | ✅ 🔒 | Current page path |
| `session_id` | string | ✅ 🔒 | Current session identifier |
| `duration` | number | ✅ 🔒 | Time since last heartbeat (periodic only) |
| `event_count` | number | ✅ 🔒 | Events since last heartbeat (periodic only) |
| `timestamp` | number | ✅ | Heartbeat timestamp |

---

### `_grain_consent_granted`

Tracked when user grants analytics consent.

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `previous_session_id` | string | ✅ | Ephemeral session ID before consent |
| `new_user_id` | string | ✅ | Persistent user ID after consent |
| `timestamp` | number | ✅ | Consent grant time |

---

## Template Events

These events are available via SDK helper methods but require manual triggering.

### `login`

Track user authentication.

```typescript
grain.trackLogin({
  method: 'email', // or 'google', 'facebook', etc.
  success: true,
  errorMessage: 'Invalid credentials', // if success = false
  loginAttempt: 1,
  rememberMe: true,
  twoFactorEnabled: false,
});
```

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `method` | string | 🔧 | Authentication method |
| `success` | boolean | 🔧 | Whether login succeeded |
| `errorMessage` | string | 🔧 | Error message (if failed) |
| `loginAttempt` | number | 🔧 | Login attempt number |
| `rememberMe` | boolean | 🔧 | Whether "remember me" was checked |
| `twoFactorEnabled` | boolean | 🔧 | Whether 2FA is enabled |

---

### `signup`

Track user registration.

```typescript
grain.trackSignup({
  method: 'email',
  source: 'landing_page',
  plan: 'free',
  success: true,
});
```

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `method` | string | 🔧 | Registration method |
| `source` | string | 🔧 | Where user signed up from |
| `plan` | string | 🔧 | Selected plan |
| `success` | boolean | 🔧 | Whether signup succeeded |
| `errorMessage` | string | 🔧 | Error message (if failed) |

---

### `purchase`

Track completed purchases.

```typescript
grain.trackPurchase({
  orderId: 'ORD-12345',
  total: 99.99,
  currency: 'USD',
  items: [
    { id: 'ITEM-1', name: 'Product A', price: 49.99, quantity: 2, category: 'electronics' }
  ],
  paymentMethod: 'credit_card',
  shippingMethod: 'express',
  tax: 8.50,
  shipping: 5.99,
  discount: 10.00,
  couponCode: 'SAVE10',
});
```

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `orderId` | string | 🔧 | Unique order identifier |
| `total` | number | 🔧 | Total order amount |
| `currency` | string | 🔧 | Currency code (USD, EUR, etc.) |
| `items` | array | 🔧 | Array of purchased items |
| `paymentMethod` | string | 🔧 | Payment method used |
| `shippingMethod` | string | 🔧 | Shipping method selected |
| `tax` | number | 🔧 | Tax amount |
| `shipping` | number | 🔧 | Shipping cost |
| `discount` | number | 🔧 | Discount amount |
| `couponCode` | string | 🔧 | Applied coupon code |

---

### `checkout`

Track checkout initiation.

```typescript
grain.trackCheckout({
  orderId: 'ORD-12345',
  total: 99.99,
  currency: 'USD',
  items: [/* ... */],
  paymentMethod: 'credit_card',
  success: true,
});
```

*Properties same as `purchase` event*

---

### `search`

Track search queries.

```typescript
grain.track('search', {
  query: 'wireless headphones',
  results: 42,
  filters: { category: 'electronics', price: 'under-50' },
  sortBy: 'popularity',
  category: 'products',
  success: true,
});
```

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `query` | string | 🔧 | Search query text |
| `results` | number | 🔧 | Number of results found |
| `filters` | object | 🔧 | Applied filters |
| `sortBy` | string | 🔧 | Sort order |
| `category` | string | 🔧 | Search category |
| `success` | boolean | 🔧 | Whether search succeeded |

---

### `add_to_cart`

Track items added to cart.

```typescript
grain.trackAddToCart({
  itemId: 'PROD-123',
  itemName: 'Wireless Headphones',
  price: 49.99,
  quantity: 1,
  currency: 'USD',
  category: 'electronics',
  variant: 'black',
});
```

| Property | Type | Tracking | Description |
|----------|------|----------|-------------|
| `itemId` | string | 🔧 | Product ID |
| `itemName` | string | 🔧 | Product name |
| `price` | number | 🔧 | Unit price |
| `quantity` | number | 🔧 | Quantity added |
| `currency` | string | 🔧 | Currency code |
| `category` | string | 🔧 | Product category |
| `variant` | string | 🔧 | Product variant (color, size, etc.) |

---

### `remove_from_cart`

Track items removed from cart.

*Properties same as `add_to_cart` event*

---

## Custom Events

You can track any custom event with your own properties:

```typescript
grain.track('button_clicked', {
  button_id: 'signup-cta',
  button_text: 'Get Started',
  page: '/pricing',
  position: 'hero',
});
```

<Tip>
**New to event naming?** Check out our [Event Naming Convention](/core/event-naming) guide for a systematic approach to naming custom events. It provides a hierarchical structure that makes events clear, consistent, and easy to query.
</Tip>

### Automatic Property Enrichment

**Important**: All custom events (except system events starting with `_grain_`) are automatically enriched with session-level attribution properties when user consent is granted:

- **UTM Parameters**: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (from the current session)
- **First-Touch Attribution**: `first_touch_source`, `first_touch_medium`, `first_touch_campaign`, `first_touch_referrer_category`
- **Session ID**: `session_id`

This ensures that all events have the necessary attribution data for matrix analysis and conversion tracking, even if you don't explicitly include these properties in your custom events.

Example: When you track a signup event:

```typescript
grain.track('signup', { plan: 'pro' });
```

The actual event sent will include:

```typescript
{
  plan: 'pro',
  utm_source: 'google',        // Auto-added from session
  utm_medium: 'cpc',            // Auto-added from session
  utm_campaign: 'spring_sale',  // Auto-added from session
  first_touch_source: 'google', // Auto-added
  first_touch_campaign: 'spring_sale', // Auto-added
  session_id: '...',            // Auto-added
  // ... other first-touch properties
}
```

### Recommended Custom Properties

When tracking custom events, consider including:

- **Context**: `page`, `section`, `component`
- **Action details**: `action_type`, `target`, `value`
- **User state**: `is_authenticated`, `user_plan`, `user_role`
- **Experiment**: `experiment_id`, `variant`
- **Performance**: `duration`, `load_time`

---

## Property Scope

### Event-Scoped Properties

Properties that exist on the specific event being tracked. Most properties are event-scoped.

### User-Scoped Properties

Properties that exist on any event for a given user. In Matrices, you can query by "User Property (Any Event)" to find users who have logged this property at least once, even if not on the specific event being analyzed.

Examples:
- `first_touch_*` - Set on session_start, can be queried on any event
- `utm_*` - Set on page_view, can be queried on conversion events
- Custom user properties set via `grain.setProperty()`

---

## Referrer Categories

The SDK automatically categorizes referrers:

- **organic**: Search engines (Google, Bing, Yahoo, etc.)
- **paid**: Paid advertising (detected via gclid, fbclid, etc.)
- **social**: Social media (Facebook, Twitter, LinkedIn, etc.)
- **email**: Email clients (Gmail, Outlook, etc.)
- **referral**: Other websites
- **direct**: No referrer (direct navigation or bookmark)

---

## Browser Detection

Supported browsers:
- Chrome
- Firefox
- Safari
- Edge
- Opera
- Unknown (for unrecognized browsers)

## OS Detection

Supported operating systems:
- Windows
- macOS
- Linux
- Android
- iOS
- Unknown (for unrecognized systems)

---

## Best Practices

1. **Only log relevant properties**: Don't send null/undefined values
2. **Use consistent naming**: snake_case for property names
3. **Include context**: Add page/section/component for UI events
4. **Track user flow**: Use consistent event names across journeys
5. **Test attribution**: Verify UTM parameters and referrer tracking
6. **Respect privacy**: Only collect necessary data, honor consent

---

## Configuration

### Disable Auto-Properties

To disable automatic property collection:

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  disableAutoProperties: true,
});
```

### Strip Query Parameters

To remove query params from page URLs:

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  stripQueryParams: true, // default: true
});
```

### Property Whitelist

To limit which properties can be tracked:

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  allowedProperties: ['page', 'button_id', 'action'],
});
```

---

## Need Help?

- **Documentation**: [docs.grainql.com](https://docs.grainql.com)
- **Dashboard**: [grainql.com/dashboard](https://grainql.com/dashboard)
- **Issues**: [GitHub Issues](https://github.com/GrainQL/analytics-web/issues)
- **Email**: support@grainql.com

