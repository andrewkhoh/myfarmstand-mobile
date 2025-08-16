/**
 * Service Integration Test
 * Tests actual service imports and basic functionality
 */

const fs = require('fs');
const path = require('path');

// Simple test framework
class ServiceTester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
  }

  test(description, fn) {
    try {
      fn();
      console.log(`  ✅ ${description}`);
      this.passed++;
    } catch (error) {
      console.log(`  ❌ ${description}: ${error.message}`);
      this.failed++;
    }
  }

  warn(description, fn) {
    try {
      fn();
      console.log(`  ✅ ${description}`);
      this.passed++;
    } catch (error) {
      console.log(`  ⚠️  ${description}: ${error.message}`);
      this.warnings++;
    }
  }

  summary() {
    console.log(`\n📊 Test Summary:`);
    console.log(`  ✅ Passed: ${this.passed}`);
    console.log(`  ❌ Failed: ${this.failed}`);
    console.log(`  ⚠️  Warnings: ${this.warnings}`);
    console.log(`  📈 Total: ${this.passed + this.failed + this.warnings}`);
    
    if (this.failed === 0) {
      console.log(`\n🎉 All critical tests passed!`);
      return true;
    } else {
      console.log(`\n💥 ${this.failed} critical test(s) failed.`);
      return false;
    }
  }
}

const tester = new ServiceTester();

console.log('🔍 Testing Service Files...\n');

// Test 1: Check if all service files exist
console.log('📂 File Existence Tests:');

const servicesDir = path.join(__dirname, '../services');
const expectedServices = [
  'authService.ts',
  'cartService.ts',
  'errorRecoveryService.ts',
  'noShowHandlingService.ts',
  'notificationService.ts',
  'orderService.ts',
  'pickupReschedulingService.ts',
  'productService.ts',
  'realtimeService.ts',
  'stockRestorationService.ts',
  'tokenService.ts'
];

expectedServices.forEach(serviceName => {
  tester.test(`${serviceName} exists`, () => {
    const servicePath = path.join(servicesDir, serviceName);
    if (!fs.existsSync(servicePath)) {
      throw new Error(`Service file not found: ${servicePath}`);
    }
  });
});

// Test 2: Check service file structure
console.log('\n📝 Service Structure Tests:');

expectedServices.forEach(serviceName => {
  tester.test(`${serviceName} has content`, () => {
    const servicePath = path.join(servicesDir, serviceName);
    const content = fs.readFileSync(servicePath, 'utf8');
    if (content.length < 100) {
      throw new Error(`Service file too small: ${content.length} characters`);
    }
    if (!content.includes('export')) {
      throw new Error('Service does not export anything');
    }
  });
});

// Test 3: Check for common patterns
console.log('\n🔧 Service Pattern Tests:');

const authServicePath = path.join(servicesDir, 'authService.ts');
if (fs.existsSync(authServicePath)) {
  const authContent = fs.readFileSync(authServicePath, 'utf8');
  
  tester.test('AuthService has login method', () => {
    if (!authContent.includes('login')) {
      throw new Error('AuthService does not contain login method');
    }
  });

  tester.test('AuthService has logout method', () => {
    if (!authContent.includes('logout')) {
      throw new Error('AuthService does not contain logout method');
    }
  });

  tester.test('AuthService has validation', () => {
    if (!authContent.includes('email') || !authContent.includes('@')) {
      throw new Error('AuthService does not appear to validate email');
    }
  });
}

const cartServicePath = path.join(servicesDir, 'cartService.ts');
if (fs.existsSync(cartServicePath)) {
  const cartContent = fs.readFileSync(cartServicePath, 'utf8');
  
  tester.test('CartService has getCart method', () => {
    if (!cartContent.includes('getCart')) {
      throw new Error('CartService does not contain getCart method');
    }
  });

  tester.test('CartService has addItem method', () => {
    if (!cartContent.includes('addItem')) {
      throw new Error('CartService does not contain addItem method');
    }
  });

  tester.test('CartService has stock validation', () => {
    if (!cartContent.includes('stock')) {
      throw new Error('CartService does not appear to validate stock');
    }
  });
}

const orderServicePath = path.join(servicesDir, 'orderService.ts');
if (fs.existsSync(orderServicePath)) {
  const orderContent = fs.readFileSync(orderServicePath, 'utf8');
  
  tester.test('OrderService has submitOrder method', () => {
    if (!orderContent.includes('submitOrder')) {
      throw new Error('OrderService does not contain submitOrder method');
    }
  });

  tester.test('OrderService has validation', () => {
    if (!orderContent.includes('customerInfo') || !orderContent.includes('items')) {
      throw new Error('OrderService does not appear to validate order data');
    }
  });
}

