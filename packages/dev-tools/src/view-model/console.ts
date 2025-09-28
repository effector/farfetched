import { createEffect, createStore, sample } from 'effector';

import { appStarted } from '../model/init';
import { $operations } from '../model/operations';
import { $errors, $data, $stauses, newError } from '../model/states';
import { createOperationViewModel } from './operation';

const $logErrorsToConsole = createStore(false).on(
  appStarted,
  (_, { config }) => config.logErrorsToConsole
);

const logged = new Set<unknown>();

const logErrorFx = createEffect(
  (err: { text: string; content?: unknown } | null) => {
    if (!err || !err.content) {
      return;
    }

    if (logged.has(err.text)) {
      return;
    }

    logged.add(err.text);

    console.error(err.text, err.content);
  }
);

sample({
  clock: newError,
  filter: $logErrorsToConsole,
  source: {
    operations: $operations,
    statuses: $stauses,
    data: $data,
    errors: $errors,
  },
  fn: ({ operations, statuses, data, errors }, err) => {
    const operation = operations.find((operation) => operation.id === err.key);

    if (!operation) {
      return null;
    }

    const operationViewModel = createOperationViewModel({
      operation,
      statuses,
      data,
      errors,
    });

    return {
      text: `[${operationViewModel.type}] ${operationViewModel.name}`,
      content: operationViewModel.error,
    };
  },
  target: logErrorFx,
});
