import { RealtimeService } from '../services/realtimeService';
import { ChannelManager } from './channelManager';
import { supabase } from '../config/supabase';

/**
 * Diagnostic utility to debug RealtimeService issues
 */
export class RealtimeDiagnostic {
  
  static async runFullDiagnostic() {
    console.log('🔍 Starting RealtimeService diagnostic...');
    
    try {
      // 1. Check Supabase connection
      console.log('1️⃣ Checking Supabase connection...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Supabase session error:', sessionError);
      } else {
        console.log('✅ Supabase connection OK, session:', session ? 'authenticated' : 'anonymous');
      }
      
      // 2. Check ChannelManager
      console.log('2️⃣ Checking ChannelManager...');
      try {
        const testChannel = ChannelManager.getChannel('diagnostic-test');
        console.log('✅ ChannelManager working, test channel created');
      } catch (error) {
        console.error('❌ ChannelManager error:', error);
      }
      
      // 3. Check RealtimeService subscriptions
      console.log('3️⃣ Checking RealtimeService subscriptions...');
      const status = RealtimeService.getSubscriptionStatus();
      console.log('📊 Subscription status:', status);
      
      if (status.totalSubscriptions === 0) {
        console.warn('⚠️ No subscriptions found - RealtimeService may not be initialized');
        console.log('🔧 Attempting to initialize...');
        RealtimeService.initializeAllSubscriptions();
        
        // Check again after initialization
        setTimeout(() => {
          const newStatus = RealtimeService.getSubscriptionStatus();
          console.log('📊 Post-initialization status:', newStatus);
        }, 2000);
      }
      
      // 4. Test simple broadcast
      console.log('4️⃣ Testing simple broadcast...');
      try {
        await ChannelManager.sendBroadcast('diagnostic-test', 'test-event', {
          message: 'Diagnostic test',
          timestamp: new Date().toISOString()
        });
        console.log('✅ Broadcast send successful');
      } catch (error) {
        console.error('❌ Broadcast send failed:', error);
      }
      
      console.log('🏁 Diagnostic complete');
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
    }
  }
  
  static logCurrentState() {
    console.log('📋 Current RealtimeService state:');
    console.log('- Subscription status:', RealtimeService.getSubscriptionStatus());
    console.log('- ChannelManager: Available');
  }
}
