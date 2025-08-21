# Production Deployment Guide

**Phase 5: Production Readiness - Complete deployment documentation**

## Overview

This guide provides comprehensive instructions for deploying MyFarmstand Mobile to production with full performance optimization, security hardening, and monitoring capabilities.

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **React Native CLI**: Latest stable version
- **Database**: PostgreSQL 14+ with Supabase
- **Memory**: Minimum 4GB RAM for build process
- **Storage**: 10GB available space

### Required Environment Variables

```bash
# Core Configuration
NODE_ENV=production
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
JWT_SECRET=your-jwt-secret-min-32-chars
ENFORCE_HTTPS=true
HSTS_ENABLED=true

# Performance
CACHE_DEFAULT_TTL=300
QUERY_CACHE_TTL=300
MAX_REQUEST_SIZE=10485760

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30
SENTRY_DSN=https://your-sentry-dsn

# Rate Limiting
RATE_LIMIT_RPM=60
RATE_LIMIT_BURST=10
```

## Pre-Deployment Checklist

### 1. Code Quality Validation

```bash
# Run all validation checks
npm run validate:all
npm run typecheck
npm run lint

# Contract validation
npm run test:contracts
npm run validate:admin
```

### 2. Performance Testing

```bash
# Run performance test suite
npm run test:performance
npm run test:performance:queries
npm run test:performance:frontend

# Performance benchmarking
npm run performance:benchmark
```

### 3. Security Validation

```bash
# Run security audit
npm run test:security
npm run test:security:audit
npm run test:security:permissions

# Security audit
npm run security:audit
npm run secrets:validate
```

### 4. Integration Testing

```bash
# Run integration tests
npm run test:integration:e2e
npm run test:integration:analytics

# Full production test suite
npm run test:production
```

## Database Migration

### 1. Backup Current Database

```bash
# Create backup before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Apply Production Schema

```bash
# Apply production monitoring schema
psql $DATABASE_URL -f database/production-monitoring-schema.sql

# Verify migration
npm run migration:validate
```

### 3. Validate Migration

```bash
# Run migration validation tests
npm run test:deployment
npm run test:integration:e2e
```

## Production Build Process

### 1. Pre-Build Validation

```bash
# Validate environment
npm run prebuild:production

# Security validation
npm run secrets:validate
npm run secrets:audit
```

### 2. Build Application

```bash
# Production build
npm run build:production

# Verify build
npm run health:check
```

### 3. Post-Build Validation

```bash
# Validate production build
npm run test:production
npm run performance:benchmark
```

## Deployment Steps

### 1. Environment Setup

```bash
# Set production environment
export NODE_ENV=production

# Validate configuration
npm run test:deployment
```

### 2. Database Setup

```bash
# Apply final migrations
npm run migration:validate

# Setup monitoring
psql $DATABASE_URL -f database/production-monitoring-schema.sql
```

### 3. Application Deployment

```bash
# Deploy to production
npm run deploy:production

# Verify deployment
npm run health:check
```

### 4. Post-Deployment Validation

```bash
# Validate production deployment
npm run test:production
npm run security:audit
npm run performance:benchmark
```

## Monitoring and Observability

### Performance Monitoring

The system includes comprehensive performance monitoring:

- **Query Performance**: All database queries monitored for <500ms target
- **API Response Times**: REST endpoints monitored for <1s target
- **Memory Usage**: Heap usage monitored with 80% warning threshold
- **Cache Efficiency**: Redis cache hit ratio monitored for >85% target

### Security Monitoring

- **Audit Trail**: Complete security event logging
- **Permission Boundaries**: Role-based access control monitoring
- **Violation Detection**: Real-time security violation alerts
- **Compliance Reporting**: Automated security compliance reports

### Health Checks

```bash
# System health validation
curl https://your-domain.com/health

