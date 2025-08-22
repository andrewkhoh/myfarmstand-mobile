// Phase 3.5.4: User-Friendly Marketing Error Messages
// Following docs/architectural-patterns-and-best-practices.md User Experience Patterns
// Pattern: User-friendly error messages with actionable guidance

export type MarketingErrorCode = 
  | 'CONTENT_CREATION_FAILED'
  | 'CONTENT_FETCH_FAILED'
  | 'CONTENT_UPDATE_FAILED'
  | 'INVALID_WORKFLOW_TRANSITION'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'CAMPAIGN_CREATION_FAILED'
  | 'CAMPAIGN_ACTIVATION_FAILED'
  | 'CAMPAIGN_SCHEDULING_FAILED'
  | 'BUNDLE_CREATION_FAILED'
  | 'BUNDLE_ACTIVATION_FAILED'
  | 'INVENTORY_VALIDATION_FAILED'
  | 'DISCOUNT_CALCULATION_FAILED'
  | 'FILE_UPLOAD_FAILED'
  | 'CONFLICT_RESOLUTION_FAILED';

export interface UserFriendlyError {
  title: string;
  message: string;
  actionable: string;
  technical?: string;
  severity: 'info' | 'warning' | 'error';
}

export class MarketingErrorMessageService {
  /**
   * Convert technical error codes to user-friendly messages
   */
  static getUserFriendlyError(
    errorCode: MarketingErrorCode,
    context?: string,
    technicalMessage?: string
  ): UserFriendlyError {
    const errorMappings: Record<MarketingErrorCode, UserFriendlyError> = {
      CONTENT_CREATION_FAILED: {
        title: 'Unable to Create Content',
        message: 'We couldn\'t create your marketing content right now.',
        actionable: 'Please check that all required fields are filled out and try again. If the problem persists, contact support.',
        severity: 'error'
      },

      CONTENT_FETCH_FAILED: {
        title: 'Content Not Available',
        message: 'We couldn\'t load the content you\'re looking for.',
        actionable: 'This content may have been moved or deleted. Try refreshing the page or searching for similar content.',
        severity: 'warning'
      },

      CONTENT_UPDATE_FAILED: {
        title: 'Changes Not Saved',
        message: 'Your content changes couldn\'t be saved.',
        actionable: 'Please try saving again. If you continue to have trouble, copy your changes and refresh the page before trying again.',
        severity: 'error'
      },

      INVALID_WORKFLOW_TRANSITION: {
        title: 'Invalid Content Status Change',
        message: 'This content can\'t be moved to the requested status.',
        actionable: 'Content must follow the approval workflow: Draft → Review → Approved → Published. Check the current status and try the next valid step.',
        severity: 'warning'
      },

      INSUFFICIENT_PERMISSIONS: {
        title: 'Access Not Allowed',
        message: 'You don\'t have permission to perform this action.',
        actionable: 'Contact your manager or system administrator to request the necessary permissions for this operation.',
        severity: 'warning'
      },

      CAMPAIGN_CREATION_FAILED: {
        title: 'Campaign Setup Failed',
        message: 'We couldn\'t create your marketing campaign.',
        actionable: 'Please verify all campaign details (dates, budget, products) and try again. Ensure start date is before end date.',
        severity: 'error'
      },

      CAMPAIGN_ACTIVATION_FAILED: {
        title: 'Campaign Couldn\'t Start',
        message: 'Your campaign couldn\'t be activated at this time.',
        actionable: 'Check that your campaign has content assigned, inventory is available for featured products, and all required approvals are in place.',
        severity: 'error'
      },

      CAMPAIGN_SCHEDULING_FAILED: {
        title: 'Campaign Scheduling Error',
        message: 'We couldn\'t schedule your campaign for the requested time.',
        actionable: 'Verify the start and end dates are valid and don\'t conflict with existing campaigns. Try scheduling for a different time.',
        severity: 'warning'
      },

      BUNDLE_CREATION_FAILED: {
        title: 'Bundle Setup Failed',
        message: 'Your product bundle couldn\'t be created.',
        actionable: 'Check that all selected products are available, pricing provides meaningful savings, and you have permission to create bundles.',
        severity: 'error'
      },

      BUNDLE_ACTIVATION_FAILED: {
        title: 'Bundle Activation Failed',
        message: 'This bundle couldn\'t be made available to customers.',
        actionable: 'Verify that all products in the bundle have sufficient inventory and are currently active. Check inventory levels and try again.',
        severity: 'error'
      },

      INVENTORY_VALIDATION_FAILED: {
        title: 'Inventory Check Failed',
        message: 'We couldn\'t verify product availability for this operation.',
        actionable: 'The inventory system may be temporarily unavailable. Please try again in a few moments or check inventory levels manually.',
        severity: 'warning'
      },

      DISCOUNT_CALCULATION_FAILED: {
        title: 'Pricing Calculation Error',
        message: 'We couldn\'t calculate the final pricing for this bundle or campaign.',
        actionable: 'Check that discount percentages are between 0-100% and that base prices are valid. Try updating the pricing details.',
        severity: 'error'
      },

      FILE_UPLOAD_FAILED: {
        title: 'File Upload Failed',
        message: 'Your image or file couldn\'t be uploaded.',
        actionable: 'Check that your file is under 10MB, in a supported format (JPG, PNG, PDF), and you have a stable internet connection.',
        severity: 'error'
      },

      CONFLICT_RESOLUTION_FAILED: {
        title: 'Edit Conflict Detected',
        message: 'Someone else has modified this content while you were editing.',
        actionable: 'Please refresh the page to see the latest changes, then reapply your edits. Consider coordinating with your team to avoid conflicts.',
        severity: 'warning'
      }
    };

    const baseError = errorMappings[errorCode];
    
    return {
      ...baseError,
      technical: technicalMessage,
      message: context ? `${baseError.message} ${this.getContextualGuidance(context)}` : baseError.message
    };
  }

