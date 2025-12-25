import { allSettled, createStore, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { unknownContract } from '../../contract/unknown_contract';
import { createJsonQuery } from '../create_json_query';
import { declareParams } from '../../remote_operation/params';
import { fetchFx } from '../../fetch/fetch';
import { isHttpError, isNetworkError } from '../../errors/guards';

describe('remote_data/query/json.response.map_failure', () => {
  // Does not matter
  const request = {
    url: 'http://api.salo.com',
    method: 'GET' as const,
  };

  test('transform error with simple callback', async () => {
    const originalError = { message: 'Original error' };
    const transformedError = { message: 'Transformed error' };

    const query = createJsonQuery({
      request,
      response: {
        contract: unknownContract,
        mapFailure: ({ error }) => {
          expect(error).toEqual(originalError);
          return transformedError;
        },
      },
    });

    const fetchMock = vi.fn(() => Promise.reject(originalError));

    const scope = fork({ handlers: [[query.__.executeFx, fetchMock]] });

    await allSettled(query.start, { scope });

    expect(scope.getState(query.$error)).toEqual(transformedError);
  });

  test('transform error with sourced callback', async () => {
    const originalError = { message: 'Original error' };
    const $suffix = createStore('_suffix');

    const query = createJsonQuery({
      request,
      response: {
        contract: unknownContract,
        mapFailure: {
          source: $suffix,
          fn: ({ error }, suffix) => {
            return { message: (error as any).message + suffix };
          },
        },
      },
    });

    const fetchMock = vi.fn(() => Promise.reject(originalError));

    const scope = fork({ handlers: [[query.__.executeFx, fetchMock]] });

    await allSettled(query.start, { scope });

    expect(scope.getState(query.$error)).toEqual({
      message: 'Original error_suffix',
    });
  });

  test('receives params in mapFailure', async () => {
    const query = createJsonQuery({
      params: declareParams<string>(),
      request: {
        url: 'http://api.salo.com',
        method: 'GET' as const,
      },
      response: {
        contract: unknownContract,
        mapFailure: ({ error, params }) => {
          expect(params).toBe('test_params');
          return { ...error, params };
        },
      },
    });

    const fetchMock = vi.fn(() => Promise.reject({ message: 'error' }));

    const scope = fork({ handlers: [[query.__.executeFx, fetchMock]] });

    await allSettled(query.start, { scope, params: 'test_params' });

    expect(scope.getState(query.$error)).toMatchObject({ params: 'test_params' });
  });

  describe('headers in mapFailure', () => {
    test('HTTP 4xx error has headers', async () => {
      const query = createJsonQuery({
        request,
        response: {
          contract: unknownContract,
          mapFailure: ({ error, headers }) => {
            expect(isHttpError({ error })).toBe(true);
            expect(headers?.get('X-Error-Code')).toBe('CUSTOM_ERROR');
            return { error, hasHeaders: !!headers };
          },
        },
      });

      // Mock at transport level to get proper headers flow
      const scope = fork({
        handlers: [
          [
            fetchFx,
            () =>
              new Response(JSON.stringify({ error: 'Not Found' }), {
                status: 404,
                statusText: 'Not Found',
                headers: { 'X-Error-Code': 'CUSTOM_ERROR' },
              }),
          ],
        ],
      });

      await allSettled(query.start, { scope });

      expect(scope.getState(query.$error)).toMatchObject({ hasHeaders: true });
    });

    test('HTTP 5xx error has headers', async () => {
      const query = createJsonQuery({
        request,
        response: {
          contract: unknownContract,
          mapFailure: ({ error, headers }) => {
            expect(isHttpError({ error })).toBe(true);
            expect(headers?.get('X-Server-Error')).toBe('DB_DOWN');
            return { error, serverHeader: headers?.get('X-Server-Error') };
          },
        },
      });

      const scope = fork({
        handlers: [
          [
            fetchFx,
            () =>
              new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                statusText: 'Internal Server Error',
                headers: { 'X-Server-Error': 'DB_DOWN' },
              }),
          ],
        ],
      });

      await allSettled(query.start, { scope });

      expect(scope.getState(query.$error)).toMatchObject({
        serverHeader: 'DB_DOWN',
      });
    });

    test('network error has no headers', async () => {
      const query = createJsonQuery({
        request,
        response: {
          contract: unknownContract,
          mapFailure: ({ error, headers }) => {
            expect(isNetworkError({ error })).toBe(true);
            expect(headers).toBeUndefined();
            return { error, hasHeaders: !!headers };
          },
        },
      });

      const scope = fork({
        handlers: [
          [
            fetchFx,
            () => Promise.reject(new TypeError('Network error')),
          ],
        ],
      });

      await allSettled(query.start, { scope });

      expect(scope.getState(query.$error)).toMatchObject({ hasHeaders: false });
    });

    test('contract error has headers from successful response', async () => {
      const failingContract = {
        isData: (raw: unknown): raw is never => false,
        getErrorMessages: () => ['Contract validation failed'],
      };

      const query = createJsonQuery({
        request,
        response: {
          contract: failingContract,
          mapFailure: ({ error, headers }) => {
            // Contract errors occur after successful HTTP response
            expect(headers?.get('X-Request-Id')).toBe('req-123');
            return { error, requestId: headers?.get('X-Request-Id') };
          },
        },
      });

      const scope = fork({
        handlers: [
          [
            fetchFx,
            () =>
              new Response(JSON.stringify({ data: 'invalid' }), {
                status: 200,
                headers: { 'X-Request-Id': 'req-123' },
              }),
          ],
        ],
      });

      await allSettled(query.start, { scope });

      expect(scope.getState(query.$error)).toMatchObject({
        requestId: 'req-123',
      });
    });
  });

  test('without mapFailure, error passes through unchanged', async () => {
    const originalError = { message: 'Original error' };

    const query = createJsonQuery({
      request,
      response: {
        contract: unknownContract,
        // No mapFailure provided
      },
    });

    const fetchMock = vi.fn(() => Promise.reject(originalError));

    const scope = fork({ handlers: [[query.__.executeFx, fetchMock]] });

    await allSettled(query.start, { scope });

    expect(scope.getState(query.$error)).toEqual(originalError);
  });
});

