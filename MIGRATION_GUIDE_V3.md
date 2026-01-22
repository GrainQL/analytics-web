# Migration Guide: v2.x → v3.0

## Overview

This guide helps you migrate from Grain Analytics v2.x to v3.0 safely and efficiently.

## 📋 Prerequisites

- Node.js 14+ or 16+ (recommended)
- TypeScript 4.5+ (if using TypeScript)
- Read the [Breaking Changes](./BREAKING_CHANGES.md) document

## 🗺️ Migration Path

### Step 1: Update Package Version

```bash
# Using npm
npm install @grainql/analytics-web@3.0.0

# Using yarn
yarn add @grainql/analytics-web@3.0.0

# Using pnpm
pnpm add @grainql/analytics-web@3.0.0
```

### Step 2: Choose Your Privacy Level

Decide which consent mode fits your needs:

#### Option A: Cookieless (Recommended for Privacy)

**Best for:**
- EU/EEA markets
- Privacy-conscious users
- Basic analytics without user attribution

**Configuration:**
```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'cookieless', // Default in v3.0
});
```

**Characteristics:**
- ✅ No consent banner needed
- ✅ Daily rotating user IDs
- ✅ GDPR friendly
- ⚠️ No cross-session attribution
- ⚠️ Limited user journey tracking

#### Option B: GDPR Strict (Recommended for Full Features)

**Best for:**
- EU/EEA markets with consent management
- Full analytics with GDPR compliance
- User journey tracking

**Configuration:**
```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'gdpr-strict',
  waitForConsent: true,
});

// Implement consent banner
grain.addListener((state) => {
  if (state.granted) {
    console.log('User granted consent, permanent IDs enabled');
  }
});
```

**Characteristics:**
- ✅ GDPR Article 6 & 7 compliant
- ✅ Falls back to cookieless
- ✅ Full features with consent
- ⚠️ Requires consent banner implementation

#### Option C: GDPR Opt-out (US/CCPA Markets)

**Best for:**
- US markets
- CCPA compliance
- Minimal changes from v1.x

**Configuration:**
```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'gdpr-opt-out',
});
```

**Characteristics:**
- ✅ Similar to v1.x opt-out mode
- ✅ CCPA compliant
- ✅ Permanent IDs by default
- ⚠️ Not GDPR strict compliant

### Step 3: Update Configuration

#### Before (v1.x):
```typescript
import { createGrainAnalytics } from '@grainql/analytics-web';

const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  apiUrl: 'https://api.grainql.com',
  consentMode: 'opt-out',
  enableCookies: true,
  anonymizeIP: true,
  stripQueryParams: false,
  // ... other options
});
```

#### After (v2.0):
```typescript
import { createGrainAnalytics } from '@grainql/analytics-web';

const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  apiUrl: 'https://api.grainql.com', // Optional
  consentMode: 'gdpr-strict', // Choose: 'cookieless' | 'gdpr-strict' | 'gdpr-opt-out'
  // enableCookies: removed (no longer needed)
  // anonymizeIP: removed (always true)
  stripQueryParams: true, // Default: true
  stripHash: false, // New option
  // ... other options unchanged
});
```

### Step 4: Implement Consent Banner (If Using GDPR Strict)

#### Option 1: Using React Hooks (Recommended)

```typescript
import { GrainProvider, useConsent } from '@grainql/analytics-web/react';

function ConsentBanner() {
  const { hasConsent, grantConsent, revokeConsent } = useConsent();

  if (hasConsent !== null) return null; // Already decided

  return (
    <div className="consent-banner">
      <p>We use analytics to improve your experience.</p>
      <button onClick={() => grantConsent(['analytics'])}>
        Accept
      </button>
      <button onClick={() => revokeConsent()}>
        Reject
      </button>
    </div>
  );
}

function App() {
  return (
    <GrainProvider config={{
      tenantId: 'your-tenant-id',
      consentMode: 'gdpr-strict',
    }}>
      <ConsentBanner />
      {/* Your app */}
    </GrainProvider>
  );
}
```

#### Option 2: Using Vanilla JavaScript

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'gdpr-strict',
});

// Check if consent is already given
if (!grain.hasConsent()) {
  // Show consent banner
  showConsentBanner({
    onAccept: () => {
      grain.grantConsent(['analytics', 'functional']);
    },
    onReject: () => {
      grain.revokeConsent();
    },
  });
}
```

### Step 5: Update Type Definitions (TypeScript)

If you're using TypeScript with custom types:

```typescript
// Before
type ConsentMode = 'opt-in' | 'opt-out' | 'disabled';

