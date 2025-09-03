export interface State {
  id?: string;
  type?: 'atomic' | 'compound' | 'parallel' | 'final';
  on?: Record<string, Transition | string>;
  entry?: Action[];
  exit?: Action[];
  states?: Record<string, State>;
  initial?: string;
}

export interface Transition {
  target: string;
  guards?: string[];
  actions?: string[];
}

export interface Action {
  type: string;
  params?: any;
}

export interface Guard {
  type: string;
  check: (context: any, event: any) => boolean;
}

export interface MachineConfig {
  id: string;
  initial: string;
  context?: any;
  states: Record<string, State>;
}

export interface StateMachine {
  id: string;
  current: string;
  context: any;
  transition: (event: string, payload?: any) => Promise<void>;
  can: (event: string) => boolean;
  getState: () => string;
  getContext: () => any;
}

export class Machine implements StateMachine {
  private config: MachineConfig;
  private guards: Map<string, Guard> = new Map();
  private actions: Map<string, (context: any, event: any) => Promise<void>> = new Map();
  public current: string;
  public context: any;
  public id: string;

  constructor(config: MachineConfig) {
    this.config = config;
    this.id = config.id;
    this.current = config.initial;
    this.context = config.context || {};
  }

  registerGuard(name: string, guard: Guard): void {
    this.guards.set(name, guard);
  }

  registerAction(name: string, action: (context: any, event: any) => Promise<void>): void {
    this.actions.set(name, action);
  }

  async transition(event: string, payload?: any): Promise<void> {
    const currentState = this.config.states[this.current];
    if (!currentState || !currentState.on) {
      throw new Error(`No transitions defined for state ${this.current}`);
    }

    const transitionConfig = currentState.on[event];
    if (!transitionConfig) {
      throw new Error(`No transition for event ${event} in state ${this.current}`);
    }

    const transition = typeof transitionConfig === 'string' 
      ? { target: transitionConfig } 
      : transitionConfig;

    if (transition.guards) {
      for (const guardName of transition.guards) {
        const guard = this.guards.get(guardName);
        if (!guard || !guard.check(this.context, { type: event, payload })) {
          throw new Error(`Guard ${guardName} failed`);
        }
      }
    }

    if (currentState.exit) {
      for (const action of currentState.exit) {
        const actionFn = this.actions.get(action.type);
        if (actionFn) {
          await actionFn(this.context, { type: event, payload });
        }
      }
    }

    this.current = transition.target;

    const newState = this.config.states[this.current];
    if (newState && newState.entry) {
      for (const action of newState.entry) {
        const actionFn = this.actions.get(action.type);
        if (actionFn) {
          await actionFn(this.context, { type: event, payload });
        }
      }
    }

    if (transition.actions) {
      for (const actionName of transition.actions) {
        const actionFn = this.actions.get(actionName);
        if (actionFn) {
          await actionFn(this.context, { type: event, payload });
        }
      }
    }
  }

  can(event: string): boolean {
    const currentState = this.config.states[this.current];
    return !!(currentState && currentState.on && currentState.on[event]);
  }

  getState(): string {
    return this.current;
  }

  getContext(): any {
    return this.context;
  }
}

export function createMachine(config: MachineConfig): Machine {
  return new Machine(config);
}

export function interpret(machine: Machine): Machine {
  return machine;
}