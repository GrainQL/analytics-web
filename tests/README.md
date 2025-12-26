# Grain Analytics Test Suite

## Overview

This test suite provides comprehensive coverage of the Grain Analytics SDK with realistic, practical test cases. Tests use the real API with tenant ID `grain-test-lab`.

## Test Files

### Core Tests
- **core.test.ts** (7 tests)
  - SDK initialization
  - Basic event tracking
  - Event properties handling
  - Session management
  - SDK lifecycle

### User Identification Tests  
- **user-identification.test.ts** (4 tests)
  - User identification
  - User properties
  - Property updates

### Consent Management Tests
- **consent.test.ts** (4 tests)
  - Consent granting/revoking
  - Consent state management
  - Event tracking with consent

### Remote Configuration Tests
- **remote-config.test.ts** (4 tests)
  - Config fetching
  - Default values
  - All configs retrieval

### Activity Detection Tests
- **activity-detection.test.ts** (4 tests)
  - Activity tracking
  - Threshold management
  - Time tracking

### Attention Quality Tests
- **attention-quality.test.ts** (6 tests)
  - Policy enforcement
  - Section tracking
  - Scroll tracking
  - State management

### Integration Tests
- **integration.test.ts** (5 tests)
  - Real-world user journeys
  - E-commerce flows
  - Consent workflows
  - Session tracking

## Total: 34 Tests

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test -- core.test.ts
```

### Run with coverage
```bash
npm test -- --coverage
```

### Watch mode
```bash
npm test -- --watch
```

## Test Configuration

- **Tenant ID**: `grain-test-lab`
- **API URL**: `https://api.grainql.com`
- **Environment**: JSDOM (browser simulation)
- **Timeout**: Default Jest timeout

## Notes

- Tests use real API calls (not mocked)
- Events are sent to `grain-test-lab` tenant
- Each test cleans up after itself
- Tests are independent and can run in any order
- Focus on realistic scenarios, not edge cases

