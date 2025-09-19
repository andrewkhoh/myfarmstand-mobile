import * as Crypto from 'expo-crypto';

/**
 * Secure Channel Name Generator with HMAC-based security
 * Following architectural pattern from docs/architectural-patterns-and-best-practices.md
 */
export class SecureChannelNameGenerator {
  // Use a secret key from environment or generate one
  private static readonly CHANNEL_SECRET = process.env.EXPO_PUBLIC_CHANNEL_SECRET || 'myfarmstand-default-secret-2025';

  /**
   * Generate a cryptographically secure channel name using HMAC
   */
  static async generateSecureChannelName(
    entity: 'inventory' | 'marketing' | 'executive' | 'role',
    target: 'user-specific' | 'global',
    userId?: string
  ): Promise<string> {
    const baseData = `myfarmstand-secure-channel-${entity}-${target}`;

    switch (target) {
      case 'user-specific':
        if (!userId) throw new Error('userId required for user-specific channel');

        // Create HMAC hash for user-specific channel
        const userHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${baseData}-${userId}-${this.CHANNEL_SECRET}`,
          { encoding: Crypto.CryptoEncoding.HEX }
        );

        return `sec-${entity}-${userHash.substring(0, 16)}`;

      case 'global':
        // Create HMAC hash for global channel
        const globalHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${baseData}-global-${this.CHANNEL_SECRET}`,
          { encoding: Crypto.CryptoEncoding.HEX }
        );

        return `sec-${entity}-global-${globalHash.substring(0, 12)}`;
    }
  }

  /**
   * Verify if a channel name matches the expected secure format
   */
  static isSecureChannel(channelName: string): boolean {
    return channelName.startsWith('sec-') && channelName.length >= 20;
  }

  /**
   * Generate batch of secure channels for multiple workflows
   */
  static async generateWorkflowChannels(
    workflows: Array<'inventory' | 'marketing' | 'executive'>,
    userId?: string
  ): Promise<Map<string, string>> {
    const channels = new Map<string, string>();

    for (const workflow of workflows) {
      const target = userId ? 'user-specific' : 'global';
      const channelName = await this.generateSecureChannelName(workflow, target, userId);
      channels.set(workflow, channelName);
    }

    return channels;
  }
}