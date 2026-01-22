# Quick Reference: Privacy Update v3.0

## 🎯 Choose Your Privacy Mode

```typescript
import { createGrainAnalytics } from '@grainql/analytics-web';
```

### 🔒 Cookieless (Default)
```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'cookieless'
});
```
✅ No consent needed | ✅ GDPR friendly | ⚠️ Daily rotating IDs

### 🛡️ GDPR Strict (Recommended)
```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'gdpr-strict',
  waitForConsent: true
});

// Show consent banner
grain.grantConsent(['analytics']);
```
✅ GDPR Article 6 & 7 | ✅ Permanent IDs with consent | ✅ Falls back to cookieless

### ⚖️ GDPR Opt-out (US/CCPA)
```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  consentMode: 'gdpr-opt-out'
});

// User can opt out
grain.revokeConsent();
```
✅ CCPA compliant | ✅ Permanent IDs | ⚠️ Not GDPR strict

## 🔑 Key Changes

| What | v1.x | v2.0 |
|------|------|------|
| Default Mode | opt-out | **cookieless** |
| Cookies | Optional | **Never** (for IDs) |
| IP Storage | Optional anonymization | **Never** (GeoIP only) |
| Query Params | Included | **Stripped** by default |
| User IDs | Permanent UUIDs | **Daily rotating** or permanent (with consent) |
| Visitor Search | Supported | **Removed** (GDPR) |

## 📋 Migration Checklist

- [ ] Update SDK: `npm install @grainql/analytics-web@2.0.0`
- [ ] Change `consentMode` from `'opt-out'` to `'cookieless'` or `'gdpr-strict'`
- [ ] Remove `enableCookies` config
- [ ] Remove `anonymizeIP` config
- [ ] Implement consent banner (if using `gdpr-strict`)
- [ ] Test daily ID rotation
- [ ] Verify events are tracked
- [ ] Check query params stripped
- [ ] Update TypeScript types

## 🧪 Quick Test

```typescript
// After implementing changes
const grain = createGrainAnalytics({
  tenantId: 'test',
  consentMode: 'cookieless',
  debug: true
});

console.log('User ID:', grain.getEffectiveUserId());
// Should output: "daily_XXXXX_YYYYY"

grain.track('test_event', { foo: 'bar' });
// Check browser console for debug logs
```

## 🚨 Breaking Changes

```typescript
// ❌ REMOVED
enableCookies: boolean
cookieOptions: CookieConfig
anonymizeIP: boolean

// ❌ CHANGED
consentMode: 'opt-in' | 'opt-out' | 'disabled'

// ✅ NEW
consentMode: 'cookieless' | 'gdpr-strict' | 'gdpr-opt-out'
stripHash?: boolean
```

## 📞 Need Help?

- 📖 [Full Migration Guide](./MIGRATION_GUIDE_V2.md)
- 📋 [Breaking Changes](./BREAKING_CHANGES.md)
- 📚 [README](./README.md)
- 💬 support@grainql.com
