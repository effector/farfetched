import { allSettled, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { watchEffect } from '../../test_utils/watch_effect';
import { fetchFx } from '../fetch';
import { createJsonApiRequest } from '../json';
import { preparationError } from '../../errors/create_error';

describe('fetch/json.response.data', () => {
  // Does not matter
  const request = {
    method: 'POST' as const,
    url: 'https://api.salo.com',
    credentials: 'same-origin' as const,
  };

  test('throw error on non-json body', async () => {
    const callJsonApiFx = createJsonApiRequest({ request });

    const fetchMock = vi.fn().mockResolvedValue(new Response('It is not JSON'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    const watcher = watchEffect(callJsonApiFx, scope);

    await allSettled(callJsonApiFx, {
      scope,
      params: { body: { some: 'test' } },
    });

    expect(watcher.listeners.onFailData).toBeCalledWith(
      expect.objectContaining({
        error: preparationError({
          response: 'It is not JSON',
          reason: `Unexpected token 'I', \"It is not JSON\" is not valid JSON`,
        }),
        responseMeta: expect.objectContaining({ headers: expect.anything() }),
      })
    );
  });

  test('return parsed json body', async () => {
    const callJsonApiFx = createJsonApiRequest({ request });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ test: 'value' })));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    const watcher = watchEffect(callJsonApiFx, scope);

    await allSettled(callJsonApiFx, {
      scope,
      params: { body: {} },
    });

    expect(watcher.listeners.onDoneData).toBeCalledWith({
      result: { test: 'value' },
      meta: expect.anything(),
    });
  });

  test('empty body as null', async () => {
    const callJsonApiFx = createJsonApiRequest({ request });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('', { headers: { 'Content-Length': '0' } })
      );

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    const watcher = watchEffect(callJsonApiFx, scope);

    await allSettled(callJsonApiFx, {
      scope,
      params: {},
    });

    expect(watcher.listeners.onFailData).not.toBeCalled();
    expect(watcher.listeners.onDoneData).toBeCalledWith({
      result: null,
      meta: expect.anything(),
    });
  });

  test('empty body without header as null', async () => {
    const callJsonApiFx = createJsonApiRequest({ request });

    const fetchMock = vi.fn().mockResolvedValue(new Response(''));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    const watcher = watchEffect(callJsonApiFx, scope);

    await allSettled(callJsonApiFx, {
      scope,
      params: {},
    });

    expect(watcher.listeners.onFailData).not.toBeCalled();
    expect(watcher.listeners.onDoneData).toBeCalledWith({
      result: null,
      meta: expect.anything(),
    });
  });

  describe('null body status responses', () => {
    test('204 No Content response returns null', async () => {
      const callJsonApiFx = createJsonApiRequest({ request });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 204 }));

      const scope = fork({ handlers: [[fetchFx, fetchMock]] });

      const watcher = watchEffect(callJsonApiFx, scope);

      await allSettled(callJsonApiFx, {
        scope,
        params: {},
      });

      expect(watcher.listeners.onFailData).not.toBeCalled();
      expect(watcher.listeners.onDoneData).toBeCalledWith({
        result: null,
        meta: expect.anything(),
      });
    });

    test('205 Reset Content response returns null', async () => {
      const callJsonApiFx = createJsonApiRequest({ request });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 205 }));

      const scope = fork({ handlers: [[fetchFx, fetchMock]] });

      const watcher = watchEffect(callJsonApiFx, scope);

      await allSettled(callJsonApiFx, {
        scope,
        params: {},
      });

      expect(watcher.listeners.onFailData).not.toBeCalled();
      expect(watcher.listeners.onDoneData).toBeCalledWith({
        result: null,
        meta: expect.anything(),
      });
    });
  });
});
