import { WorkflowState } from '@/schema/marketing/types';

export interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  condition?: () => boolean;
  action?: () => Promise<void>;
}

export class ContentWorkflowStateMachine {
  private currentState: WorkflowState;
  private transitions: Map<string, StateTransition> = new Map();
  
  constructor(initialState: WorkflowState = 'draft') {
    this.currentState = initialState;
    this.initializeTransitions();
  }

  private initializeTransitions() {
    const transitions: StateTransition[] = [
      { from: 'draft', to: 'review' },
      { from: 'draft', to: 'archived' },
      { from: 'review', to: 'approved' },
      { from: 'review', to: 'draft' },
      { from: 'review', to: 'archived' },
      { from: 'approved', to: 'published' },
      { from: 'approved', to: 'draft' },
      { from: 'approved', to: 'archived' },
      { from: 'published', to: 'archived' },
      { from: 'archived', to: 'draft' }
    ];

    transitions.forEach(t => {
      const key = `${t.from}->${t.to}`;
      this.transitions.set(key, t);
    });
  }

  getCurrentState(): WorkflowState {
    return this.currentState;
  }

  canTransition(to: WorkflowState): boolean {
    const key = `${this.currentState}->${to}`;
    const transition = this.transitions.get(key);
    
    if (!transition) return false;
    if (transition.condition && !transition.condition()) return false;
    
    return true;
  }

  async transition(to: WorkflowState): Promise<boolean> {
    if (!this.canTransition(to)) {
      return false;
    }

    const key = `${this.currentState}->${to}`;
    const transition = this.transitions.get(key);
    
    if (transition?.action) {
      await transition.action();
    }
    
    this.currentState = to;
    return true;
  }

  getAvailableTransitions(): WorkflowState[] {
    const available: WorkflowState[] = [];
    const states: WorkflowState[] = ['draft', 'review', 'approved', 'published', 'archived'];
    
    for (const state of states) {
      if (this.canTransition(state)) {
        available.push(state);
      }
    }
    
    return available;
  }

  reset() {
    this.currentState = 'draft';
  }
}