# Documentation Fix: Tenant ID Clarification

## 🎯 **Issue Fixed**

Updated documentation to clarify that APIs require the tenant alias/identifier (as shown on the dashboard) rather than UUID.

## 📝 **Changes Made**

### **1. API Reference Documentation**
- **`docs/api-reference/query-api/query-events.mdx`**
  - Changed: `Your tenant identifier (UUID or alias)`
  - To: `Your tenant identifier (use the alias shown on your dashboard)`

- **`docs/api-reference/query-api/count-events.mdx`**
  - Changed: `Your tenant identifier (UUID or alias)`
  - To: `Your tenant identifier (use the alias shown on your dashboard)`

- **`docs/api-reference/query-api/list-events.mdx`**
  - Changed: `Your tenant identifier (UUID or alias)`
  - To: `Your tenant identifier (use the alias shown on your dashboard)`

### **2. Query API Overview**
- **`docs/api-reference/query-api/overview.mdx`**
  - Added prominent note: "**Important**: Use your tenant alias (shown on the dashboard) as the `{tenantId}` parameter, not the UUID. The alias is the human-readable identifier you see in your dashboard."

### **3. Configuration Documentation**
- **`docs/advanced/configuration.mdx`**
  - Updated tenantId description to clarify: "Use the alias shown on your dashboard (not the UUID)"

### **4. Quick Start Guide**
- **`docs/quickstart.mdx`**
  - Updated introduction to clarify: "This is the alias shown on your dashboard (not the UUID) and identifies your application"

### **5. Authentication Documentation**
- **`docs/authentication.mdx`**
  - Updated security note to clarify: "Anyone with your tenant ID (the alias from your dashboard) can send events"

### **6. Main Documentation Index**
- **`docs/index.mdx`**
  - Updated welcome note to clarify: "get your tenant identifier (use the alias shown on your dashboard, not the UUID)"

## 🎯 **Impact**

### **Before**
- Documentation was ambiguous about whether to use UUID or alias
- Developers might have used the wrong identifier
- API calls could fail with incorrect tenant ID

### **After**
- Clear guidance to use the dashboard alias
- Prominent notes in key locations
- Consistent messaging across all documentation
- Reduced confusion and support requests

## 📍 **Key Locations Updated**

1. **API Reference** - All Query API endpoint documentation
2. **Quick Start** - First-time user experience
3. **Configuration** - Advanced setup documentation
4. **Authentication** - Security considerations
5. **Overview** - Main documentation landing page

## ✅ **Result**

The documentation now clearly states that:
- APIs require the **tenant alias** (human-readable identifier)
- This is the identifier **shown on the dashboard**
- **Not the UUID** (internal system identifier)
- This applies to all API endpoints and SDK configuration

This should eliminate confusion and ensure developers use the correct identifier when making API calls or configuring the SDK.
