export { StateMachine } from './StateMachine';
export * from './types';

import { StateMachine } from './StateMachine';
import { StateMachineConfig, StateMachineInstance } from './types';

export function createMachine<T = any>(
  config: StateMachineConfig<T>,
  persistenceKey?: string
): StateMachineInstance<T> {
  return new StateMachine(config, persistenceKey);
}

export function interpret<T = any>(
  machine: StateMachineInstance<T>
): StateMachineInstance<T> {
  return machine;
}