# React Native Jest Testing Fix Plan

## Problem Analysis
- Jest setup tries to mock React Native internals that don't exist in test environment
- Services (business logic) don't need React Native component mocking
- Current setup designed for component testing, not service testing

## Step-by-Step Fix Plan

### Step 1: Create Service-Specific Test Setup
- Create `src/test/serviceSetup.ts` with minimal mocks for services only
- Mock only: Supabase, storage APIs, platform detection
- Remove React Native internal mocks

### Step 2: Update Jest Configuration
- Create separate Jest configs for services vs components
- Use appropriate test environment for each type
- Fix transform ignore patterns

### Step 3: Test Individual Services
- Start with simplest service (TokenService)
- Gradually add more complex services
- Verify each works before moving to next

### Step 4: Service-Specific Mocking Strategy
- Mock external dependencies (Supabase, storage)
- Don't mock React Native internals for services
- Use real implementations where possible

### Step 5: Verification
- Run individual service tests
- Run all service tests together
- Ensure no React Native conflicts

## Expected Outcome
- Services tests run independently of React Native environment
- Component tests can still use existing setup
- Clear separation between service and component testing