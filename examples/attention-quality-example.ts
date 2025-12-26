/**
 * Attention Quality Example
 * Demonstrates how attention quality policies work in the SDK
 */

import { createGrainAnalytics } from '@grainql/analytics-web';

// Initialize SDK with debug mode to see attention quality logs
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  debug: true, // Enable debug logging to see attention quality decisions
  enableHeatmapTracking: true,
});

// The SDK will automatically apply attention quality policies:

// 1. PAGE VISIBILITY POLICY
// When user switches tabs:
// → [AttentionQuality] Page hidden - tracking paused
// → Section tracking stops
// → Scroll tracking stops
//
// When user returns:
// → [AttentionQuality] Page visible - tracking resumed
// → All section timers reset
// → Tracking continues

// 2. USER ACTIVITY POLICY
// When user is idle for 30+ seconds:
// → [AttentionQuality] User idle - tracking paused
// → No section view events sent
// → No scroll events sent
//
// When user becomes active (mouse move, scroll, click, etc.):
// → Tracking resumes automatically

// 3. SECTION DURATION CAP
// User views section for 3 seconds:
// → ✅ _grain_section_view event sent (duration: 3000ms)
//
// User continues viewing for 3 more seconds (total 6s):
// → ✅ _grain_section_view event sent (duration: 3000ms)
//
// User continues viewing for 3 more seconds (total 9s):
// → ✅ _grain_section_view event sent (duration: 3000ms)
//
// User continues viewing for 3 more seconds (total 12s):
// → ❌ Event NOT sent - max duration cap reached
// → [AttentionQuality] Section "hero": Max duration cap reached (9000ms)
//
// User scrolls 150px:
// → ✅ Attention timer reset!
// → [AttentionQuality] Section "hero": Attention reset due to 150px scroll
// → Tracking continues from 0s

// 4. SCROLL DISTANCE POLICY
// User adjusts view by 50px:
// → Timer continues (< 100px threshold)
//
// User scrolls 120px to read more:
// → Timer resets (≥ 100px threshold)
// → Fresh 9-second tracking window begins

// Example: Monitoring tracking state
setTimeout(() => {
  // Access the internal attention quality state (for debugging)
  console.log('Tracking state:', {
    // These methods would be available in debug/internal builds
    // In production, rely on debug logs
  });
}, 5000);

// Example: What gets tracked vs filtered

// TRACKED ✅
// - User actively reading section for 6 seconds → ✅ 2 events (3s + 3s)
// - User scrolls 200px after 9s cap → ✅ Timer resets, tracking continues
// - User returns to tab after switching → ✅ Events resume
// - User moves mouse after 25s idle → ✅ Activity detected, tracking resumes

// FILTERED ❌
// - Tab in background for 5 minutes → ❌ No events (page hidden)
// - User idle for 45 seconds → ❌ No events (user inactive)
// - User on same section for 15s without scrolling → ❌ Only 9s tracked (duration cap)
// - Accidental 30px scroll → ❌ Doesn't reset timer (< 100px threshold)

// Benefits:
// 1. 20-40% reduction in event volume
// 2. Higher quality engagement metrics
// 3. More accurate time-on-page
// 4. Better scroll depth insights
// 5. Reduced server load

console.log('Attention quality policies are active and working transparently!');
console.log('Check browser console for [AttentionQuality] debug logs');

