import { supabase } from '../../config/supabase';
import { ContentSchema, ContentInputSchema } from '../../schemas/marketing/content.schema';
import type { ProductContent, WorkflowState } from '../../types/marketing.types';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { ServiceError, ValidationError, ForbiddenError } from './errors/ServiceError';

export class ContentService {
  // Workflow transition rules
  private readonly transitions: Record<WorkflowState, WorkflowState[]> = {
    draft: ['review'],
    review: ['approved', 'draft'],
    approved: ['published', 'draft'],
    published: ['archived'],
    archived: ['draft']
  };

  /**
   * Get all content with optional filtering
   */
  async getAllContent(filters?: {
    workflowState?: WorkflowState;
    productId?: string;
    contentType?: string;
  }): Promise<ProductContent[]> {
    try {
      let query = supabase
        .from('product_content')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.workflowState) {
        query = query.eq('workflow_state', filters.workflowState);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.contentType) {
        query = query.eq('content_type', filters.contentType);
      }

      const { data, error } = await query;

      if (error) {
        throw new ServiceError(`Failed to fetch content: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      // Individual validation with skip-on-error
      const validContent: ProductContent[] = [];
      for (const rawContent of data || []) {
        try {
          const content = ContentSchema.parse(rawContent);
          validContent.push(content);

          ValidationMonitor.recordPatternSuccess({
            service: 'ContentService',
            pattern: 'transformation_schema',
            operation: 'getAllContent'
          });
        } catch (error) {
          ValidationMonitor.recordValidationError({
            context: 'ContentService.getAllContent',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'CONTENT_VALIDATION_FAILED'
          });
          // Skip invalid content and continue
        }
      }

      return validContent;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'ContentService.getAllContent',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CONTENT_FETCH_FAILED'
      });
      throw error;
    }
  }

  /**
   * Get pending content (in review state)
   */
  async getPendingContent(): Promise<ProductContent[]> {
    return this.getAllContent({ workflowState: 'review' });
  }

  /**
   * Get a single content item by ID
   */
  async getContent(id: string): Promise<ProductContent> {
    try {
      const { data, error } = await supabase
        .from('product_content')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Content', id);
        }
        throw new ServiceError(`Failed to fetch content: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const content = ContentSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'ContentService',
        pattern: 'transformation_schema',
        operation: 'getContent'
      });

      return content;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'ContentService.getContent',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CONTENT_FETCH_FAILED'
      });
      throw error;
    }
  }

  /**
   * Create new content
   */
  async createContent(input: unknown): Promise<ProductContent> {
    try {
      // Validate input
      const validated = ContentInputSchema.parse(input);

      // Prepare database record
      const dbRecord = {
        product_id: validated.productId || null,
        title: validated.title,
        description: validated.description,
        short_description: validated.shortDescription || null,
        content_type: validated.contentType,
        workflow_state: validated.workflowState,
        image_urls: JSON.stringify(validated.imageUrls || []),
        video_urls: validated.videoUrls ? JSON.stringify(validated.videoUrls) : null,
        seo_title: validated.seoTitle || null,
        seo_description: validated.seoDescription || null,
        seo_keywords: JSON.stringify(validated.seoKeywords || []),
        target_audience: validated.targetAudience,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };

      const { data, error } = await supabase
        .from('product_content')
        .insert(dbRecord)
        .select()
        .single();

      if (error) {
        throw new ServiceError(`Failed to create content: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const content = ContentSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'ContentService',
        pattern: 'transformation_schema',
        operation: 'createContent'
      });

      return content;
    } catch (error) {
      if (error instanceof ValidationError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'ContentService.createContent',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CONTENT_CREATE_FAILED'
      });
      throw error;
    }
  }

  /**
   * Update existing content
   */
  async updateContent(id: string, input: unknown): Promise<ProductContent> {
    try {
      // Get current content to increment version
      const current = await this.getContent(id);

      // Validate input
      const validated = ContentInputSchema.partial().parse(input);

      // Build update object
      const updates: any = {
        updated_at: new Date().toISOString(),
        version: current.version + 1,
      };

      if (validated.title !== undefined) updates.title = validated.title;
      if (validated.description !== undefined) updates.description = validated.description;
      if (validated.shortDescription !== undefined) updates.short_description = validated.shortDescription;
      if (validated.contentType !== undefined) updates.content_type = validated.contentType;
      if (validated.workflowState !== undefined) updates.workflow_state = validated.workflowState;
      if (validated.imageUrls !== undefined) updates.image_urls = JSON.stringify(validated.imageUrls);
      if (validated.videoUrls !== undefined) updates.video_urls = JSON.stringify(validated.videoUrls);
      if (validated.seoTitle !== undefined) updates.seo_title = validated.seoTitle;
      if (validated.seoDescription !== undefined) updates.seo_description = validated.seoDescription;
      if (validated.seoKeywords !== undefined) updates.seo_keywords = JSON.stringify(validated.seoKeywords);
      if (validated.targetAudience !== undefined) updates.target_audience = validated.targetAudience;

      const { data, error } = await supabase
        .from('product_content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Content', id);
        }
        throw new ServiceError(`Failed to update content: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const content = ContentSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'ContentService',
        pattern: 'transformation_schema',
        operation: 'updateContent'
      });

      return content;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'ContentService.updateContent',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CONTENT_UPDATE_FAILED'
      });
      throw error;
    }
  }

  /**
   * Transition content to a new workflow state
   */
  async transitionTo(
    id: string,
    targetState: WorkflowState,
    options?: { userId?: string; comment?: string }
  ): Promise<ProductContent> {
    try {
      const current = await this.getContent(id);

      // Validate transition
      const allowedStates = this.transitions[current.workflowState];
      if (!allowedStates || !allowedStates.includes(targetState)) {
        throw new ValidationError(
          `Invalid transition from ${current.workflowState} to ${targetState}`
        );
      }

      // Update workflow state
      const updates: any = {
        workflow_state: targetState,
        updated_at: new Date().toISOString(),
        version: current.version + 1,
      };

      // Set published_at when transitioning to published
      if (targetState === 'published' && !current.publishedAt) {
        updates.published_at = new Date().toISOString();
      }

      // Set approved_by when transitioning to approved
      if (targetState === 'approved' && options?.userId) {
        updates.approved_by = options.userId;
      }

      const { data, error } = await supabase
        .from('product_content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new ServiceError(`Failed to transition content: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const content = ContentSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'ContentService',
        pattern: 'workflow_transition',
        operation: 'transitionTo'
      });

      return content;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'ContentService.transitionTo',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CONTENT_TRANSITION_FAILED'
      });
      throw error;
    }
  }

  /**
   * Validate if a transition is allowed
   */
  async validateTransition(
    contentId: string,
    currentState: WorkflowState,
    targetState: WorkflowState
  ): Promise<boolean> {
    const allowedStates = this.transitions[currentState];
    return allowedStates ? allowedStates.includes(targetState) : false;
  }

  /**
   * Delete content
   */
  async deleteContent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_content')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Content', id);
        }
        throw new ServiceError(`Failed to delete content: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'ContentService',
        pattern: 'delete_operation',
        operation: 'deleteContent'
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'ContentService.deleteContent',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CONTENT_DELETE_FAILED'
      });
      throw error;
    }
  }
}

// Export singleton instance
export const contentService = new ContentService();
export const contentWorkflowService = contentService; // Alias for compatibility