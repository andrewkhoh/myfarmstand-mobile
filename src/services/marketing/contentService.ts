import { supabase, ServiceError } from '@/lib/supabase';
import { 
  ProductContentSchema, 
  ProductContent,
  ProductContentInput,
  ProductContentInputSchema,
  WorkflowState 
} from '@/schemas/marketing';
import { z } from 'zod';

function isValidTransition(current: WorkflowState, next: WorkflowState): boolean {
  const transitions: Record<WorkflowState, WorkflowState[]> = {
    [WorkflowState.DRAFT]: [WorkflowState.REVIEW],
    [WorkflowState.REVIEW]: [WorkflowState.DRAFT, WorkflowState.APPROVED],
    [WorkflowState.APPROVED]: [WorkflowState.PUBLISHED, WorkflowState.REVIEW],
    [WorkflowState.PUBLISHED]: [WorkflowState.ARCHIVED],
    [WorkflowState.ARCHIVED]: [WorkflowState.DRAFT]
  };

  return transitions[current]?.includes(next) || false;
}

export const contentService = {
  queryKey: ['content'] as const,

  async getAll(): Promise<ProductContent[]> {
    const { data, error } = await supabase
      .from('product_content')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) throw new ServiceError('Failed to fetch content', 'FETCH_ERROR', error);
    return z.array(ProductContentSchema).parse(data || []);
  },

  async getById(id: string): Promise<ProductContent> {
    const { data, error } = await supabase
      .from('product_content')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new ServiceError('Content not found', 'NOT_FOUND', { id });
      }
      throw new ServiceError('Failed to fetch content', 'FETCH_ERROR', error);
    }
    
    return ProductContentSchema.parse(data);
  },

  async getByProductId(productId: string): Promise<ProductContent[]> {
    const { data, error } = await supabase
      .from('product_content')
      .select('*')
      .eq('productId', productId)
      .order('createdAt', { ascending: false });
    
    if (error) throw new ServiceError('Failed to fetch content', 'FETCH_ERROR', error);
    return z.array(ProductContentSchema).parse(data || []);
  },

  async create(content: ProductContentInput): Promise<ProductContent> {
    const validated = ProductContentInputSchema.parse(content);
    
    const now = new Date().toISOString();
    const id = crypto.randomUUID ? crypto.randomUUID() : 
               `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newContent = {
      ...validated,
      id,
      workflowState: validated.workflowState || WorkflowState.DRAFT,
      createdAt: now,
      updatedAt: now,
      lastModifiedBy: validated.lastModifiedBy || validated.createdBy
    };

    const { data, error } = await supabase
      .from('product_content')
      .insert(newContent)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to create content', 'CREATE_ERROR', error);
    return ProductContentSchema.parse(data);
  },

  async update(id: string, updates: Partial<ProductContentInput>): Promise<ProductContent> {
    const existing = await this.getById(id);
    
    const updatedContent = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('product_content')
      .update(updatedContent)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to update content', 'UPDATE_ERROR', error);
    return ProductContentSchema.parse(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_content')
      .delete()
      .eq('id', id);
    
    if (error) throw new ServiceError('Failed to delete content', 'DELETE_ERROR', error);
  },

  async transitionWorkflow(
    contentId: string,
    nextState: WorkflowState,
    userId: string
  ): Promise<ProductContent> {
    const current = await this.getById(contentId);
    
    if (!isValidTransition(current.workflowState, nextState)) {
      throw new ServiceError(
        `Invalid workflow transition from ${current.workflowState} to ${nextState}`,
        'INVALID_TRANSITION',
        { current: current.workflowState, next: nextState }
      );
    }
    
    const { data, error } = await supabase
      .from('product_content')
      .update({ 
        workflowState: nextState,
        updatedAt: new Date().toISOString(),
        lastModifiedBy: userId
      })
      .eq('id', contentId)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to transition workflow', 'TRANSITION_ERROR', error);
    return ProductContentSchema.parse(data);
  },

  async getByWorkflowState(state: WorkflowState): Promise<ProductContent[]> {
    const { data, error } = await supabase
      .from('product_content')
      .select('*')
      .eq('workflowState', state)
      .order('updatedAt', { ascending: false });
    
    if (error) throw new ServiceError('Failed to fetch content by state', 'FETCH_ERROR', error);
    return z.array(ProductContentSchema).parse(data || []);
  },

  async bulkUpdateWorkflow(
    contentIds: string[],
    nextState: WorkflowState,
    userId: string
  ): Promise<ProductContent[]> {
    const results: ProductContent[] = [];
    
    for (const id of contentIds) {
      try {
        const updated = await this.transitionWorkflow(id, nextState, userId);
        results.push(updated);
      } catch (error) {
        if (error instanceof ServiceError && error.code === 'INVALID_TRANSITION') {
          continue;
        }
        throw error;
      }
    }
    
    return results;
  }
};