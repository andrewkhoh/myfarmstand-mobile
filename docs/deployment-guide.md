# 🚀 EAS Deployment Guide

Complete guide for deploying MyFarmstand Mobile using Expo Application Services (EAS) with built-in security safeguards.

## 📋 **Prerequisites**

### **Required Tools**
```bash
# Install EAS CLI globally
npm install -g @expo/eas-cli

# Login to Expo account
eas login

# Configure project (if not already done)
eas build:configure
```

### **Required Environment Variables**

Set these in your Expo project settings or via EAS CLI:

```bash
# Required for all environments
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Channel security (recommended for production)
EXPO_PUBLIC_CHANNEL_SECRET=your-secret-key
```

## 🏗 **Build Profiles**

The project includes 4 pre-configured build profiles in `eas.json`:

### **🔧 Development**
```bash
npm run build:development
```
- **Purpose**: Development builds with debug features
- **Distribution**: Internal only
- **Security**: Allows development scripts and test features
- **Channel**: `development`

### **🧪 Staging** 
```bash
npm run build:staging
```
- **Purpose**: Production-like testing environment
- **Distribution**: Internal only
- **Security**: Development scripts disabled, but debugging allowed
- **Channel**: `staging`

### **📱 Preview**
```bash
npm run build:preview
```
- **Purpose**: Internal previews and demos
- **Distribution**: Internal only
- **Security**: Production-level security, limited debugging
- **Channel**: `preview`

### **🚀 Production**
```bash
npm run build:production
```
- **Purpose**: App store releases
- **Distribution**: App stores (iOS App Store, Google Play)
- **Security**: Maximum security, all debug features disabled
- **Channel**: `production`

## 🔐 **Security Safeguards**

### **Automatic Validation**

Every build runs pre-build validation that checks:

1. **🛡 Database Safety**: Prevents test PINs and dev scripts in production
2. **🔑 Environment Variables**: Ensures required config is present  
3. **🚨 Security Flags**: Blocks debug features in production builds
4. **📱 Kiosk PIN Security**: Validates no hardcoded test PINs in code
5. **📦 Dependencies**: Confirms all packages are properly installed

### **Manual Safety Commands**

```bash
# Check database safety for current environment
npm run db:safety

# Archive development scripts before production build
npm run db:archive

# Scan for security issues
npm run db:scan

# Run full pre-build validation
npm run prebuild:validate
```

## 🚨 **Kiosk PIN Security**

### **CRITICAL: Development PINs**

The following test PINs are **ONLY for development**:
- **1234** - Development Staff
- **5678** - Development Manager  
- **9999** - Development Admin

⚠️ **These PINs are automatically blocked in production builds**

### **Production PIN Setup**

For production deployment:

1. **Never run** `database/kiosk-dev-setup.sql` in production
2. **Generate unique 4-digit PINs** for each staff member
3. **Use proper role assignment** (staff/manager/admin)
4. **Test authentication** in staging environment first

Example production PIN creation:
```sql
-- Production-safe PIN creation (run manually)
INSERT INTO staff_pins (user_id, pin, is_active) 
VALUES ('real-user-id', '7452', true);
```

## 📋 **Step-by-Step Deployment**

### **🔧 Development Build**

```bash
# 1. Validate environment
npm run db:safety

# 2. Run tests
npm run test:all

# 3. Build for development
npm run build:development
```

### **🧪 Staging Deployment**

```bash
# 1. Archive dev scripts
npm run db:archive

# 2. Validate staging safety
EXPO_PUBLIC_ENV=staging npm run db:safety

# 3. Run production-level tests
npm run test:all

# 4. Build for staging
npm run build:staging

# 5. Test in staging environment
# - Verify kiosk authentication works
# - Test all critical user flows
# - Validate environment variables
```

### **🚀 Production Deployment**

```bash
# 1. Ensure clean repository
git status  # Should be clean

# 2. Archive all development scripts
npm run db:archive

# 3. Run comprehensive validation
npm run prebuild:production

# 4. Build for production
npm run build:production

# 5. Submit to app stores (optional)
eas submit --platform ios
eas submit --platform android
```

## 🛡 **Security Checklist**

Before **ANY** production deployment:

### **✅ Database Security**
- [ ] All development setup scripts archived
- [ ] No test PINs (1234, 5678, 9999) in database
- [ ] RLS policies enabled on all tables
- [ ] Production staff PINs generated and tested

### **✅ Environment Security** 
- [ ] All required environment variables set
- [ ] No debug flags enabled in production
- [ ] Secrets properly configured in EAS
- [ ] Channel security keys rotated

### **✅ Code Security**
- [ ] No hardcoded test credentials
- [ ] No development-only features in production code
- [ ] All tests passing
- [ ] Code reviewed and approved

### **✅ Build Security**
- [ ] Pre-build validation passes
- [ ] Correct build profile selected
- [ ] Environment variables verified
- [ ] Distribution channel confirmed

## 🔧 **Troubleshooting**

### **Common Issues**

#### **"Database safety check failed"**
```bash
# Check what's causing the failure
npm run db:scan production

# Archive problematic dev scripts
npm run db:archive

# Re-run validation
npm run db:safety
```

#### **"Missing environment variables"**
```bash
# Set via EAS CLI
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."

# Or set in Expo dashboard
# Visit: https://expo.dev/accounts/[account]/projects/[project]/secrets
```

#### **"Test PINs found in code"**
This indicates hardcoded test PINs in source code:
```bash
# Search for test PINs
grep -r "1234\|5678\|9999" src/

# Remove any hardcoded test values
# Use environment variables or database lookups instead
```

#### **"Build dependencies failed"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Update EAS CLI
npm install -g @expo/eas-cli@latest
```

## 📱 **Environment Variables Reference**

### **Required (All Environments)**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Optional Security**
```bash
EXPO_PUBLIC_CHANNEL_SECRET=your-secret-for-secure-channels
```

### **Development Only**
```bash
EXPO_PUBLIC_ALLOW_DEV_SCRIPTS=true
EXPO_PUBLIC_SHOW_TESTS=true
```

### **Build-Time Configuration**
```bash
NODE_ENV=production|staging|development
EXPO_PUBLIC_ENV=production|staging|development|preview
```

## 🎯 **Quick Commands Reference**

```bash
# Security & Validation
npm run db:safety              # Check database safety
npm run db:archive             # Archive dev scripts
npm run prebuild:validate      # Full pre-build check
npm run prebuild:production    # Production pre-build check

# Building
npm run build:development      # Development build
npm run build:staging          # Staging build  
npm run build:production       # Production build
npm run build:preview          # Preview build

# Testing
npm run test:all               # All tests
npm run test:services          # Service layer tests
npm run test:hooks             # Hook layer tests

# EAS Direct Commands
eas build --profile production     # Direct EAS build
eas submit --platform ios          # Submit to iOS App Store
eas submit --platform android      # Submit to Google Play
```

## 📞 **Support**

If you encounter issues:

1. **Check validation output** - The scripts provide detailed error messages
2. **Review security checklist** - Ensure all items are completed
3. **Test in staging first** - Never deploy directly to production
4. **Archive dev scripts** - Use `npm run db:archive` before production builds

The deployment framework is designed to prevent security issues - trust the validation scripts and fix any reported problems before proceeding.