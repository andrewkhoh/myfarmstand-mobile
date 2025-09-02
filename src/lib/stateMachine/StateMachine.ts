import {
  StateMachineConfig,
  StateMachineInstance,
  StateTransitionHistory,
  Transition,
  State,
} from './types';

export class StateMachine<T = any> implements StateMachineInstance<T> {
  public id: string;
  public currentState: string;
  public context: T;
  public history: StateTransitionHistory[] = [];
  
  private config: StateMachineConfig<T>;
  private states: Map<string, State<T>>;
  private transitions: Map<string, Transition<T>[]>;
  private subscribers: Set<(state: string, context: T) => void> = new Set();
  private persistenceKey?: string;

  constructor(config: StateMachineConfig<T>, persistenceKey?: string) {
    this.id = config.id;
    this.config = config;
    this.context = { ...config.context };
    this.persistenceKey = persistenceKey;
    
    this.states = new Map(Object.entries(config.states));
    this.transitions = this.buildTransitionMap(config.transitions || []);
    
    const persistedState = this.loadPersistedState();
    if (persistedState) {
      this.currentState = persistedState.currentState;
      this.context = persistedState.context;
      this.history = persistedState.history;
    } else {
      this.currentState = config.initial;
      this.enterState(this.currentState);
    }
  }

  private buildTransitionMap(transitions: Transition<T>[]): Map<string, Transition<T>[]> {
    const map = new Map<string, Transition<T>[]>();
    
    for (const transition of transitions) {
      const key = `${transition.from}.${transition.event}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(transition);
    }
    
    return map;
  }

  async send(event: string, payload?: any): Promise<void> {
    const key = `${this.currentState}.${event}`;
    const transitions = this.transitions.get(key);
    
    if (!transitions || transitions.length === 0) {
      console.warn(`No transition found for event "${event}" in state "${this.currentState}"`);
      return;
    }
    
    for (const transition of transitions) {
      const canTransition = await this.evaluateGuards(transition, payload);
      
      if (canTransition) {
        await this.executeTransition(transition, payload);
        return;
      }
    }
    
    console.warn(`Guards prevented transition for event "${event}" in state "${this.currentState}"`);
  }

  private async evaluateGuards(transition: Transition<T>, payload?: any): Promise<boolean> {
    if (!transition.guards || transition.guards.length === 0) {
      return true;
    }
    
    for (const guard of transition.guards) {
      const result = await guard({ ...this.context, payload });
      if (!result) {
        return false;
      }
    }
    
    return true;
  }

  private async executeTransition(transition: Transition<T>, payload?: any): Promise<void> {
    const fromState = this.currentState;
    const toState = transition.to;
    
    await this.exitState(fromState);
    
    if (transition.actions) {
      for (const action of transition.actions) {
        await action({ ...this.context, payload });
      }
    }
    
    this.addToHistory({
      from: fromState,
      to: toState,
      event: transition.event,
      timestamp: Date.now(),
      metadata: payload,
    });
    
    this.currentState = toState;
    await this.enterState(toState);
    
    this.notifySubscribers();
    this.persistState();
  }

  private async enterState(stateName: string): Promise<void> {
    const state = this.states.get(stateName);
    if (state?.onEnter) {
      await state.onEnter(this.context);
    }
  }

  private async exitState(stateName: string): Promise<void> {
    const state = this.states.get(stateName);
    if (state?.onExit) {
      await state.onExit(this.context);
    }
  }

  private addToHistory(entry: StateTransitionHistory): void {
    this.history.push(entry);
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      callback(this.currentState, this.context);
    });
  }

  private persistState(): void {
    if (!this.persistenceKey) return;
    
    const state = {
      currentState: this.currentState,
      context: this.context,
      history: this.history,
    };
    
    try {
      localStorage.setItem(this.persistenceKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  private loadPersistedState(): any {
    if (!this.persistenceKey) return null;
    
    try {
      const stored = localStorage.getItem(this.persistenceKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      return null;
    }
  }

  getState(): string {
    return this.currentState;
  }

  getContext(): T {
    return { ...this.context };
  }

  async canTransition(event: string): Promise<boolean> {
    const key = `${this.currentState}.${event}`;
    const transitions = this.transitions.get(key);
    
    if (!transitions || transitions.length === 0) {
      return false;
    }
    
    for (const transition of transitions) {
      const canTransition = await this.evaluateGuards(transition);
      if (canTransition) {
        return true;
      }
    }
    
    return false;
  }

  subscribe(callback: (state: string, context: T) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  async rollback(targetState: string): Promise<void> {
    const rollbackPoint = this.history.findLast(h => h.to === targetState);
    
    if (!rollbackPoint) {
      throw new Error(`Cannot rollback to state "${targetState}" - not found in history`);
    }
    
    this.currentState = targetState;
    this.notifySubscribers();
    this.persistState();
    
    this.addToHistory({
      from: this.currentState,
      to: targetState,
      event: 'ROLLBACK',
      timestamp: Date.now(),
      metadata: { reason: 'manual_rollback' },
    });
  }

  reset(): void {
    this.currentState = this.config.initial;
    this.context = { ...this.config.context };
    this.history = [];
    this.notifySubscribers();
    this.persistState();
  }
}