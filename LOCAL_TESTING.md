# Local SDK Testing Guide

This guide shows how to test the `@grainql/analytics-web` SDK locally in your `grainql` dashboard project.

## Option 1: Using `npm link` (Recommended for Active Development)

This creates a symlink so changes in the SDK are immediately available in your dashboard.

### Step 1: Build and Link the SDK

```bash
cd /Users/eray/WebstormProjects/grain-analytics

# Build the SDK
npm run build

# Create a global symlink
npm link
```

### Step 2: Link in Your Dashboard

```bash
cd /Users/eray/WebstormProjects/grainql

# Link to the local SDK
npm link @grainql/analytics-web
```

### Step 3: Development Workflow

For active development, you can set up watch mode:

**Terminal 1 - SDK Watch Mode:**
```bash
cd /Users/eray/WebstormProjects/grain-analytics

# Install a file watcher (if not already installed)
npm install --save-dev nodemon

# Add to package.json scripts:
# "watch": "nodemon --watch src --ext ts --exec 'npm run build'"

# Or use a simple watch script
npm run watch  # (you'll need to add this script)
```

**Terminal 2 - Dashboard Dev Server:**
```bash
cd /Users/eray/WebstormProjects/grainql
npm run dev
```

### Step 4: Unlink When Done

```bash
cd /Users/eray/WebstormProjects/grainql
npm unlink @grainql/analytics-web

# Reinstall from npm
npm install @grainql/analytics-web@^3.0.4
```

---

## Option 2: Using `file:` Protocol (Simpler, No Global Links)

This directly references the local SDK folder.

### Step 1: Update Dashboard package.json

```json
{
  "dependencies": {
    "@grainql/analytics-web": "file:../grain-analytics"
  }
}
```

### Step 2: Install

```bash
cd /Users/eray/WebstormProjects/grainql
npm install
```

### Step 3: Rebuild SDK When Needed

```bash
cd /Users/eray/WebstormProjects/grain-analytics
npm run build

# Then in dashboard, restart dev server
cd /Users/eray/WebstormProjects/grainql
npm run dev
```

---

## Option 3: Snapshot Version (For Testing Before Publishing)

This publishes a snapshot version to npm that you can test.

### Step 1: Update SDK Version

```bash
cd /Users/eray/WebstormProjects/grain-analytics

# Update version to snapshot (e.g., 3.1.3-snapshot.20260118)
npm version 3.1.3-snapshot.20260118 --no-git-tag
```

### Step 2: Build and Publish

```bash
# Build
npm run build

# Publish to npm (requires npm login)
npm publish --tag snapshot
```

### Step 3: Install in Dashboard

```bash
cd /Users/eray/WebstormProjects/grainql

# Install snapshot version
npm install @grainql/analytics-web@3.1.3-snapshot.20260118

# Or use snapshot tag
npm install @grainql/analytics-web@snapshot
```

---

## Recommended: Watch Mode Setup

Add this to `grain-analytics/package.json` for automatic rebuilding:

```json
{
  "scripts": {
    "watch": "tsc --watch --module esnext --target es2020 --outDir dist/esm && tsc --watch --module commonjs --target es2020 --outDir dist/cjs",
    "watch:build": "nodemon --watch src --ext ts --exec 'npm run build'"
  }
}
```

Then install nodemon:
```bash
cd /Users/eray/WebstormProjects/grain-analytics
npm install --save-dev nodemon
```

---

## Testing Vanguard Features Locally

To test the new Vanguard features:

1. **Ensure SDK is built with latest changes:**
   ```bash
   cd /Users/eray/WebstormProjects/grain-analytics
   npm run build
   ```

2. **Start your local backend** (grainsvc) with Vanguard endpoints

3. **In your dashboard**, the SDK should automatically:
   - Check `enableHeatmapSnapshot` flag from remote config
   - Upload snapshots when selected as Vanguard
   - Track navigation events

4. **Check browser console** for Vanguard-related logs:
   - "User selected as Vanguard"
   - "Snapshot uploaded successfully"
   - Navigation tracking events

---

## Troubleshooting

### Changes not reflecting?
- Rebuild SDK: `cd grain-analytics && npm run build`
- Restart dashboard dev server
- Clear Next.js cache: `rm -rf .next`

### Module resolution errors?
- Ensure SDK is built: `npm run build` in grain-analytics
- Check `dist/` folder exists with compiled files
- Verify `package.json` exports are correct

### Type errors?
- Rebuild types: `npm run build:types` in grain-analytics
- Restart TypeScript server in your IDE
