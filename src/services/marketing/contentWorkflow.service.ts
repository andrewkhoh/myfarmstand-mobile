import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { 
  ProductContent, 
  WorkflowState, 
  productContentTransform,
  productContentSchema 
} from '@/schemas/marketing';
import { 
  ServiceError, 
  ValidationError, 
  NotFoundError,
  ForbiddenError 
} from './errors/ServiceError';

export interface User {
  id: string;
  role: 'viewer' | 'editor' | 'admin';
}

export interface TransitionOptions {
  user?: User;
  comment?: string;
}

export class ContentWorkflowService {
  private readonly transitions: Record<WorkflowState, WorkflowState[]> = {
    draft: ['review'],
    review: ['approved', 'draft'],
    approved: ['published', 'draft'],
    published: []
  };

  private readonly rolePermissions: Record<string, WorkflowState[]> = {
    viewer: [],
    editor: ['draft', 'review'],
    admin: ['draft', 'review', 'approved', 'published']
  };

  private mockData: Map<string, ProductContent> = new Map();

  async getContent(contentId: string): Promise<ProductContent> {
    const content = this.mockData.get(contentId);
    if (!content) {
      throw new NotFoundError('ProductContent', contentId);
    }
    return content;
  }

  async createContent(data: unknown): Promise<ProductContent> {
    try {
      const validated = productContentTransform.parse({
        ...(data as any),
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      this.mockData.set(validated.id, validated);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Content validation failed', error.errors);
      }
      throw error;
    }
  }

  async updateContent(
    contentId: string,
    updates: Partial<ProductContent>
  ): Promise<ProductContent> {
    const existing = await this.getContent(contentId);
    
    // Ensure updatedAt is always different by adding 1ms if it would be the same
    const now = new Date();
    const updatedAt = now.getTime() === existing.updatedAt.getTime() 
      ? new Date(now.getTime() + 1)
      : now;
    
    const updated = productContentTransform.parse({
      ...existing,
      ...updates,
      updatedAt
    });

    this.mockData.set(contentId, updated);
    return updated;
  }

  async transitionTo(
    contentId: string,
    targetState: WorkflowState,
    options?: TransitionOptions
  ): Promise<ProductContent> {
    const current = await this.getContent(contentId);
    
    const allowedStates = this.transitions[current.workflowState];
    if (!allowedStates.includes(targetState)) {
      throw new ServiceError(
        `Invalid transition from ${current.workflowState} to ${targetState}`,
        'INVALID_TRANSITION',
        400
      );
    }
    
    if (options?.user && !this.hasTransitionPermission(options.user, targetState)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    
    const updated = await this.updateContent(contentId, {
      workflowState: targetState,
      history: [
        ...current.history,
        {
          from: current.workflowState,
          to: targetState,
          timestamp: new Date(),
          userId: options?.user?.id
        }
      ],
      ...(targetState === 'published' && !current.publishedAt 
        ? { publishedAt: new Date() } 
        : {})
    });
    
    return updated;
  }

  async bulkTransition(
    contentIds: string[],
    targetState: WorkflowState,
    options?: TransitionOptions
  ): Promise<ProductContent[]> {
    const results = await Promise.allSettled(
      contentIds.map(id => this.transitionTo(id, targetState, options))
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<ProductContent> => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    if (failed.length > 0) {
      console.warn(`Failed to transition ${failed.length} items:`, failed);
    }

    return successful;
  }

  async getContentByState(state: WorkflowState): Promise<ProductContent[]> {
    return Array.from(this.mockData.values())
      .filter(content => content.workflowState === state);
  }

  async getContentHistory(contentId: string) {
    const content = await this.getContent(contentId);
    return content.history;
  }

  private hasTransitionPermission(user: User, targetState: WorkflowState): boolean {
    const allowedStates = this.rolePermissions[user.role] || [];
    return allowedStates.includes(targetState);
  }

  private generateId(): string {
    return uuidv4();
  }

  clearMockData(): void {
    this.mockData.clear();
  }
}