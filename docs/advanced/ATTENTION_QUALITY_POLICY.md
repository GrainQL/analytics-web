---
title: 'Attention Quality Policy'
description: 'Data quality policies for section view and scroll duration tracking'
---

# Attention Quality Policy

The Grain Analytics SDK implements intelligent attention quality controls to ensure that tracked section views and scroll duration data represents genuine user engagement, not just passive background presence. This document outlines the policies, their rationale, and how they are applied.

## Overview

Attention quality management helps reduce data noise by filtering out tracking events that don't represent actual user attention:

- Pages sitting in background tabs
- Idle users who have left their browser open
- Excessive duration on a single section that suggests inattention
- Minimal scroll movements that don't indicate engagement

## Core Policies

### 1. Page Visibility Policy

**Rule**: Stop all tracking when the page/tab is not visible to the user.

**Rationale**: When a user switches to another tab or minimizes the browser, the page is no longer receiving attention. Continuing to track during this time would inflate engagement metrics artificially.

**Implementation**:
- Uses the [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- Monitors `document.visibilityState`
- Tracking pauses immediately when page becomes hidden
- All section attention timers are reset when page becomes visible again

**Impact**:
- ✅ Prevents tracking background tabs
- ✅ Ensures accurate time-on-section measurements
- ✅ Reduces server load from inactive pages

### 2. User Activity Policy

**Rule**: Stop tracking after 30 seconds of user inactivity.

**Rationale**: If a user hasn't moved their mouse, touched the screen, pressed a key, or scrolled for 30 seconds, they're likely not paying attention to the content (e.g., stepped away from computer, reading something else, phone call).

**Activity Detection**:
The SDK monitors the following events to determine activity:
- `mousemove` - Mouse cursor movement
- `mousedown` - Mouse button clicks
- `keydown` - Keyboard input
- `scroll` - Page scrolling
- `touchstart` - Touch screen interactions
- `click` - Element clicks

**Idle Threshold**: 30 seconds (30,000ms)

**Implementation**:
- Debounced activity tracking (500ms) to avoid excessive processing
- Timestamp of last activity is continuously updated
- Before tracking any event, SDK checks if activity occurred within threshold
- If idle, tracking is paused until user becomes active again

**Impact**:
- ✅ Filters out "away from keyboard" scenarios
- ✅ Prevents tracking users who left tab open but aren't viewing
- ✅ Improves accuracy of engagement metrics

### 3. Section Duration Cap

**Rule**: Maximum 9 seconds of tracked attention per section without meaningful scroll activity.

**Rationale**: If a user stays on a single section for more than 9 seconds without scrolling, they may be:
- Reading in-depth (genuine engagement) ✓
- Distracted by external factors ✗
- Passively viewing while doing something else ✗
- Having the page open but not viewing ✗

By capping at 9 seconds, we capture meaningful engagement while preventing inflated metrics from passive viewing. If the user is genuinely engaged, they'll scroll to continue reading/viewing.

**Reset Conditions**:
The 9-second timer resets when:
- User scrolls 100+ pixels (indicates active engagement)
- User navigates to a different section
- Page becomes visible again after being hidden

**Implementation**:
- Section tracking sends events every 3 seconds
- Cumulative duration per section is tracked
- When cumulative duration reaches 9 seconds, further tracking for that section is paused
- Scroll of 100+ pixels resets the cumulative duration to zero

**Impact**:
- ✅ Caps attention per section to reasonable engagement window
- ✅ Encourages scroll-based engagement measurement
- ✅ Prevents unlimited duration inflation
- ✅ Maintains data quality for analytics

### 4. Scroll Distance Policy

**Rule**: Minimum 100 pixels of scroll movement to reset attention timer.

**Rationale**: Small scroll movements (adjusting view, accidental touchpad movement) shouldn't be counted as meaningful engagement. A 100-pixel threshold represents intentional scrolling that indicates the user is actively consuming content.

**Typical Context**:
- Average viewport height: 768px - 1080px
- 100px ≈ 13% of a small mobile screen
- 100px ≈ 9% of a desktop screen

This represents a meaningful chunk of content being scrolled past.

**Implementation**:
- Last scroll position is tracked per section
- When checking if tracking should continue, SDK calculates scroll distance since last reset
- If distance ≥ 100px, attention timer is reset and tracking continues
- If distance < 100px and duration ≥ 9s, tracking is paused

**Impact**:
- ✅ Distinguishes intentional scrolling from minor adjustments
- ✅ Encourages scroll-based engagement
- ✅ Provides signal for content consumption

## Policy Configuration

The attention quality policies use the following default values (configured in `AttentionQualityManager`):

```typescript
{
  maxSectionDuration: 9000,     // 9 seconds
  minScrollDistance: 100,        // 100 pixels
  idleThreshold: 30000,          // 30 seconds
}
```

These values are **currently not user-configurable** to ensure consistent data quality across all tenants. Future versions may expose configuration options for specific use cases.

## Tracking Flow Example

### Scenario: User Reading a Blog Post

1. **User lands on page** → Section tracking begins
2. **User reads for 3 seconds** → ✅ First 3-second event tracked
3. **User continues reading for 3 more seconds** → ✅ Second 3-second event tracked (cumulative: 6s)
4. **User reads for 3 more seconds** → ✅ Third 3-second event tracked (cumulative: 9s)
5. **User continues reading for 3 more seconds** → ❌ NOT tracked (hit 9s cap)
6. **User scrolls 150px to read more** → ✅ Attention timer RESET (cumulative back to 0s)
7. **User reads new section for 3 seconds** → ✅ Event tracked (cumulative: 3s)
8. **User switches to another tab** → ⏸️ All tracking PAUSED
9. **User returns to tab after 5 minutes** → ✅ Tracking RESUMED, all timers RESET
10. **User walks away for 35 seconds** → ⏸️ Tracking PAUSED (idle threshold reached)
11. **User returns and moves mouse** → ✅ Tracking RESUMED

## Events Tracked

### Section View Events (`_grain_section_view`)

Properties include:
- `section_name`: Identifier for the section
- `section_type`: Type of section (hero, content, footer, etc.)
- `duration_ms`: Duration of this tracking segment
- `is_split`: Boolean indicating if this is a periodic split (3s intervals) or final exit
- Viewport and scroll metrics

**Filtering Applied**:
- ❌ Filtered if page is hidden
- ❌ Filtered if user is idle (>30s)
- ❌ Filtered if section duration cap reached (9s without scroll)
- ✅ Tracked if all policies pass

### Heatmap Scroll Events (`_grain_heatmap_scroll`)

Properties include:
- `viewport_section`: Which viewport section (0 = first screen, 1 = second screen, etc.)
- `scroll_depth_px`: Scroll depth in pixels
- `duration_ms`: Time spent in this viewport section
- `is_split`: Boolean indicating periodic tracking vs. section change

**Filtering Applied**:
- ❌ Filtered if page is hidden
- ❌ Filtered if user is idle (>30s)
- ❌ Filtered if viewport section duration cap reached (9s without meaningful scroll)
- ✅ Tracked if all policies pass

## Monitoring and Debugging

### Debug Mode

Enable debug logging to see policy decisions in real-time:

```typescript
const grain = createGrainAnalytics({
  tenantId: 'your-tenant-id',
  debug: true,
});
```

Debug logs will include:
- `[AttentionQuality]` - Policy decisions and state changes
- `[SectionTracking]` - Section view tracking events and filters
- `[Heatmap Tracking]` - Scroll tracking events and filters

### Checking Tracking State

The `AttentionQualityManager` provides methods for monitoring (primarily for debugging):

```typescript
// Get current tracking state
const state = attentionQuality.getTrackingState();
// {
//   isPageVisible: true,
//   isUserActive: true,
//   timeSinceLastActivity: 5234,
//   activeSections: 3
// }

// Get active policies
const policies = attentionQuality.getPolicies();
// {
//   maxSectionDuration: 9000,
//   minScrollDistance: 100,
//   idleThreshold: 30000
// }
```

## Impact on Analytics

### Expected Behavior Changes

When attention quality policies are active, you should expect:

**Reduced Event Volume**: 20-40% reduction in section view and scroll events (varies by site and user behavior)

**Higher Quality Data**: Events represent genuine attention and engagement

**More Accurate Metrics**:
- Time on page reflects actual viewing time
- Section engagement shows real interest
- Scroll depth indicates content consumption

### Metrics Interpretation

**Before Attention Quality**:
- Average section view: 45 seconds
- Includes: background tabs, idle users, forgotten pages

**After Attention Quality**:
- Average section view: 12 seconds
- Represents: active, engaged viewing only

The reduction is expected and desired—it means your analytics now reflect reality.

## Technical Implementation

### Architecture

```
AttentionQualityManager
  ├── Page Visibility Listener
  ├── Activity Detector Integration
  ├── Per-Section State Management
  │   ├── Current Duration Tracker
  │   ├── Last Scroll Position
  │   └── Last Reset Time
  └── Policy Evaluation Methods
```

### Integration Points

1. **Section Tracking Manager**
   - Checks `shouldTrackSection()` before each periodic event (3s intervals)
   - Calls `updateSectionDuration()` after tracking
   - Calls `resetSection()` on section exit

2. **Heatmap Tracking Manager**
   - Checks `shouldTrack()` before periodic scroll events
   - Uses viewport section as section key
   - Resets attention on viewport section change

### Performance Considerations

**Memory**: ~100 bytes per tracked section (lightweight state management)

**CPU**: Minimal overhead
- Page visibility: Event listener (native browser API)
- Activity detection: Debounced (500ms) event listeners
- Policy checks: Simple boolean logic

**Network**: Reduces network usage by 20-40% due to event filtering

## Future Enhancements

Potential improvements being considered:

1. **Adaptive Duration Caps**: Adjust 9-second cap based on section type (e.g., video sections could have longer caps)
2. **Configurable Policies**: Allow tenants to customize thresholds for specific use cases
3. **Advanced Idle Detection**: Mouse position heatmaps to detect actual viewing vs. cursor parking
4. **AI-Based Engagement Scoring**: Machine learning to detect genuine engagement patterns
5. **Cross-Section Engagement**: Consider total page engagement when setting per-section caps

## Summary

The Attention Quality Policy ensures that Grain Analytics tracks genuine user engagement by:

✅ Respecting page visibility (no background tab tracking)  
✅ Detecting user activity (idle detection)  
✅ Capping section duration (9s without scroll)  
✅ Requiring meaningful scroll (100px threshold)  

These policies work together to provide high-quality, actionable analytics data while minimizing noise and respecting user privacy.

