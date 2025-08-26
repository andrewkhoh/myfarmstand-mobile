#!/bin/bash

# Fix Service Test Imports - Add missing imports for mocked services
# This script fixes import issues after the initial SimplifiedSupabaseMock fixes

echo "🔧 Fixing service test imports..."

# Function to add missing imports to a test file
fix_imports() {
  local file="$1"
  echo "🔧 Adding imports to: $file"
  
  # Backup the original file
  cp "$file" "$file.import.backup"
  
  # Create temporary file for processing
  temp_file=$(mktemp)
  
  # Extract the first import line to determine where to add imports
  first_import_line=$(grep -n "^import\|^const.*require" "$file" | head -1 | cut -d: -f1)
  
  if [ -n "$first_import_line" ]; then
    # Get all lines before the first import
    head -n $((first_import_line - 1)) "$file" > "$temp_file"
    
    # Add the necessary imports
    echo "" >> "$temp_file"
    echo "// ============================================================================" >> "$temp_file"
    echo "// MOCK SETUP - MUST BE BEFORE ANY IMPORTS " >> "$temp_file"
    echo "// ============================================================================" >> "$temp_file"
    echo "" >> "$temp_file"
    
    # Add mock setup first
    sed -n '/^jest\.mock/,/^});$/p' "$file" | head -n -1 >> "$temp_file"
    echo "" >> "$temp_file"
    
    echo "// ============================================================================" >> "$temp_file"
    echo "// IMPORTS - AFTER ALL MOCKS ARE SET UP" >> "$temp_file"
    echo "// ============================================================================" >> "$temp_file"
    echo "" >> "$temp_file"
    
    # Add service imports
    service_name=$(basename "$file" .test.ts | sed 's/Service$//')
    echo "import { ${service_name}Service } from '../${service_name}Service';" >> "$temp_file"
    
    # Add common imports
    if grep -q "ValidationMonitor" "$file"; then
      echo "import { ValidationMonitor } from '../../../utils/validationMonitor';" >> "$temp_file"
    fi
    
    if grep -q "RolePermissionService" "$file"; then
      echo "import { RolePermissionService } from '../../role-based/rolePermissionService';" >> "$temp_file"
    fi
    
    # Add factory imports
    echo "import { createUser, createProduct, resetAllFactories } from '../../../test/factories';" >> "$temp_file"
    
    # Add the rest of the file (skipping the mock setups that we already added)
    sed -n '/^describe/,$p' "$file" >> "$temp_file"
    
    # Replace the original file
    mv "$temp_file" "$file"
    
    echo "✅ Fixed imports in: $file"
  else
    echo "⚠️  No imports found in: $file"
    rm "$temp_file"
  fi
}

# List of files that need import fixes
files_to_fix=(
  "src/services/marketing/__tests__/productContentService.test.ts"
  "src/services/marketing/__tests__/productBundleService.test.ts"
  "src/services/marketing/__tests__/marketingServiceIntegration.test.ts"
)

# Fix all files
for file in "${files_to_fix[@]}"; do
  if [ -f "$file" ]; then
    fix_imports "$file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 Import fixes completed!"
echo "📝 Backup files created with .import.backup extension"