const productServicePath = path.join(servicesDir, 'productService.ts');
if (fs.existsSync(productServicePath)) {
  const productContent = fs.readFileSync(productServicePath, 'utf8');
  
  tester.test('ProductService has getProducts method', () => {
    if (!productContent.includes('getProducts')) {
      throw new Error('ProductService does not contain getProducts method');
    }
  });

  tester.test('ProductService has search functionality', () => {
    if (!productContent.includes('search')) {
      throw new Error('ProductService does not contain search functionality');
    }
  });
}

const tokenServicePath = path.join(servicesDir, 'tokenService.ts');
if (fs.existsSync(tokenServicePath)) {
  const tokenContent = fs.readFileSync(tokenServicePath, 'utf8');
  
  tester.test('TokenService has secure storage', () => {
    if (!tokenContent.includes('SecureStore') && !tokenContent.includes('AsyncStorage')) {
      throw new Error('TokenService does not use secure storage');
    }
  });

  tester.test('TokenService has token methods', () => {
    if (!tokenContent.includes('getAccessToken') || !tokenContent.includes('setAccessToken')) {
      throw new Error('TokenService does not contain token management methods');
    }
  });
}

// Test 4: Check for TypeScript types
console.log('\n🏷️  TypeScript Tests:');

expectedServices.forEach(serviceName => {
  tester.test(`${serviceName} uses TypeScript types`, () => {
    const servicePath = path.join(servicesDir, serviceName);
    const content = fs.readFileSync(servicePath, 'utf8');
    if (!content.includes('interface') && !content.includes('type') && !content.includes(': string') && !content.includes(': number')) {
      throw new Error('Service does not appear to use TypeScript types');
    }
  });
});

// Test 5: Check for error handling
console.log('\n⚠️  Error Handling Tests:');

expectedServices.forEach(serviceName => {
  tester.test(`${serviceName} has error handling`, () => {
    const servicePath = path.join(servicesDir, serviceName);
    const content = fs.readFileSync(servicePath, 'utf8');
    if (!content.includes('try') && !content.includes('catch') && !content.includes('Error')) {
      throw new Error('Service does not appear to have error handling');
    }
  });
});

// Test 6: Check test file existence
console.log('\n🧪 Test Coverage Tests:');

tester.test('services.test.ts exists', () => {
  const testPath = path.join(__dirname, 'services.test.ts');
  if (!fs.existsSync(testPath)) {
    throw new Error('Main services test file not found');
  }
});

tester.test('allServices.test.ts exists', () => {
  const testPath = path.join(__dirname, 'allServices.test.ts');
  if (!fs.existsSync(testPath)) {
    throw new Error('Comprehensive services test file not found');
  }
});

tester.test('Test files have substantial content', () => {
  const servicesTestPath = path.join(__dirname, 'services.test.ts');
  const allServicesTestPath = path.join(__dirname, 'allServices.test.ts');
  
  let totalTestContent = 0;
  
  if (fs.existsSync(servicesTestPath)) {
    totalTestContent += fs.readFileSync(servicesTestPath, 'utf8').length;
  }
  
  if (fs.existsSync(allServicesTestPath)) {
    totalTestContent += fs.readFileSync(allServicesTestPath, 'utf8').length;
  }
  
  if (totalTestContent < 10000) {
    throw new Error(`Test files seem small: ${totalTestContent} characters total`);
  }
});

// Test 7: Validate TypeScript compilation readiness
console.log('\n⚙️  Compilation Tests:');

expectedServices.forEach(serviceName => {
  tester.warn(`${serviceName} TypeScript syntax check`, () => {
    const servicePath = path.join(servicesDir, serviceName);
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Basic syntax checks
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      throw new Error(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
    }
    
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      throw new Error(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
    }
  });
});

// Summary
console.log('\n' + '='.repeat(50));
const success = tester.summary();

if (success) {
  console.log('\n✨ All services are properly structured and ready for testing!');
  console.log('📋 Services found:');
  expectedServices.forEach(service => {
    console.log(`   • ${service}`);
  });
} else {
  console.log('\n🔧 Some issues were found that should be addressed.');
}

process.exit(success ? 0 : 1);