# Codebase Audit: Pattern 2 & 4 Violations Detection
**Purpose**: Find similar schema-interface misalignment issues before they cause UI failures  
**Date**: 2025-08-21

## 🎯 **Audit Scope**

Based on the category filtering bug, we need to systematically check for:
1. **Pattern 2 violations**: Database-interface misalignment
2. **Pattern 4 violations**: Incomplete transformations
3. **Runtime schema errors**: Field mapping mistakes
4. **Service-schema inconsistencies**: Missing field selections

## 🔍 **Audit Checklist**

### **Step 1: Database-Interface Alignment Audit**

#### **1.1 Find All Schema Files**
```bash
find src/ -name "*.schema.ts" -type f
```

#### **1.2 Extract All Schema Transforms**
```bash
grep -r "\.transform(" src/schemas/ -A 20
```

#### **1.3 Find Interface References**
```bash
grep -r "interface.*Product\|interface.*Order\|interface.*Category\|interface.*User" src/types/
```

#### **1.4 Check Service Select Statements**
```bash
grep -r "\.select(" src/services/ -A 10 -B 5
```

### **Step 2: Transformation Completeness Audit**

#### **2.1 Find Missing Return Type Annotations**
```bash
# Look for transform functions without TypeScript return types
grep -r "\.transform(" src/schemas/ | grep -v "): "
```

#### **2.2 Find Potential Wrong Field Mappings**
```bash
# Look for suspicious field mappings like category_id: data.category
grep -r "category_id.*:.*data\." src/schemas/
grep -r "user_id.*:.*data\." src/schemas/
grep -r "_id.*:.*data\.[^_]" src/schemas/
```

#### **2.3 Check for Hardcoded Column Names**
```bash
# Find potential is_active vs is_available issues
grep -r "is_active" src/services/ src/schemas/
grep -r "is_available" src/services/ src/schemas/
```

### **Step 3: Service-Schema Consistency Audit**

#### **3.1 Find All Schema Imports in Services**
```bash
grep -r "from.*schema" src/services/
```

#### **3.2 Check for Schema.parse() Usage**
```bash
grep -r "Schema\.parse" src/services/ -A 5 -B 5
```

#### **3.3 Find Potential Double Validation**
```bash
# Look for validation before schema.parse()
grep -r "validate.*parse\|parse.*validate" src/services/
```

## 🚨 **High-Risk Patterns to Find**

### **Pattern 2 Violations**
```bash
# Missing database fields in select statements
# Compare these patterns:

# ❌ Suspicious: Missing related fields
grep -r "\.select.*name.*description" src/services/ | grep -v "category_id\|user_id\|product_id"

# ❌ Suspicious: No foreign key fields
grep -r "\.select(" src/services/ | grep -v "_id"
```

### **Pattern 4 Violations**  
```bash
# Transform functions that might be incomplete
grep -r "transform.*data.*=>" src/schemas/ -A 30 | grep -E "undefined|null|\/\/ TODO"
```

### **Runtime Error Patterns**
```bash
# Column name mismatches
grep -r "is_active.*true\|is_active.*false" src/services/ src/schemas/
grep -r "\.eq('is_active" src/services/
```

## 📋 **Manual Verification Steps**

### **For Each Schema File:**
1. **Read corresponding interface** in `src/types/index.ts`
2. **Check database.generated.ts** for actual column names
3. **Verify service selects all interface-expected fields**
4. **Confirm transformation populates all interface fields**
5. **Check for TypeScript return annotation**: `): InterfaceName =>`

### **For Each Service File:**
1. **Find all `.select()` statements**
2. **Compare selected fields to interface expectations**
3. **Look for missing foreign key fields** (`*_id`)
4. **Check for hardcoded column names** that might be wrong

### **For Each Interface:**
1. **Find all optional vs required fields**
2. **Check if transformations handle optional fields correctly**
3. **Verify populated fields** (like `category?: Category`) **have population logic**

## 🔧 **Automated Detection Commands**

### **Run Full Audit**
```bash
# Create comprehensive audit report
cat > audit-schema-issues.sh << 'EOF'
#!/bin/bash

echo "=== SCHEMA-INTERFACE ALIGNMENT AUDIT ==="
echo

echo "1. Schema files found:"
find src/ -name "*.schema.ts" -type f
echo

echo "2. Transform functions without return types:"
grep -r "\.transform(" src/schemas/ | grep -v "): " | head -20
echo

echo "3. Suspicious field mappings:"
grep -rn "category_id.*:.*data\.category[^_]" src/schemas/
grep -rn "user_id.*:.*data\.user[^_]" src/schemas/
echo

echo "4. Hardcoded column name issues:"
grep -rn "is_active" src/services/ src/schemas/ | head -10
echo

echo "5. Service select statements missing foreign keys:"
grep -r "\.select(" src/services/ | grep -v "_id" | head -10
echo

echo "6. Schema imports in services:"
grep -r "from.*schema" src/services/
echo

echo "=== HIGH PRIORITY ISSUES ==="
echo "Check these files manually for Pattern 2 & 4 violations:"
grep -l "\.transform(" src/schemas/*.ts | xargs -I {} echo "- {}"
echo

EOF

chmod +x audit-schema-issues.sh
./audit-schema-issues.sh
```

## 📊 **Expected Findings**

Based on the category bug pattern, expect to find:

### **High Probability Issues**
1. **User/Auth schemas**: Likely missing `user_id` selections
2. **Order schemas**: Potential `order_id` vs `id` mismatches  
3. **Cart schemas**: Missing product relationship populations
4. **Category schemas**: Other `is_active` vs `is_available` issues

### **Medium Probability Issues**
1. **Image/Media fields**: Wrong URL field mappings
2. **Timestamp fields**: `created_at` vs `createdAt` inconsistencies
3. **Boolean fields**: Null handling in transformations
4. **Optional fields**: Missing population logic

### **Low Probability but High Impact**
1. **Security fields**: Wrong user isolation in queries
2. **Payment fields**: Amount/currency field mismatches
3. **Inventory fields**: Stock quantity field mapping errors

## 🚦 **Action Priority**

### **🚨 Immediate (Fix Today)**
- Any schema using hardcoded `is_active` instead of `is_available`
- Any transform missing TypeScript return annotation
- Any service selecting subset of interface-expected fields

### **⚠️ High Priority (Fix This Week)**  
- Any schema with wrong foreign key mappings
- Any interface with populated fields but no population logic
- Any service-schema import inconsistencies

### **📋 Medium Priority (Fix Next Sprint)**
- Transformation completeness for all non-critical schemas
- Database-interface alignment for all entities
- Automated prevention mechanisms

---

**Next Steps**: Run audit script and create systematic fix plan for all discovered violations.