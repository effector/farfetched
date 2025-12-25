import { allSettled, fork } from 'effector';
import { describe, test, expect } from 'vitest';

import { watchEffect } from '../../test_utils/watch_effect';
import { createApiRequest } from '../api';
import { fetchFx } from '../fetch';
import { preparationError } from '../../errors/create_error';

describe('fetch/api.response.all_in_one', () => {
  // Does not matter
  const request = {
    method: 'GET' as const,
    url: 'https://api.salo.com',
    credentials: 'same-origin' as const,
    mapBody: () => 'some_body',
  };

  const callJsonApiFx = createApiRequest({
    request,
    response: {
      extract: (response) => response.json(),
    },
  });

  test('success data', async () => {
    const scope = fork({
      handlers: [
        [
          fetchFx,
          // Success
          () => new Response(JSON.stringify({ data: [1, 2], errors: null })),
        ],
      ],
    });

    const watcher = watchEffect(callJsonApiFx, scope);

    await allSettled(callJsonApiFx, {
      scope,
      params: {},
    });

    expect(watcher.listeners.onDoneData).toHaveBeenCalledWith({
      result: {
        data: [1, 2],
        errors: null,
      },
      meta: expect.anything(),
    });
  });

  test('failed preparation', async () => {
    const scope = fork({
      handlers: [[fetchFx, () => new Response('This is not JSON')]],
    });

    const watcher = watchEffect(callJsonApiFx, scope);

    await allSettled(callJsonApiFx, {
      scope,
      params: {},
    });

    expect(watcher.listeners.onFailData).toBeCalledWith(
      expect.objectContaining({
        error: preparationError({
          response: 'This is not JSON',
          reason: 'Unexpected token T in JSON at position 0',
        }),
        responseMeta: expect.objectContaining({ headers: expect.anything() }),
      })
    );
  });
});
