# Service Audit & Fix Automation System

This automation system eliminates repetitive manual audits by automatically:

## 🎯 **Features**
- **Service Pattern Auditing**: Compares all services to CartService golden pattern
- **Schema Mismatch Detection**: Finds service/database field misalignments
- **Automated Fix Generation**: Creates fixes based on detected gaps
- **Test Generation**: Generates unit and integration tests
- **Verification**: Runs automated checks after fixes

## 🚀 **Quick Commands**

```bash
# Run complete audit and fix cycle
npm run audit-and-fix

# Individual components
npm run audit-services      # Audit services against golden pattern
npm run validate-schemas     # Check service/DB schema alignment
npm run generate-fixes       # Create fixes for detected issues
npm run generate-tests       # Create missing tests
npm run verify-fixes         # Verify all fixes work correctly
```

## 📁 **System Components**

- **`audit-services.ts`** - Service pattern comparison engine
- **`schema-validator.ts`** - Database/service field validator
- **`pattern-fixer.ts`** - Automated fix generator
- **`test-generator.ts`** - Test creation engine
- **`workflow-runner.ts`** - Main orchestration system
- **`patterns/`** - Golden pattern templates
- **`reports/`** - Generated audit reports

## 🔧 **Configuration**

Edit `automation/config.json` to customize:
- Golden pattern service (default: CartService)
- Services to audit
- Database schema location
- Test generation preferences
- Fix generation rules

## 📊 **Reports**

All runs generate detailed reports in `automation/reports/`:
- Service audit results
- Schema mismatch findings
- Generated fixes summary
- Test coverage analysis
- Verification results

This system ensures consistent code quality and eliminates the need for repetitive manual audits.
