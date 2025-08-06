# 🚀 Production Deployment Checklist

This checklist ensures your Farm Stand app is secure and ready for production deployment.

## 🔐 Authentication & Security

### Supabase Auth Settings
- [ ] **Re-enable email confirmations** in Supabase Dashboard
  - Go to Authentication → Settings
  - Turn ON "Enable email confirmations"
  - Configure email templates if needed

- [ ] **Review Row Level Security (RLS) policies**
  - Ensure all tables have appropriate RLS policies
  - Test with different user roles (customer, staff, admin)
  - Verify data isolation between users

- [ ] **API Key Security**
  - [ ] Use production Supabase project (not development)
  - [ ] Rotate anon key if it was exposed during development
  - [ ] Verify service role key is not exposed in client code

### Environment Variables
- [ ] **Create production environment file**
  - [ ] `EXPO_PUBLIC_SUPABASE_URL` (production project)
  - [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` (production key)
  - [ ] Remove any development/testing keys

## 📧 Email Configuration

- [ ] **Configure email provider** in Supabase
  - Set up custom SMTP (SendGrid, Mailgun, etc.)
  - Configure "From" email address
  - Test email delivery

- [ ] **Customize email templates**
  - Welcome email
  - Password reset email
  - Email confirmation
  - Order confirmation emails

## 🗄️ Database

- [ ] **Production database setup**
  - [ ] Run schema.sql in production Supabase project
  - [ ] Remove sample/test data
  - [ ] Set up database backups
  - [ ] Configure database monitoring

- [ ] **Data validation**
  - [ ] Test all CRUD operations
  - [ ] Verify foreign key constraints
  - [ ] Test with realistic data volumes

## 🛡️ Security Hardening

- [ ] **Rate Limiting**
  - Review Supabase rate limits
  - Configure appropriate limits for your use case
  - Test under load

- [ ] **CORS Settings**
  - Configure allowed origins in Supabase
  - Remove development URLs (localhost, etc.)

- [ ] **SSL/TLS**
  - Ensure all API calls use HTTPS
  - Verify certificate validity

## 📱 Mobile App

- [ ] **Build Configuration**
  - [ ] Update app version number
  - [ ] Configure production build settings
  - [ ] Remove development/debug features
  - [ ] Test on real devices

- [ ] **App Store Preparation**
  - [ ] App icons and splash screens
  - [ ] App store descriptions
  - [ ] Privacy policy and terms of service
  - [ ] Test submission build

## 🧪 Testing

- [ ] **End-to-End Testing**
  - [ ] User registration and login flow
  - [ ] Product browsing and search
  - [ ] Cart and checkout process
  - [ ] Order management (customer and staff)
  - [ ] QR code scanning for staff

- [ ] **Performance Testing**
  - [ ] Load testing with realistic user counts
  - [ ] Database query performance
  - [ ] Image loading and caching

## 📊 Monitoring & Analytics

- [ ] **Error Tracking**
  - Set up error monitoring (Sentry, Bugsnag, etc.)
  - Configure alert thresholds

- [ ] **Analytics**
  - Set up user analytics
  - Track key business metrics
  - Monitor app performance

## 🔄 Backup & Recovery

- [ ] **Database Backups**
  - Configure automatic backups in Supabase
  - Test backup restoration process

- [ ] **Disaster Recovery Plan**
  - Document recovery procedures
  - Test failover scenarios

## 📋 Documentation

- [ ] **User Documentation**
  - [ ] Customer user guide
  - [ ] Staff training materials
  - [ ] Admin panel documentation

- [ ] **Technical Documentation**
  - [ ] API documentation
  - [ ] Database schema documentation
  - [ ] Deployment procedures

## 🚨 CRITICAL REMINDERS

### 🔴 MUST DO BEFORE PRODUCTION:
1. **Turn ON email confirmations** in Supabase Auth settings
2. **Use production Supabase project** with production keys
3. **Remove all test/mock data** from production database
4. **Test the complete user flow** end-to-end
5. **Verify RLS policies** protect user data properly

### 📝 Save This Checklist
- Print this checklist or save it prominently
- Review it before each production deployment
- Update it as your app evolves

---

## 💡 Pro Tips

- **Separate Environments**: Use different Supabase projects for development, staging, and production
- **Gradual Rollout**: Consider a soft launch with limited users first
- **Monitor Closely**: Watch for issues in the first 24-48 hours after launch
- **Have a Rollback Plan**: Be prepared to quickly revert if critical issues arise

---

*Last Updated: $(date)*
*Review this checklist before every production deployment!*
