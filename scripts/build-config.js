#!/usr/bin/env node
/**
 * Build-time Configuration Script
 * 
 * Loads secrets from temp-secrets.json (created by setup-secrets.js)
 * and makes them available to app.config.js at build time.
 */

const fs = require('fs');
const path = require('path');

function loadSecretsForBuild() {
  const tempSecretsPath = path.join(__dirname, '..', 'temp-secrets.json');
  const envSecretPath = path.join(__dirname, '..', '.env.secret');
  
  let secrets = {};
  
  // Try temp-secrets.json first (from setup-secrets.js)
  if (fs.existsSync(tempSecretsPath)) {
    try {
      const tempSecrets = JSON.parse(fs.readFileSync(tempSecretsPath, 'utf8'));
      secrets = { ...secrets, ...tempSecrets };
      console.log('📄 Loaded secrets from temp-secrets.json for build');
    } catch (error) {
      console.warn('⚠ Could not read temp-secrets.json:', error.message);
    }
  }
  
  // Fallback to .env.secret for backward compatibility
  if (Object.keys(secrets).length === 0 && fs.existsSync(envSecretPath)) {
    try {
      const content = fs.readFileSync(envSecretPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            secrets[key] = value;
          }
        }
      });
      
      console.log('📄 Loaded secrets from .env.secret for build');
    } catch (error) {
      console.warn('⚠ Could not read .env.secret:', error.message);
    }
  }
  
  // Set environment variables for app.config.js
  if (secrets.SUPABASE_URL) {
    process.env.BUILD_SUPABASE_URL = secrets.SUPABASE_URL;
  }
  if (secrets.SUPABASE_ANON_KEY) {
    process.env.BUILD_SUPABASE_ANON_KEY = secrets.SUPABASE_ANON_KEY;
  }
  if (secrets.CHANNEL_SECRET) {
    process.env.BUILD_CHANNEL_SECRET = secrets.CHANNEL_SECRET;
  }
  if (secrets.DEBUG_CHANNELS) {
    process.env.BUILD_DEBUG_CHANNELS = secrets.DEBUG_CHANNELS;
  }
  
  return secrets;
}

module.exports = { loadSecretsForBuild };