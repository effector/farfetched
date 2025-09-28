import { allSettled, createWatch, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { unknownContract } from '../../contract/unknown_contract';
import { fetchFx } from '../../fetch/fetch';
import { createJsonQuery } from '../create_json_query';

describe('Query#started', () => {
  test('should be fired after start', async () => {
    const startedListener = vi.fn();

    const query = createJsonQuery({
      request: {
        method: 'GET',
        url: '/api/aborted',
      },
      response: {
        contract: unknownContract,
      },
    });

    const scope = fork({
      handlers: [[fetchFx, vi.fn()]],
    });

    createWatch({ unit: query.started, fn: startedListener, scope });

    await allSettled(query.refresh, { scope });
    expect(startedListener).toBeCalledTimes(1);

    // Should not start Query again
    await allSettled(query.refresh, { scope });
    expect(startedListener).toBeCalledTimes(1);
  });
});
