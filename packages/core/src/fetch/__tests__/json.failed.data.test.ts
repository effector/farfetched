import { allSettled, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { watchEffect } from '../../test_utils/watch_effect';
import { fetchFx } from '../fetch';
import { createJsonApiRequest } from '../json';
import { httpError } from '../../errors/create_error';

describe('createJsonApi', () => {
  // Does not matter
  const request = {
    method: 'POST' as const,
    url: 'https://api.salo.com',
    credentials: 'same-origin' as const,
  };

  describe('httpError', () => {
    test('parse json-body as json', async () => {
      const callJsonApiFx = createJsonApiRequest({ request });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ customError: true }), { status: 500 })
        );

      const scope = fork({ handlers: [[fetchFx, fetchMock]] });

      const watcher = watchEffect(callJsonApiFx, scope);

      await allSettled(callJsonApiFx, {
        scope,
        params: {},
      });

      expect(watcher.listeners.onFailData).toBeCalledWith(
        expect.objectContaining({
          error: httpError({
            status: 500,
            statusText: '',
            response: { customError: true },
          }),
          responseMeta: expect.objectContaining({ headers: expect.anything() }),
        })
      );
    });
  });
});