  /**
   * Provide contextual guidance based on operation context
   */
  private static getContextualGuidance(context: string): string {
    const contextGuidance: Record<string, string> = {
      'content_creation': 'Make sure your content includes a title and follows your organization\'s content guidelines.',
      'campaign_launch': 'Verify that your campaign has approved content and sufficient budget allocation.',
      'bundle_setup': 'Ensure all products in your bundle are active and have adequate inventory.',
      'file_upload': 'Try using a smaller file size or different image format.',
      'workflow_transition': 'Review the content approval process with your team lead.',
      'inventory_check': 'Confirm product availability in the inventory management system.',
      'collaboration': 'Consider using the draft feature to coordinate changes with team members.'
    };

    return contextGuidance[context] || '';
  }

  /**
   * Get user-friendly success messages
   */
  static getSuccessMessage(operation: string, entityType: 'content' | 'campaign' | 'bundle'): string {
    const operations: Record<string, Record<string, string>> = {
      created: {
        content: 'Content created successfully! It\'s now in draft status and ready for editing.',
        campaign: 'Campaign created successfully! You can now add content and schedule activation.',
        bundle: 'Bundle created successfully! Review pricing and inventory, then activate when ready.'
      },
      updated: {
        content: 'Content updated successfully! Changes have been saved and are ready for review.',
        campaign: 'Campaign updated successfully! Changes will take effect immediately for active campaigns.',
        bundle: 'Bundle updated successfully! Pricing and availability have been refreshed.'
      },
      activated: {
        content: 'Content published successfully! It\'s now visible to customers.',
        campaign: 'Campaign activated successfully! Performance tracking has begun.',
        bundle: 'Bundle activated successfully! It\'s now available for purchase.'
      },
      uploaded: {
        content: 'File uploaded successfully! Your content now includes the new media.',
        campaign: 'Campaign assets uploaded successfully! Images are ready to use.',
        bundle: 'Bundle images uploaded successfully! Product gallery has been updated.'
      }
    };

    return operations[operation]?.[entityType] || `${entityType} ${operation} successfully!`;
  }

  /**
   * Format validation errors for user display
   */
  static formatValidationErrors(errors: Array<{ field: string; message: string }>): UserFriendlyError {
    const fieldNames: Record<string, string> = {
      'marketingTitle': 'Marketing Title',
      'marketingDescription': 'Marketing Description', 
      'contentStatus': 'Content Status',
      'contentPriority': 'Content Priority',
      'campaignName': 'Campaign Name',
      'startDate': 'Start Date',
      'endDate': 'End Date',
      'discountPercentage': 'Discount Percentage',
      'bundleName': 'Bundle Name',
      'bundlePrice': 'Bundle Price',
      'products': 'Products'
    };

    const userFriendlyErrors = errors.map(error => {
      const friendlyField = fieldNames[error.field] || error.field;
      return `${friendlyField}: ${error.message}`;
    });

    return {
      title: 'Please Fix These Issues',
      message: 'Some fields need attention before you can continue:',
      actionable: userFriendlyErrors.join('\n• '),
      severity: 'warning'
    };
  }

  /**
   * Get progressive error guidance based on retry count
   */
  static getProgressiveGuidance(errorCode: MarketingErrorCode, retryCount: number): string {
    if (retryCount === 0) return '';

    const progressiveGuidance: Record<MarketingErrorCode, string[]> = {
      CONTENT_CREATION_FAILED: [
        'Try refreshing the page and attempting again.',
        'Check your internet connection and retry.',
        'Contact support if this continues - there may be a system issue.'
      ],
      CAMPAIGN_ACTIVATION_FAILED: [
        'Verify all campaign requirements are met and retry.',
        'Check with your team that no conflicting campaigns are running.',
        'Contact your manager if campaign activation continues to fail.'
      ],
      BUNDLE_CREATION_FAILED: [
        'Double-check product availability and pricing.',
        'Try creating the bundle with fewer products first.',
        'Contact inventory management if products seem unavailable.'
      ],
      INVENTORY_VALIDATION_FAILED: [
        'Wait a moment and try again - inventory may be updating.',
        'Check the inventory system directly for current stock levels.',
        'Contact system administrators if inventory validation keeps failing.'
      ],
      // Add progressive guidance for other error codes as needed
      CONTENT_FETCH_FAILED: [],
      CONTENT_UPDATE_FAILED: [],
      INVALID_WORKFLOW_TRANSITION: [],
      INSUFFICIENT_PERMISSIONS: [],
      CAMPAIGN_CREATION_FAILED: [],
      CAMPAIGN_SCHEDULING_FAILED: [],
      BUNDLE_ACTIVATION_FAILED: [],
      DISCOUNT_CALCULATION_FAILED: [],
      FILE_UPLOAD_FAILED: [],
      CONFLICT_RESOLUTION_FAILED: []
    };

    const guidance = progressiveGuidance[errorCode];
    const index = Math.min(retryCount - 1, guidance.length - 1);
    return guidance[index] || '';
  }
}