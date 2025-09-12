#!/bin/bash

echo "🧪 Testing Role Services..."
echo ""

# Run tests individually to avoid timeout issues
echo "1️⃣ Testing RolePermissionService..."
npx jest src/services/__tests__/rolePermissionService.test.ts --testEnvironment=node --no-coverage --bail --forceExit --testTimeout=10000

if [ $? -eq 0 ]; then
    echo "✅ RolePermissionService tests passed"
else
    echo "❌ RolePermissionService tests failed"
fi

echo ""
echo "2️⃣ Testing UserRoleService..."
npx jest src/services/__tests__/userRoleService.test.ts --testEnvironment=node --no-coverage --bail --forceExit --testTimeout=10000

if [ $? -eq 0 ]; then
    echo "✅ UserRoleService tests passed"
else
    echo "❌ UserRoleService tests failed"
fi

echo ""
echo "📊 Test run complete!"