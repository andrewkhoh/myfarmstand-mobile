# 🚀 Service Audit & Fix Automation System - Usage Guide

## 🎯 **Quick Start**

The automation system eliminates repetitive manual audits with simple commands:

### **Main Commands**

```bash
# Complete audit and fix workflow (recommended)
npm run audit-and-fix

# Quick audit only (fast overview)
npm run quick-audit

# Full automation with auto-fixes
npm run full-automation

# Individual components
npm run audit-services      # Service pattern audit
npm run validate-schemas     # Database schema validation
npm run generate-fixes       # Create fix patches
npm run apply-fixes          # Apply fixes automatically
npm run generate-tests       # Generate unit/integration tests
```

## 📊 **What Each Command Does**

### **`npm run audit-and-fix`** (Default Workflow)
- ✅ Audits all services against CartService golden pattern
- ✅ Validates database schema alignments
- ✅ Generates fix patches (doesn't auto-apply)
- ✅ Creates unit and integration tests
- ✅ Runs verification to measure improvements
- 📊 Generates comprehensive reports

### **`npm run quick-audit`** (Fast Check)
- ✅ Service pattern audit only
- ✅ Schema validation only
- ⏭️ Skips fix generation and tests
- 📊 Quick overview report

### **`npm run full-automation`** (Hands-off)
- ✅ Complete workflow
- ✅ **Automatically applies fixes**
- ✅ Creates backups before changes
- 📊 Full automation report

## 🔧 **Individual Tools**

### **Service Auditor** (`npm run audit-services`)
Compares all services to CartService golden pattern:
- ✅ Error handling patterns
- ✅ Broadcast integration
- ✅ Return format consistency
- ✅ Logging practices
- ✅ TypeScript usage

### **Schema Validator** (`npm run validate-schemas`)
Detects service/database mismatches:
- 🚨 Critical: `pre_order_deadline` → `pre_order_available_date`
- ⚠️ Field mapping inconsistencies
- 🔍 Missing database fields
- 📋 Type mismatches

### **Pattern Fixer** (`npm run generate-fixes`)
Generates automated fixes:
- 🔧 Error handling improvements
- 🔧 Broadcast integration
- 🔧 Return format standardization
- 🔧 Schema mapping corrections

### **Test Generator** (`npm run generate-tests`)
Creates comprehensive test suites:
- 🧪 Unit tests for all service methods
- 🔗 Integration tests with database
- 🪝 React Query hook tests
- 📊 Coverage analysis

## 📊 **Reports & Output**

All commands generate detailed reports in `automation/reports/`:

- **JSON Reports**: Machine-readable data
- **Markdown Reports**: Human-readable summaries
- **Patch Files**: Generated fixes in `automation/patches/`
- **Backups**: Original files in `automation/backups/`

## ⚙️ **Configuration**

Edit `automation/config.json` to customize:

```json
{
  "goldenPattern": {
    "service": "src/services/cartService.ts"  // Your golden standard
  },
  "servicesToAudit": [
    "src/services/orderService.ts",           // Services to check
    "src/services/productService.ts"
  ],
  "fixGeneration": {
    "autoApply": false,                       // Auto-apply fixes
    "backupOriginals": true                   // Create backups
  }
}
```

## 🎯 **Typical Workflow**

1. **Initial Assessment**:
   ```bash
   npm run quick-audit
   ```

2. **Generate Fixes**:
   ```bash
   npm run audit-and-fix
   ```

3. **Review Generated Patches**:
   - Check `automation/patches/` for proposed fixes
   - Review `automation/reports/` for detailed analysis

4. **Apply Fixes** (when ready):
   ```bash
   npm run apply-fixes
   ```

5. **Run Generated Tests**:
   ```bash
   npm test
   ```

## 🚨 **Safety Features**

- **Automatic Backups**: Original files saved before changes
- **Patch Preview**: See fixes before applying
- **Non-destructive**: Generate-only mode by default
- **Rollback**: Restore from backups if needed

## 📈 **Success Metrics**

The system tracks:
- **Service Scores**: 0-100 based on pattern compliance
- **Schema Alignment**: Critical/high/medium/low issues
- **Test Coverage**: Generated test scenarios
- **Fix Success Rate**: Applied vs generated patches

## 🔄 **Integration with Development**

Add to your development workflow:

```bash
# Before committing
npm run quick-audit

# Weekly code quality check
npm run audit-and-fix

# Major refactoring
npm run full-automation
```

## 🆘 **Troubleshooting**

**Command fails with TypeScript errors?**
```bash
npm install -g ts-node
```

**No services found?**
- Check `automation/config.json` paths
- Ensure services exist in `src/services/`

**Fixes not applying?**
- Check file permissions
- Review backup directory for conflicts

## 🎉 **Benefits**

✅ **Eliminates repetitive manual audits**
✅ **Ensures consistent code quality**
✅ **Catches schema mismatches automatically**
✅ **Generates comprehensive test suites**
✅ **Provides actionable improvement suggestions**
✅ **Saves hours of manual code review**

---

**Need help?** Check the generated reports in `automation/reports/` for detailed analysis and recommendations!
