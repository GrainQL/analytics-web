# Breaking Changes in v2.0

## Overview

Grain Analytics v3.0 introduces significant privacy improvements and is **cookieless by default**. This release contains breaking changes that require code updates.

## 🚨 Breaking Changes

### 1. Consent Mode Enum Changed

**Old:**
```typescript
type ConsentMode = 'opt-in' | 'opt-out' | 'disabled';
```

**New:**
```typescript
type ConsentMode = 'cookieless' | 'gdpr-strict' | 'gdpr-opt-out';
```

**Migration:**
- `'opt-in'` → `'gdpr-strict'`
- `'opt-out'` → `'gdpr-opt-out'` or `'gdpr-strict'` (recommended)
- `'disabled'` → `'gdpr-opt-out'` (not recommended)

### 2. Default Consent Mode Changed

**Old:** `'opt-out'` (tracking by default)  
**New:** `'cookieless'` (privacy-first, daily rotating IDs)

**Action Required:** If you rely on permanent user IDs without consent, explicitly set `consentMode: 'gdpr-opt-out'`.

### 3. `enableCookies` Config Removed

**Removed:**
```typescript
enableCookies: boolean; // Deprecated
cookieOptions?: CookieConfig; // Deprecated
```

**Reason:** Grain is cookieless by default. Cookies are only used for storing consent preferences (not for user identification).

**Action Required:** Remove `enableCookies` and `cookieOptions` from your configuration.

### 4. `anonymizeIP` Config Deprecated

**Deprecated:**
```typescript
anonymizeIP?: boolean; // Always true in v2.0
```

**Reason:** Raw IP addresses are **never stored**. GeoIP data (country, region, city) is extracted and stored instead.

**Action Required:** Remove `anonymizeIP` from your configuration. IP anonymization is automatic.

### 5. User ID Generation Changed

**Old Behavior:**
- Permanent UUIDs stored in localStorage/cookies
- Same ID across sessions by default

**New Behavior:**
- **Cookieless mode:** Daily rotating IDs (reset at midnight in user's timezone)
- **GDPR Strict:** Daily rotating IDs until consent granted, then permanent IDs
- **GDPR Opt-out:** Permanent IDs (legacy behavior)

**Action Required:** If you need permanent user IDs for attribution, use `'gdpr-strict'` mode and implement a consent banner.

### 6. Query Parameters Stripped by Default

**New Default:** `stripQueryParams: true`

**Reason:** Privacy-first approach. Query parameters may contain sensitive data.

**Action Required:** If you need query parameters for analytics, either:
- Use `'gdpr-opt-out'` mode, OR
- Set `stripQueryParams: false` (not recommended for GDPR compliance)

### 7. Visitor Search Removed

**Removed:** `searchQuery` parameter from Visitors API

**Reason:** GDPR compliance. Direct visitor search by ID/email/name is not privacy-friendly.

**Action Required:** Access visitor timelines via:
- Direct visitor ID from event details
- Country filtering
- Conversion filtering

## 🔄 API Changes

### Backend DTOs

**`PrivacySettingsDto` changes:**
```typescript
// Added:
stripQueryParams: boolean;

// Deprecated (always false):
enableCookieConsent: boolean;

// Deprecated (always true):
ipAnonymization: boolean;
```

**`VisitorListRequest` changes:**
```typescript
// Removed:
searchQuery?: string; // No longer supported
```

### SDK Configuration

**Removed fields:**
- `enableCookies`
- `cookieOptions`

**Deprecated fields:**
- `anonymizeIP` (always true)

**New fields:**
- `stripHash?: boolean` (default: false)

## 📦 Data Migration

### Tenant Migration

All existing tenants will be automatically migrated to `GDPR_STRICT` mode for safety. This ensures:
- ✅ GDPR compliance by default
- ✅ Fallback to cookieless tracking
- ✅ No data loss for existing users with consent

### Event Data

**No migration needed for events.** However:
- ✅ New events will not store IP addresses (GeoIP only)
- ✅ Existing events with IP addresses are retained (not deleted)
- ✅ Query parameters will be stripped from new page views

## 🔧 Required Code Changes

### Minimum Required Changes

**Before:**
```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'opt-out',
  enableCookies: true,
  anonymizeIP: false,
});
```

**After:**
```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'gdpr-strict', // or 'cookieless' or 'gdpr-opt-out'
  // enableCookies: removed
  // anonymizeIP: removed (always true)
});
```

### Consent Banner Implementation

If using `gdpr-strict` mode, implement a consent banner:

```typescript
import { createGrainAnalytics } from '@grainql/analytics-web';

const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'gdpr-strict',
  waitForConsent: true, // Queue events until consent
});

// Show your consent banner
showConsentBanner({
  onAccept: () => {
    grain.grantConsent(['analytics', 'functional']);
  },
  onReject: () => {
    grain.revokeConsent();
    // Continues in cookieless mode
  },
});
```

## 🚀 Benefits

Despite breaking changes, v2.0 provides significant benefits:

1. **✅ GDPR Compliant by Default** - Cookieless mode requires no consent
2. **✅ Privacy-First** - Daily rotating IDs, no persistent tracking
3. **✅ No Consent Banner Required** - For basic analytics (cookieless mode)
4. **✅ Better Security** - No IP storage, query params stripped
5. **✅ Flexible** - Choose privacy level based on your needs

## 📞 Support

For migration assistance:
- 📖 Read the [Migration Guide](./MIGRATION_GUIDE_V2.md)
- 📚 Check the [updated README](./README.md)
- 💬 Contact support: support@grainql.com
- 🐛 Report issues: https://github.com/grainql/grain-analytics/issues

## ⏰ Timeline

- **v2.0-beta:** Available now for testing
- **v2.0:** Stable release Q1 2025
- **v1.x support:** 6 months after v2.0 stable
- **v1.x EOL:** Q3 2025

## 🔄 Rollback

If you need to stay on v1.x:

```bash
npm install @grainql/analytics-web@1.x
```

We recommend migrating to v2.0 for improved privacy compliance.
