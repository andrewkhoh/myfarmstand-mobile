import { createMachine, Machine } from '@/lib/stateMachine';
import { ProductContent } from '@/types/marketing.types';

export interface ContentWorkflowContext {
  contentId: string | null;
  userId: string | null;
  metadata: Record<string, unknown>;
  history: StateTransition[];
}

export interface StateTransition {
  from: string;
  to: string;
  event: string;
  userId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type WorkflowState = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export interface WorkflowTransition {
  type: string;
  from: WorkflowState;
  to: WorkflowState;
  guards?: string[];
  actions?: string[];
}

export interface TransitionGuard {
  name: string;
  check: (context: ContentWorkflowContext, event: Record<string, any>) => boolean;
}

export interface StateAction {
  name: string;
  execute: (context: ContentWorkflowContext, event: Record<string, any>) => Promise<void>;
}

export class ContentWorkflowMachine {
  private machine: Machine;
  private stateHistory: Map<string, StateTransition[]> = new Map();
  private contentStates: Map<string, WorkflowState> = new Map();
  private notifications: Array<{userId: string; message: string; timestamp: number}> = [];

  constructor() {
    this.machine = createMachine({
      id: 'contentWorkflow',
      initial: 'draft',
      context: {
        contentId: null,
        userId: null,
        metadata: {},
        history: []
      } as ContentWorkflowContext,
      states: {
        draft: {
          on: {
            SUBMIT_FOR_REVIEW: {
              target: 'review',
              guards: ['hasEditPermission', 'contentIsValid'],
              actions: ['recordTransition', 'notifyReviewers']
            }
          }
        },
        review: {
          on: {
            APPROVE: {
              target: 'approved',
              guards: ['hasApprovalPermission'],
              actions: ['recordTransition', 'notifyAuthor']
            },
            REJECT: {
              target: 'draft',
              guards: ['hasApprovalPermission'],
              actions: ['recordTransition', 'notifyAuthor']
            }
          }
        },
        approved: {
          on: {
            PUBLISH: {
              target: 'published',
              guards: ['hasPublishPermission'],
              actions: ['recordTransition', 'notifySubscribers']
            },
            REQUEST_CHANGES: {
              target: 'draft',
              guards: ['hasEditPermission'],
              actions: ['recordTransition', 'notifyAuthor']
            }
          }
        },
        published: {
          on: {
            ARCHIVE: {
              target: 'archived',
              guards: ['hasArchivePermission'],
              actions: ['recordTransition', 'createArchiveBackup']
            },
            UNPUBLISH: {
              target: 'approved',
              guards: ['hasPublishPermission'],
              actions: ['recordTransition', 'notifySubscribers']
            }
          }
        },
        archived: {
          type: 'final'
        }
      }
    });

    this.registerGuards();
    this.registerActions();
  }

  private registerGuards(): void {
    this.machine.registerGuard('hasEditPermission', {
      type: 'permission',
      check: (context: ContentWorkflowContext, event: Record<string, any>) => {
        if (!context.userId) return false;
        return this.checkPermission(context.userId, 'edit', context.contentId);
      }
    });

    this.machine.registerGuard('hasApprovalPermission', {
      type: 'permission',
      check: (context: ContentWorkflowContext, event: Record<string, any>) => {
        if (!context.userId) return false;
        return this.checkPermission(context.userId, 'approve', context.contentId);
      }
    });

    this.machine.registerGuard('hasPublishPermission', {
      type: 'permission',
      check: (context: ContentWorkflowContext, event: Record<string, any>) => {
        if (!context.userId) return false;
        return this.checkPermission(context.userId, 'publish', context.contentId);
      }
    });

    this.machine.registerGuard('hasArchivePermission', {
      type: 'permission',
      check: (context: ContentWorkflowContext, event: Record<string, any>) => {
        if (!context.userId) return false;
        return this.checkPermission(context.userId, 'archive', context.contentId);
      }
    });

    this.machine.registerGuard('contentIsValid', {
      type: 'validation',
      check: (context: ContentWorkflowContext, event: Record<string, any>) => {
        return this.validateContent(context.contentId);
      }
    });
  }