// After
type ConsentMode = 'cookieless' | 'gdpr-strict' | 'gdpr-opt-out';
```

### Step 6: Remove Deprecated Code

Search and remove deprecated configurations:

```bash
# Search for deprecated options
grep -r "enableCookies" ./src
grep -r "anonymizeIP" ./src
grep -r "opt-in\|opt-out\|disabled" ./src
```

**Remove:**
- `enableCookies` option
- `cookieOptions` option
- `anonymizeIP` option
- Old consent mode strings

### Step 7: Test Your Integration

#### Test Checklist:

- [ ] SDK initializes without errors
- [ ] Events are tracked successfully
- [ ] Consent banner appears (if using GDPR Strict)
- [ ] Daily rotating IDs work (if using cookieless)
- [ ] Permanent IDs persist after consent (if using GDPR Strict)
- [ ] Query parameters are stripped (if enabled)
- [ ] Page views are tracked correctly
- [ ] User identification works
- [ ] No console errors or warnings

#### Test Cookieless Mode:

```typescript
const grain = createGrainAnalytics({
  tenantId: 'test-tenant',
  consentMode: 'cookieless',
  debug: true,
});

// Check ID format
const id = grain.getEffectiveUserId();
console.log('User ID:', id); // Should start with "daily_"

// Track test event
grain.track('test_event', { test: true });
```

#### Test GDPR Strict Mode:

```typescript
const grain = createGrainAnalytics({
  tenantId: 'test-tenant',
  consentMode: 'gdpr-strict',
  debug: true,
});

// Before consent
console.log('Before consent:', grain.hasConsent()); // false
let id1 = grain.getEffectiveUserId(); // Daily ID

// Grant consent
grain.grantConsent(['analytics']);
console.log('After consent:', grain.hasConsent()); // true
let id2 = grain.getEffectiveUserId(); // Permanent UUID

// IDs should be different
console.log('Daily ID:', id1);
console.log('Permanent ID:', id2);
```

### Step 8: Update Backend Integration (If Applicable)

If you're using the backend API directly:

#### Update Privacy Settings:

```typescript
// New consent mode values
const response = await fetch('/v1/tenant/your-tenant/privacy', {
  method: 'PUT',
  body: JSON.stringify({
    consentMode: 'GDPR_STRICT', // or COOKIELESS, GDPR_OPT_OUT
    stripQueryParams: true,
    dataRetentionDays: 180,
    allowDataDeletion: true,
  }),
});
```

#### Update Visitor Search:

```typescript
// Before: Search by visitor ID/email
const visitors = await fetch(
  `/v1/tenant/your-tenant/visitors?searchQuery=user@example.com`
);

// After: Remove searchQuery (no longer supported)
const visitors = await fetch(
  `/v1/tenant/your-tenant/visitors?countryFilter=US&hasConversion=true`
);
```

## 🔍 Common Migration Issues

### Issue 1: "enableCookies is not a valid option"

**Solution:** Remove `enableCookies` from your config. Cookies are no longer used for user IDs.

### Issue 2: User IDs change every day

**Solution:** You're in `cookieless` mode. Switch to `gdpr-strict` or `gdpr-opt-out` for permanent IDs.

### Issue 3: Consent banner doesn't work

**Solution:** Ensure you're using `consentMode: 'gdpr-strict'` and properly implementing the consent flow.

### Issue 4: TypeScript errors with ConsentMode

**Solution:** Update your types to use the new consent mode values.

### Issue 5: Visitors page shows "search removed" message

**Solution:** This is expected. Use country filtering or access visitors via event details.

## 📊 Monitoring Post-Migration

After migration, monitor:

1. **Event Volume:** Should remain consistent
2. **Unique Users:** May decrease if using cookieless (expected)
3. **Consent Rate:** Track in Privacy dashboard (if using GDPR Strict)
4. **Error Rate:** Check for any SDK errors

## 🚨 Rollback Plan

If you encounter issues:

1. **Immediate Rollback:**
   ```bash
   npm install @grainql/analytics-web@1.x
   ```

2. **Revert Code Changes:**
   - Restore old configuration
   - Re-add deprecated options
   - Revert consent mode values

3. **Contact Support:**
   - Email: support@grainql.com
   - Include: error logs, SDK version, config

## ✅ Migration Complete Checklist

- [ ] Updated to v2.0
- [ ] Chose consent mode
- [ ] Updated configuration
- [ ] Removed deprecated options
- [ ] Implemented consent banner (if needed)
- [ ] Updated TypeScript types
- [ ] Tested all functionality
- [ ] Monitored analytics dashboard
- [ ] Updated documentation/team
- [ ] Verified GDPR compliance

## 📞 Support

Need help with migration?

- 📖 [Breaking Changes](./BREAKING_CHANGES.md)
- 📚 [README](./README.md)
- 💬 Email: support@grainql.com
- 🐛 GitHub Issues: https://github.com/grainql/grain-analytics/issues

## 🎉 Congratulations!

You've successfully migrated to Grain Analytics v2.0. Enjoy enhanced privacy compliance and a more secure analytics platform!
