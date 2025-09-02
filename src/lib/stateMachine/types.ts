export interface StateContext {
  userId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface State<T = any> {
  name: string;
  onEnter?: (context: T) => void | Promise<void>;
  onExit?: (context: T) => void | Promise<void>;
  meta?: Record<string, any>;
}

export interface Transition<T = any> {
  from: string;
  to: string;
  event: string;
  guards?: Array<(context: T) => boolean | Promise<boolean>>;
  actions?: Array<(context: T) => void | Promise<void>>;
}

export interface StateMachineConfig<T = any> {
  id: string;
  initial: string;
  context: T;
  states: Record<string, State<T>>;
  transitions?: Transition<T>[];
  guards?: Record<string, (context: T) => boolean | Promise<boolean>>;
  actions?: Record<string, (context: T) => void | Promise<void>>;
}

export interface StateMachineInstance<T = any> {
  id: string;
  currentState: string;
  context: T;
  history: StateTransitionHistory[];
  send: (event: string, payload?: any) => Promise<void>;
  getState: () => string;
  getContext: () => T;
  canTransition: (event: string) => Promise<boolean>;
  subscribe: (callback: (state: string, context: T) => void) => () => void;
}

export interface StateTransitionHistory {
  from: string;
  to: string;
  event: string;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowState {
  id: string;
  name: string;
  description?: string;
  allowedTransitions: string[];
  permissions?: string[];
  autoTransitions?: Array<{
    to: string;
    condition: (context: any) => boolean;
    delay?: number;
  }>;
}

export interface WorkflowTransition {
  id: string;
  from: string;
  to: string;
  event: string;
  requiredRole?: string;
  requiredPermissions?: string[];
  validators?: Array<(context: any) => boolean | Promise<boolean>>;
  sideEffects?: Array<(context: any) => void | Promise<void>>;
}

export interface TransitionGuard {
  name: string;
  fn: (context: any, event?: any) => boolean | Promise<boolean>;
}

export interface StateAction {
  name: string;
  fn: (context: any, event?: any) => void | Promise<void>;
}

export interface WorkflowStateMachine {
  states: Record<string, WorkflowState>;
  transitions: WorkflowTransition[];
  guards: TransitionGuard[];
  actions: StateAction[];
}