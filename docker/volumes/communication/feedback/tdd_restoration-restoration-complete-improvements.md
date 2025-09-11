# SIMPLE FIX - Just Add the Missing Test Scripts!

## THE PROBLEM IS SIMPLE:
1. The workspace already has the test files and Jest configs
2. But package.json is missing the test scripts
3. The entrypoint keeps running `test:all:executive` which doesn't exist
4. This causes the container to restart and lose all work

## IMMEDIATE FIX - Add these 5 scripts to package.json:

```bash
cd /workspace

# Add the missing test scripts using npm pkg set
npm pkg set scripts.test:integration:cross-role="jest --config=jest.config.integration.cross-role.js --forceExit"
npm pkg set scripts.test:features:decision="jest --config=jest.config.decision.js --forceExit"
npm pkg set scripts.test:components:executive="jest --config=jest.config.components.executive.js --forceExit"
npm pkg set scripts.test:hooks:executive="jest --config jest.config.hooks.executive.js --verbose --forceExit"
npm pkg set scripts.test:all:executive="npm run test:hooks:executive && npm run test:components:executive && npm run test:screens:executive && npm run test:integration:cross-role && npm run test:features:decision"

# Verify the scripts were added
npm run | grep executive
npm run | grep cross-role
npm run | grep decision

# Now run the test command that the entrypoint expects
npm run test:all:executive
```

## THAT'S IT!
- Don't copy files - they're already there
- Don't analyze code - it's already merged
- Just add the 5 missing test scripts so the TEST_COMMAND works
- This will stop the restart cycle and let you see the actual test results

## Steps to Fix Test Infrastructure:

```bash
# 1. Copy Jest configurations from reference volumes (they have working configs)
for volume in /reference/tdd_phase_4-*; do
  echo "Checking Jest configs in $volume..."
  for config in "$volume"/jest.config*.js; do
    if [ -f "$config" ]; then
      # Copy config if it doesn't exist or has different content
      config_name=$(basename "$config")
      if [ ! -f "/workspace/$config_name" ] || ! diff -q "$config" "/workspace/$config_name" > /dev/null 2>&1; then
        echo "Copying $config_name from $volume"
        cp "$config" "/workspace/"
      fi
    fi
  done
done

# 2. Copy test setup files that might be missing
for volume in /reference/tdd_phase_4-*; do
  # Copy test mocks
  if [ -d "$volume/src/test/mocks" ]; then
    cp -r "$volume/src/test/mocks/"* /workspace/src/test/mocks/ 2>/dev/null || true
  fi
  
  # Copy __mocks__ directory
  if [ -d "$volume/src/__mocks__" ]; then
    cp -r "$volume/src/__mocks__/"* /workspace/src/__mocks__/ 2>/dev/null || true
  fi
  
  # Copy test setup files
  for setup_file in "$volume/src/test"/*.ts "$volume/src/test"/*.js; do
    if [ -f "$setup_file" ]; then
      cp "$setup_file" /workspace/src/test/ 2>/dev/null || true
    fi
  done
done

# 3. Merge package.json test scripts from working volumes
# The reference volumes have test scripts that work - add any missing ones
for volume in /reference/tdd_phase_4-*; do
  if [ -f "$volume/package.json" ]; then
    echo "Check $volume/package.json for test scripts we're missing"
    # Extract and merge test-related scripts
  fi
done

# 4. Ensure babel.config.js and other configs are present
for config_file in babel.config.js babel.config.test.js tsconfig.json jest.setup.js; do
  for volume in /reference/tdd_phase_4-*; do
    if [ -f "$volume/$config_file" ] && [ ! -f "/workspace/$config_file" ]; then
      cp "$volume/$config_file" /workspace/
      echo "Copied $config_file from $volume"
      break
    fi
  done
done

# 5. Verify test discovery works
cd /workspace
npm test -- --listTests | head -20
# Should show actual test files, not empty

# 6. Run tests to see if they pass
npm test
```

## Key Points:
1. The source code is already correct - DO NOT overwrite it
2. Focus ONLY on test infrastructure: Jest configs, mocks, setup files
3. The reference volumes have ~100% pass rates with the SAME code
4. The difference is in configuration, not implementation
5. Be careful not to overwrite the existing merged code

## Success Criteria:
- All Jest config files from reference volumes are harmonized
- Test mocks and setup files are properly configured
- `npm test` discovers 2000+ test files
- Pass rate improves to >90% (target 100%)