  private registerActions(): void {
    this.machine.registerAction('recordTransition', async (context: ContentWorkflowContext, event: Record<string, any>) => {
      const transition: StateTransition = {
        from: this.machine.getState(),
        to: event.target || this.machine.getState(),
        event: event.type || 'unknown',
        userId: context.userId || 'system',
        timestamp: Date.now(),
        metadata: event.reason ? { reason: event.reason } : event
      };

      context.history.push(transition);
      
      if (context.contentId) {
        const history = this.stateHistory.get(context.contentId) || [];
        history.push(transition);
        this.stateHistory.set(context.contentId, history);
      }
    });

    this.machine.registerAction('notifyReviewers', async (context: ContentWorkflowContext, event: Record<string, any>) => {
      this.notifications.push({
        userId: 'reviewers',
        message: `Content ${context.contentId} is ready for review`,
        timestamp: Date.now()
      });
    });

    this.machine.registerAction('notifyAuthor', async (context: ContentWorkflowContext, event: Record<string, any>) => {
      this.notifications.push({
        userId: (context.metadata.authorId as string) || 'author',
        message: `Content ${context.contentId} status changed to ${this.machine.getState()}`,
        timestamp: Date.now()
      });
    });

    this.machine.registerAction('notifySubscribers', async (context: ContentWorkflowContext, event: Record<string, any>) => {
      this.notifications.push({
        userId: 'subscribers',
        message: `Content ${context.contentId} has been ${event.type.toLowerCase()}`,
        timestamp: Date.now()
      });
    });

    this.machine.registerAction('createArchiveBackup', async (context: ContentWorkflowContext, event: Record<string, any>) => {
      console.log(`Creating backup for content ${context.contentId}`);
    });
  }

  private checkPermission(userId: string, permission: string, contentId: string | null): boolean {
    const adminUsers = ['admin', 'superuser'];
    if (adminUsers.includes(userId)) return true;

    const permissions: Record<string, string[]> = {
      edit: ['editor', 'author', 'admin'],
      approve: ['reviewer', 'admin'],
      publish: ['publisher', 'admin'],
      archive: ['admin']
    };

    return permissions[permission]?.includes(userId) || false;
  }

  private validateContent(contentId: string | null): boolean {
    if (!contentId) return false;
    return true;
  }

  async transition(contentId: string, userId: string, event: string, payload?: Record<string, unknown>): Promise<WorkflowState> {
    const context = this.machine.getContext();
    context.contentId = contentId;
    context.userId = userId;

    // Get current state for this content
    const currentState = this.contentStates.get(contentId) || 'draft';
    this.machine.current = currentState;

    let transitioned;
    try {
      transitioned = await this.machine.transition(event, { ...payload, target: undefined });
    } catch (error) {
      console.error('Workflow transition failed:', error);
      throw new Error(`Cannot transition with event ${event}: ${(error as Error).message}`);
    }
    if (!transitioned) {
      throw new Error(`Cannot transition from ${currentState} with event ${event}`);
    }
    
    const newState = this.machine.getState() as WorkflowState;
    this.contentStates.set(contentId, newState);
    return newState;
  }

  getState(contentId: string): WorkflowState {
    return this.contentStates.get(contentId) || 'draft';
  }

  getHistory(contentId: string): StateTransition[] {
    return this.stateHistory.get(contentId) || [];
  }

  canTransition(event: string): boolean {
    return this.machine.can(event);
  }

  async rollback(contentId: string, targetState: WorkflowState): Promise<void> {
    const history = this.getHistory(contentId);
    const rollbackPoint = history.slice().reverse().find((h: StateTransition) => h.to === targetState);

    if (!rollbackPoint) {
      throw new Error(`Cannot rollback to state ${targetState}`);
    }

    const context = this.machine.getContext();
    context.contentId = contentId;
    
    const currentState = this.contentStates.get(contentId) || 'draft';
    this.machine.current = targetState;
    this.contentStates.set(contentId, targetState);

    const transition: StateTransition = {
      from: currentState,
      to: targetState,
      event: 'ROLLBACK',
      userId: context.userId || 'system',
      timestamp: Date.now(),
      metadata: { reason: 'rollback' }
    };

    history.push(transition);
    this.stateHistory.set(contentId, history);
  }

  getNotifications(): Array<{userId: string; message: string; timestamp: number}> {
    return this.notifications;
  }

  clearNotifications(): void {
    this.notifications = [];
  }
}