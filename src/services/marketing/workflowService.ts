import { supabase } from '@/config/supabase';

interface WorkflowConfig {
  entity_id: string;
  entity_type: string;
  initial_state: string;
}

interface WorkflowState {
  id: string;
  entity_id: string;
  entity_type: string;
  current_state: string;
  previous_state?: string;
  deadline?: string;
  deadline_set?: boolean;
}

interface ApprovalRequest {
  workflow_id: string;
  status: string;
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  submitted_at?: string;
}

interface TransitionHistory {
  workflow_id: string;
  from_state: string;
  to_state: string;
  transitioned_at: string;
}

class WorkflowService {
  private validTransitions: Record<string, string[]> = {
    draft: ['review'],
    review: ['approved', 'rejected', 'draft'],
    approved: ['published'],
    rejected: ['draft'],
    published: ['archived'],
    archived: []
  };

  async createWorkflow(config: WorkflowConfig): Promise<WorkflowState> {
    try {
      const { data, error } = await supabase
      .from('workflows')
      .insert({
        entity_id: config.entity_id,
        entity_type: config.entity_type,
        current_state: config.initial_state
      })
      .select()
      .single();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    return data;
  }

  async transitionState(workflowId: string, toState: string, fromState?: string): Promise<WorkflowState> {
    // Get current state if not provided
    if (!fromState) {
      const currentWorkflow = await this.getWorkflowState(workflowId);
      fromState = currentWorkflow.current_state;
    }

    // Validate transition
    if (!this.validateTransition(fromState, toState)) {
      throw new Error(`Invalid transition from ${fromState} to ${toState}`);
    }

    // Update workflow state
    try {
      const { data, error } = await supabase
      .from('workflows')
      .update({
        current_state: toState,
        previous_state: fromState
      })
      .eq('id', workflowId)
      .select()
      .single();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;

    // Record transition history
    await this.recordTransition(workflowId, fromState, toState);

    return data;
  }

  async getWorkflowState(workflowId: string): Promise<WorkflowState> {
    try {
      const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    return data;
  }

  validateTransition(fromState: string, toState: string): boolean {
    const allowedTransitions = this.validTransitions[fromState] || [];
    return allowedTransitions.includes(toState);
  }

  async getWorkflowHistory(workflowId: string): Promise<TransitionHistory[]> {
    try {
      const { data, error } = await supabase
      .from('workflow_history')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('transitioned_at', { ascending: false });
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    return data || [];
  }

  async recordTransition(workflowId: string, fromState: string, toState: string): Promise<TransitionHistory> {
    try {
      const { data, error } = await supabase
      .from('workflow_history')
      .insert({
        workflow_id: workflowId,
        from_state: fromState,
        to_state: toState,
        transitioned_at: new Date().toISOString()
      })
      .select()
      .single();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    return data;
  }

  async submitForApproval(workflowId: string, submittedBy: string): Promise<ApprovalRequest> {
    try {
      const { data, error } = await supabase
      .from('approval_requests')
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        submitted_by: submittedBy,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    return data;
  }

  async approveWorkflow(workflowId: string, approvedBy: string): Promise<ApprovalRequest> {
    try {
      const { data, error } = await supabase
      .from('approval_requests')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('workflow_id', workflowId)
      .select()
      .single();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    
    // Transition workflow state to approved
    await this.transitionState(workflowId, 'approved');
    
    return data;
  }

  async rejectWorkflow(workflowId: string, rejectedBy: string, reason: string): Promise<ApprovalRequest> {
    try {
      const { data, error } = await supabase
      .from('approval_requests')
      .update({
        status: 'rejected',
        rejected_by: rejectedBy,
        rejection_reason: reason,
        rejected_at: new Date().toISOString()
      })
      .eq('workflow_id', workflowId)
      .select()
      .single();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    
    // Transition workflow state to rejected
    await this.transitionState(workflowId, 'rejected');
    
    return data;
  }

  async getApprovalQueue(): Promise<ApprovalRequest[]> {
    try {
      const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    return data || [];
  }

  async setWorkflowDeadline(workflowId: string, deadline: string): Promise<WorkflowState> {
    try {
      const { data, error } = await supabase
      .from('workflows')
      .update({
        deadline: deadline,
        deadline_set: true
      })
      .eq('id', workflowId)
      .select()
      .single();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    return data;
  }

  async getUpcomingDeadlines(daysAhead: number): Promise<WorkflowState[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    try {
      const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .lte('deadline', futureDate.toISOString())
      .gte('deadline', now.toISOString())
      .order('deadline', { ascending: true });
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

    if (error) throw error;
    return data || [];
  }
}

export const workflowService = new WorkflowService();