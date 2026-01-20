import { allSettled, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { watchEffect } from '../../test_utils/watch_effect';
import { fetchFx } from '../fetch';
import { createJsonApiRequest } from '../json';
import { createApiRequest } from '../api';
import { preparationError } from '../../errors/create_error';

/**
 * Creates a fake Response that mimics React Native's Response implementation.
 * React Native's fetch doesn't implement the Streams API, so:
 * - response.body is null/undefined
 * - response.body.tee() is not available
 *
 * This helper creates a Response-like object that still supports
 * clone(), text(), json(), and other standard Response methods.
 */
function createReactNativeResponse(
  body: string | null,
  init?: ResponseInit
): Response {
  const realResponse = new Response(body, init);

  // Create a proxy that hides the body property to simulate React Native
  return new Proxy(realResponse, {
    get(target, prop) {
      // React Native Response doesn't have body property
      if (prop === 'body') {
        return null;
      }
      const value = Reflect.get(target, prop);
      // Bind methods to the original target
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
  });
}

describe('React Native compatibility (no Streams API)', () => {
  describe('createJsonApiRequest', () => {
    const request = {
      method: 'POST' as const,
      url: 'https://api.example.com',
      credentials: 'same-origin' as const,
    };

    test('returns parsed json body when response.body is null', async () => {
      const callJsonApiFx = createJsonApiRequest({ request });

      const fetchMock = vi.fn().mockResolvedValue(
        createReactNativeResponse(JSON.stringify({ data: 'test-value' }))
      );

      const scope = fork({ handlers: [[fetchFx, fetchMock]] });
      const watcher = watchEffect(callJsonApiFx, scope);

      await allSettled(callJsonApiFx, {
        scope,
        params: { body: { some: 'request' } },
      });

      expect(watcher.listeners.onFailData).not.toBeCalled();
      expect(watcher.listeners.onDoneData).toBeCalledWith({
        result: { data: 'test-value' },
        meta: expect.anything(),
      });
    });

    test('returns null for empty body when response.body is null', async () => {
      const callJsonApiFx = createJsonApiRequest({ request });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(createReactNativeResponse(''));

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

    test('returns null for Content-Length: 0 when response.body is null', async () => {
      const callJsonApiFx = createJsonApiRequest({ request });

      const fetchMock = vi.fn().mockResolvedValue(
        createReactNativeResponse('', { headers: { 'Content-Length': '0' } })
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

    test('handles 204 No Content when response.body is null', async () => {
      const callJsonApiFx = createJsonApiRequest({ request });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(createReactNativeResponse(null, { status: 204 }));

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

    test('throws preparation error on invalid json when response.body is null', async () => {
      const callJsonApiFx = createJsonApiRequest({ request });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(createReactNativeResponse('not valid json'));

      const scope = fork({ handlers: [[fetchFx, fetchMock]] });
      const watcher = watchEffect(callJsonApiFx, scope);

      await allSettled(callJsonApiFx, {
        scope,
        params: { body: {} },
      });

      expect(watcher.listeners.onFailData).toBeCalledWith(
        expect.objectContaining({
          error: preparationError({
            response: 'not valid json',
            reason: expect.stringContaining('not valid json'),
          }),
          responseMeta: expect.objectContaining({ headers: expect.anything() }),
        })
      );
    });
  });

  describe('createApiRequest', () => {
    const request = {
      method: 'GET' as const,
      url: 'https://api.example.com',
      credentials: 'same-origin' as const,
      mapBody: () => 'body',
    };

    test('passes response to extract when response.body is null', async () => {
      const extractResult = vi.fn();
      const extractMock = vi.fn().mockImplementation(async (response: Response) => {
        const text = await response.text();
        extractResult(text);
        return text;
      });

      const apiCallFx = createApiRequest({
        request,
        response: { extract: extractMock },
      });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(createReactNativeResponse('response-data'));

      const scope = fork({ handlers: [[fetchFx, fetchMock]] });

      await allSettled(apiCallFx, { scope, params: {} });

      expect(extractResult).toBeCalledWith('response-data');
    });

    test('includes response body in preparation error when response.body is null', async () => {
      const apiCallFx = createApiRequest({
        request,
        response: {
          extract: async () => {
            throw new Error('extraction failed');
          },
        },
      });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(createReactNativeResponse('error-body-content'));

      const scope = fork({ handlers: [[fetchFx, fetchMock]] });
      const watcher = watchEffect(apiCallFx, scope);

      await allSettled(apiCallFx, { scope, params: {} });

      expect(watcher.listeners.onFailData).toBeCalledWith(
        expect.objectContaining({
          error: preparationError({
            response: 'error-body-content',
            reason: 'extraction failed',
          }),
          responseMeta: expect.objectContaining({ headers: expect.anything() }),
        })
      );
    });
  });
});
