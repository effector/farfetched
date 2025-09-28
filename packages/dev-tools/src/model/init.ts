import { type Scope, createEvent } from 'effector';

export const appStarted = createEvent<{
  scope?: Scope;
  config: { logErrorsToConsole: boolean };
}>();