# Detailed health check
npm run health:check
```

### Monitoring Dashboards

Access monitoring dashboards at:

- **Performance**: `/monitoring/performance`
- **Security**: `/monitoring/security` 
- **System Health**: `/monitoring/health`
- **Analytics**: `/monitoring/analytics`

## Performance Optimization

### Database Optimization

- **Indexes**: Strategic indexes for common query patterns
- **Query Optimization**: Field selection optimization
- **Connection Pooling**: Optimized connection pool settings
- **Query Caching**: Intelligent query result caching

### Frontend Optimization

- **Code Splitting**: Role-based code splitting implemented
- **Bundle Optimization**: Optimized bundle sizes (<100KB per chunk)
- **Cache Strategy**: Optimized React Query cache configuration
- **Image Optimization**: Lazy loading and progressive enhancement

### Cross-Service Optimization

- **Service Coordination**: Intelligent service-to-service communication
- **Circuit Breakers**: Failure isolation and recovery
- **Load Balancing**: Optimized request distribution
- **Cache Coordination**: Cross-service cache invalidation

## Security Configuration

### RLS Policies

All tables protected with Row Level Security:

- **User Data Isolation**: Users can only access their own data
- **Role-Based Access**: Role-specific data access controls
- **Admin Oversight**: Admin access with audit trails
- **Cross-Role Boundaries**: Strict role permission boundaries

### Authentication & Authorization

- **JWT Security**: Secure token management
- **Session Management**: Secure session handling
- **Rate Limiting**: API rate limiting protection
- **Input Validation**: Comprehensive input sanitization

### Security Headers

```nginx
# Security headers configuration
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'";
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

## Troubleshooting

### Common Issues

**Performance Issues**
```bash
# Check query performance
npm run test:performance:queries

# Analyze slow queries
SELECT * FROM system_performance_metrics 
WHERE metric_category = 'query_performance' 
AND metric_value > 500;
```

**Security Issues**
```bash
# Check security violations
npm run test:security:audit

# Review audit logs
SELECT * FROM security_audit_logs 
WHERE access_granted = false 
ORDER BY audit_timestamp DESC;
```

**Integration Issues**
```bash
# Test service integration
npm run test:integration:e2e

# Check system health
npm run health:check
```

### Emergency Procedures

**Rollback Deployment**
```bash
# Rollback to previous version
git checkout previous-stable-tag
npm run deploy:production

# Validate rollback
npm run health:check
```

**Database Rollback**
```bash
# Restore from backup
psql $DATABASE_URL < backup_file.sql

# Validate data integrity
npm run migration:validate
```

## Monitoring Alerts

### Performance Alerts

- **Query Performance**: Alert if >5% of queries exceed 500ms
- **API Response**: Alert if response time exceeds 1000ms
- **Memory Usage**: Alert if memory usage exceeds 80%
- **Cache Efficiency**: Alert if cache hit ratio drops below 85%

### Security Alerts

- **Access Violations**: Immediate alert on security violations
- **Failed Logins**: Alert on multiple failed login attempts
- **Permission Escalation**: Alert on privilege escalation attempts
- **Audit Trail**: Alert on audit log anomalies

### System Alerts

- **Service Health**: Alert on service degradation
- **Database Issues**: Alert on database connection issues
- **Integration Failures**: Alert on cross-service failures
- **Resource Limits**: Alert on resource limit approaches

## Maintenance Procedures

### Regular Maintenance

**Daily**
- Review performance metrics
- Check security audit logs
- Validate system health

**Weekly**
- Run comprehensive test suite
- Review and optimize slow queries
- Update security policies

**Monthly**
- Performance optimization review
- Security compliance audit
- Capacity planning review

### Update Procedures

**Code Updates**
```bash
# Test updates in staging
npm run test:production

# Deploy to production
npm run deploy:production

# Validate deployment
npm run health:check
```

**Database Updates**
```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Apply updates
npm run migration:validate

# Validate changes
npm run test:integration:e2e
```

## Support and Escalation

### Support Contacts

- **Technical Issues**: technical-support@yourcompany.com
- **Security Issues**: security@yourcompany.com
- **Performance Issues**: performance@yourcompany.com

### Escalation Procedures

**Critical Issues (P0)**
- Immediate notification to on-call engineer
- Emergency response within 15 minutes
- Customer communication within 30 minutes

**High Priority Issues (P1)**
- Notification within 1 hour
- Response within 2 hours
- Resolution target: 4 hours

**Medium Priority Issues (P2)**
- Notification within 4 hours
- Response within 8 hours
- Resolution target: 24 hours

---

**Production Deployment Complete ✅**

Your MyFarmstand Mobile application is now production-ready with:

- ✅ **Performance Optimization**: <500ms query times, optimized frontend
- ✅ **Security Hardening**: Complete RLS coverage, comprehensive monitoring
- ✅ **Cross-Role Integration**: Validated workflows across all roles
- ✅ **Production Monitoring**: Real-time performance and security monitoring
- ✅ **Deployment Validation**: Complete test coverage and validation procedures

For ongoing support and monitoring, refer to the monitoring dashboards and alert configurations detailed above.