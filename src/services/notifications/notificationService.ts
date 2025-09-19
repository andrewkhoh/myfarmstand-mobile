import { supabase } from '../../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  categories: {
    inventory: boolean;
    marketing: boolean;
    sales: boolean;
    system: boolean;
    security: boolean;
  };
  urgencyLevels: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: 'inventory' | 'marketing' | 'sales' | 'system' | 'security';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  actionUrl?: string;
  data?: Record<string, any>;
  userId: string;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
  source: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  messageTemplate: string;
  category: Notification['category'];
  urgency: Notification['urgency'];
  actionRequired: boolean;
  variables: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes: number;
  userId: string;
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: number | string;
  timeWindow: number; // minutes
}

export interface AlertAction {
  type: 'notification' | 'email' | 'webhook' | 'auto_fix';
  config: Record<string, any>;
}

class NotificationService {
  private unreadCount = 0;
  private preferences: NotificationPreferences | null = null;
  private alertRules: AlertRule[] = [];
  private templates: NotificationTemplate[] = [];

  constructor() {
    this.loadPreferences();
    this.loadAlertRules();
    this.initializeTemplates();
  }

  // Core notification management
  async sendNotification(notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<string> {
    const now = new Date();
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fullNotification: Notification = {
      id,
      isRead: false,
      createdAt: now,
      ...notification
    };

    try {
      // Check if notification should be sent based on preferences
      if (!(await this.shouldSendNotification(fullNotification))) {
        console.log('Notification blocked by preferences:', fullNotification.title);
        return id;
      }

      // Store notification in database
      await this.storeNotification(fullNotification);

      // Send via enabled channels
      await this.deliverNotification(fullNotification);

      // Update unread count
      this.unreadCount++;

      return id;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw new Error('Notification delivery failed');
    }
  }

  async sendBulkNotifications(notifications: Array<Omit<Notification, 'id' | 'isRead' | 'createdAt'>>): Promise<string[]> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Bulk notification ${index} failed:`, result.reason);
        return '';
      }
    }).filter(Boolean);
  }

  // Template-based notifications
  async sendFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    userId: string,
    overrides?: Partial<Notification>
  ): Promise<string> {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Replace variables in message
    let message = template.messageTemplate;
    template.variables.forEach(variable => {
      const value = variables[variable] || `{${variable}}`;
      message = message.replace(new RegExp(`\\{${variable}\\}`, 'g'), String(value));
    });

    // Replace variables in title
    let title = template.title;
    template.variables.forEach(variable => {
      const value = variables[variable] || `{${variable}}`;
      title = title.replace(new RegExp(`\\{${variable}\\}`, 'g'), String(value));
    });

    return await this.sendNotification({
      title,
      message,
      category: template.category,
      urgency: template.urgency,
      actionRequired: template.actionRequired,
      userId,
      source: 'template',
      ...overrides
    });
  }

  // Alert rule management
  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullRule: AlertRule = { id, ...rule };

    try {
      await supabase
        .from('alert_rules')
        .insert({
          id: fullRule.id,
          name: fullRule.name,
          description: fullRule.description,
          enabled: fullRule.enabled,
          conditions: fullRule.conditions,
          actions: fullRule.actions,
          cooldown_minutes: fullRule.cooldownMinutes,
          user_id: fullRule.userId
        });

      this.alertRules.push(fullRule);
      return id;
    } catch (error) {
      console.error('Failed to create alert rule:', error);
      throw new Error('Alert rule creation failed');
    }
  }

  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<void> {
    try {
      await supabase
        .from('alert_rules')
        .update({
          name: updates.name,
          description: updates.description,
          enabled: updates.enabled,
          conditions: updates.conditions,
          actions: updates.actions,
          cooldown_minutes: updates.cooldownMinutes
        })
        .eq('id', id);

      const ruleIndex = this.alertRules.findIndex(r => r.id === id);
      if (ruleIndex >= 0) {
        this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
      }
    } catch (error) {
      console.error('Failed to update alert rule:', error);
      throw new Error('Alert rule update failed');
    }
  }

  async deleteAlertRule(id: string): Promise<void> {
    try {
      await supabase
        .from('alert_rules')
        .delete()
        .eq('id', id);

      this.alertRules = this.alertRules.filter(r => r.id !== id);
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
      throw new Error('Alert rule deletion failed');
    }
  }

  // Metric monitoring and alerting
  async checkAlerts(metrics: Record<string, number>): Promise<void> {
    const now = new Date();

    for (const rule of this.alertRules.filter(r => r.enabled)) {
      try {
        // Check if rule is in cooldown
        const lastTriggered = await this.getLastTriggeredTime(rule.id);
        if (lastTriggered && (now.getTime() - lastTriggered.getTime()) < rule.cooldownMinutes * 60 * 1000) {
          continue;
        }

        // Evaluate conditions
        const triggered = await this.evaluateConditions(rule.conditions, metrics);

        if (triggered) {
          await this.executeAlertActions(rule);
          await this.recordAlertTrigger(rule.id, now);
        }
      } catch (error) {
        console.error(`Failed to check alert rule ${rule.id}:`, error);
      }
    }
  }

  // Notification preferences
  async updatePreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    try {
      await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          preferences: preferences
        });

      this.preferences = preferences;
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw new Error('Preferences update failed');
    }
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    if (this.preferences) {
      return this.preferences;
    }

    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      this.preferences = data?.preferences || this.getDefaultPreferences();
      return this.preferences;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  // Notification history and management
  async getNotifications(userId: string, options?: {
    limit?: number;
    offset?: number;
    category?: Notification['category'];
    unreadOnly?: boolean;
  }): Promise<{ notifications: Notification[]; total: number }> {
    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      const notifications = (data || []).map(this.mapDatabaseNotification);

      return {
        notifications,
        total: count || 0
      };
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw new Error('Failed to load notifications');
    }
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      this.unreadCount = Math.max(0, this.unreadCount - notificationIds.length);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw new Error('Failed to update notifications');
    }
  }

  async deleteNotifications(notificationIds: string[]): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      throw new Error('Failed to delete notifications');
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      this.unreadCount = count || 0;
      return this.unreadCount;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  // Private helper methods
  private async shouldSendNotification(notification: Notification): Promise<boolean> {
    if (!this.preferences) {
      await this.loadPreferences();
    }

    if (!this.preferences) return true;

    // Check category preferences
    if (!this.preferences.categories[notification.category]) {
      return false;
    }

    // Check urgency preferences
    if (!this.preferences.urgencyLevels[notification.urgency]) {
      return false;
    }

    // Check quiet hours
    if (this.preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (this.isInQuietHours(currentTime, this.preferences.quietHours.start, this.preferences.quietHours.end)) {
        // Only allow critical notifications during quiet hours
        return notification.urgency === 'critical';
      }
    }

    return true;
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.preferences?.pushNotifications) {
      promises.push(this.sendPushNotification(notification));
    }

    if (this.preferences?.emailNotifications) {
      promises.push(this.sendEmailNotification(notification));
    }

    if (this.preferences?.smsNotifications && notification.urgency === 'critical') {
      promises.push(this.sendSMSNotification(notification));
    }

    await Promise.allSettled(promises);
  }

  private async storeNotification(notification: Notification): Promise<void> {
    await supabase
      .from('notifications')
      .insert({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        urgency: notification.urgency,
        action_required: notification.actionRequired,
        action_url: notification.actionUrl,
        data: notification.data,
        user_id: notification.userId,
        is_read: notification.isRead,
        created_at: notification.createdAt.toISOString(),
        expires_at: notification.expiresAt?.toISOString(),
        source: notification.source
      });
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    // Implementation would integrate with push notification service (FCM, APNS, etc.)
    console.log('Sending push notification:', notification.title);
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    // Implementation would integrate with email service
    console.log('Sending email notification:', notification.title);
  }

  private async sendSMSNotification(notification: Notification): Promise<void> {
    // Implementation would integrate with SMS service
    console.log('Sending SMS notification:', notification.title);
  }

  private async evaluateConditions(conditions: AlertCondition[], metrics: Record<string, number>): Promise<boolean> {
    return conditions.every(condition => {
      const metricValue = metrics[condition.metric];
      if (metricValue === undefined) return false;

      switch (condition.operator) {
        case '>': return metricValue > Number(condition.value);
        case '<': return metricValue < Number(condition.value);
        case '=': return metricValue === Number(condition.value);
        case '>=': return metricValue >= Number(condition.value);
        case '<=': return metricValue <= Number(condition.value);
        case '!=': return metricValue !== Number(condition.value);
        default: return false;
      }
    });
  }

  private async executeAlertActions(rule: AlertRule): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'notification':
            await this.sendNotification({
              title: `Alert: ${rule.name}`,
              message: rule.description,
              category: 'system',
              urgency: 'high',
              actionRequired: true,
              userId: rule.userId,
              source: 'alert_rule'
            });
            break;

          case 'email':
            // Email action implementation
            break;

          case 'webhook':
            // Webhook action implementation
            break;

          case 'auto_fix':
            // Auto-fix action implementation
            break;
        }
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }
  }

  private async getLastTriggeredTime(ruleId: string): Promise<Date | null> {
    try {
      const { data } = await supabase
        .from('alert_triggers')
        .select('triggered_at')
        .eq('rule_id', ruleId)
        .order('triggered_at', { ascending: false })
        .limit(1)
        .single();

      return data ? new Date(data.triggered_at) : null;
    } catch {
      return null;
    }
  }

  private async recordAlertTrigger(ruleId: string, triggeredAt: Date): Promise<void> {
    await supabase
      .from('alert_triggers')
      .insert({
        rule_id: ruleId,
        triggered_at: triggeredAt.toISOString()
      });
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        this.preferences = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load preferences from storage:', error);
    }
  }

  private async loadAlertRules(): Promise<void> {
    // Load alert rules from database on initialization
    try {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('enabled', true);

      if (error) {
        // If table doesn't exist (404), just use empty array
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('Alert rules table not found, using empty alert rules');
          this.alertRules = [];
          return;
        }
        throw error;
      }

      this.alertRules = (data || []).map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        conditions: rule.conditions,
        actions: rule.actions,
        cooldownMinutes: rule.cooldown_minutes,
        userId: rule.user_id
      }));
    } catch (error) {
      console.warn('Alert rules table not available, using empty alert rules:', error);
      this.alertRules = [];
    }
  }

  private initializeTemplates(): void {
    this.templates = [
      {
        id: 'low_stock_alert',
        name: 'Low Stock Alert',
        title: 'Low Stock: {productName}',
        messageTemplate: 'Product {productName} is running low with only {currentStock} units remaining.',
        category: 'inventory',
        urgency: 'medium',
        actionRequired: true,
        variables: ['productName', 'currentStock']
      },
      {
        id: 'campaign_performance',
        name: 'Campaign Performance',
        title: 'Campaign Update: {campaignName}',
        messageTemplate: 'Your campaign {campaignName} has reached {metric} of {value}.',
        category: 'marketing',
        urgency: 'low',
        actionRequired: false,
        variables: ['campaignName', 'metric', 'value']
      },
      {
        id: 'system_maintenance',
        name: 'System Maintenance',
        title: 'Scheduled Maintenance',
        messageTemplate: 'System maintenance is scheduled for {date} at {time}. Expected duration: {duration}.',
        category: 'system',
        urgency: 'medium',
        actionRequired: false,
        variables: ['date', 'time', 'duration']
      }
    ];
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      categories: {
        inventory: true,
        marketing: true,
        sales: true,
        system: true,
        security: true
      },
      urgencyLevels: {
        low: true,
        medium: true,
        high: true,
        critical: true
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  private isInQuietHours(currentTime: string, start: string, end: string): boolean {
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes <= endMinutes) {
      // Same day range
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight range
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  private mapDatabaseNotification(data: any): Notification {
    return {
      id: data.id,
      title: data.title,
      message: data.message,
      category: data.category,
      urgency: data.urgency,
      actionRequired: data.action_required,
      actionUrl: data.action_url,
      data: data.data,
      userId: data.user_id,
      isRead: data.is_read,
      createdAt: new Date(data.created_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      source: data.source
    };
  }
}

export const notificationService = new NotificationService();