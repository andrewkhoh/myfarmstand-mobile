export interface MachineConfig {
  id: string;
  initial: string;
  context: any;
  states: Record<string, StateConfig>;
}

export interface StateConfig {
  type?: 'final';
  on?: Record<string, TransitionConfig | string>;
}

export interface TransitionConfig {
  target: string;
  guards?: string[];
  actions?: string[];
}

export interface Guard {
  type: string;
  check: (context: any, event: any) => boolean;
}

export interface Action {
  name: string;
  execute: (context: any, event: any) => Promise<void> | void;
}

export class Machine {
  private config: MachineConfig;
  private context: any;
  public current: string;
  private guards: Map<string, Guard> = new Map();
  private actions: Map<string, Action> = new Map();

  constructor(config: MachineConfig) {
    this.config = config;
    this.context = { ...config.context };
    this.current = config.initial;
  }

  getContext(): any {
    return this.context;
  }

  getState(): string {
    return this.current;
  }

  registerGuard(name: string, guard: Guard): void {
    this.guards.set(name, guard);
  }

  registerAction(name: string, action: Action | ((context: any, event: any) => Promise<void>)): void {
    if (typeof action === 'function') {
      this.actions.set(name, { name, execute: action });
    } else {
      this.actions.set(name, action);
    }
  }

  private checkGuards(guards: string[] | undefined, event: any): boolean {
    if (!guards || guards.length === 0) return true;
    
    for (const guardName of guards) {
      const guard = this.guards.get(guardName);
      if (guard && !guard.check(this.context, event)) {
        return false;
      }
    }
    return true;
  }

  private async executeActions(actions: string[] | undefined, event: any): Promise<void> {
    if (!actions || actions.length === 0) return;
    
    for (const actionName of actions) {
      const action = this.actions.get(actionName);
      if (action) {
        await action.execute(this.context, event);
      }
    }
  }

  async transition(eventType: string, payload?: any): Promise<boolean> {
    const currentState = this.config.states[this.current];
    if (!currentState || !currentState.on) return false;

    const transition = currentState.on[eventType];
    if (!transition) return false;

    const config = typeof transition === 'string' 
      ? { target: transition } 
      : transition;

    const event = { type: eventType, ...payload };

    if (!this.checkGuards(config.guards, event)) {
      return false;
    }

    await this.executeActions(config.actions, event);
    this.current = config.target;
    return true;
  }

  can(eventType: string): boolean {
    const currentState = this.config.states[this.current];
    if (!currentState || !currentState.on) return false;
    return eventType in currentState.on;
  }
}

export function createMachine(config: MachineConfig): Machine {
  return new Machine(config);
}