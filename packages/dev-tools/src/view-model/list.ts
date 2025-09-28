import { combine } from 'effector';

import { $operations } from '../model/operations';
import { $stauses, $data, $errors } from '../model/states';
import { $search } from './search';
import { createOperationViewModel, overlap } from './operation';

export const operationHeaders = ['Type', 'Name', 'Status', 'Data', 'Error'];

export const $operationsList = combine(
  {
    operations: $operations,
    statuses: $stauses,
    data: $data,
    errors: $errors,
    search: $search,
  },
  ({ operations, statuses, data, errors, search }) =>
    operations
      .map((operation) =>
        createOperationViewModel({
          operation,
          statuses,
          data,
          errors,
        })
      )
      .filter((item) => overlap(search, item.name))
      .map((item) => {
        return [
          item.type,
          item.name,
          item.status,
          { type: 'json', value: item.data },
          { type: 'json', value: item.error },
        ];
      })
);
