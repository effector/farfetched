import { allSettled, createStore, createWatch, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { unknownContract } from '../../contract/unknown_contract';
import { createJsonMutation } from '../create_json_mutation';
import { declareParams } from '../../remote_operation/params';
import { fetchFx } from '../../fetch/fetch';
import { isHttpError, isNetworkError } from '../../errors/guards';

describe('remote_data/mutation/json.response.map_failure', () => {
  // Does not matter
  const request = {
    url: 'http://api.salo.com',
    method: 'POST' as const,
  };

  test('transform error with simple callback', async () => {
    const originalError = { message: 'Original error' };
    const transformedError = { message: 'Transformed error' };

    const mutation = createJsonMutation({
      request,
      response: {
        contract: unknownContract,
        mapError: ({ error }) => {
          expect(error).toEqual(originalError);
          return transformedError;
        },
      },
    });

    const fetchMock = vi.fn(() => Promise.reject(originalError));
    const failureHandler = vi.fn();

    const scope = fork({ handlers: [[mutation.__.executeFx, fetchMock]] });

    createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

    await allSettled(mutation.start, { scope });

    expect(scope.getState(mutation.$failed)).toBe(true);
    expect(failureHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        error: transformedError,
      })
    );
  });

  test('transform error with sourced callback', async () => {
    const originalError = { message: 'Original error' };
    const $suffix = createStore('_suffix');

    const mutation = createJsonMutation({
      request,
      response: {
        contract: unknownContract,
        mapError: {
          source: $suffix,
          fn: ({ error }, suffix) => {
            return { message: (error as any).message + suffix };
          },
        },
      },
    });

    const fetchMock = vi.fn(() => Promise.reject(originalError));
    const failureHandler = vi.fn();

    const scope = fork({ handlers: [[mutation.__.executeFx, fetchMock]] });

    createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

    await allSettled(mutation.start, { scope });

    expect(scope.getState(mutation.$failed)).toBe(true);
    expect(failureHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { message: 'Original error_suffix' },
      })
    );
  });

  test('receives params in mapError', async () => {
    const mutation = createJsonMutation({
      params: declareParams<string>(),
      request: {
        url: 'http://api.salo.com',
        method: 'POST' as const,
      },
      response: {
        contract: unknownContract,
        mapError: ({ error, params }) => {
          expect(params).toBe('test_params');
          return { ...(error as object), params };
        },
      },
    });

    const fetchMock = vi.fn(() => Promise.reject({ message: 'error' }));
    const failureHandler = vi.fn();

    const scope = fork({ handlers: [[mutation.__.executeFx, fetchMock]] });

    createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

    await allSettled(mutation.start, { scope, params: 'test_params' });

    expect(scope.getState(mutation.$failed)).toBe(true);
    expect(failureHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        params: 'test_params',
        error: { message: 'error', params: 'test_params' },
      })
    );
  });

  describe('headers in mapError', () => {
    test('HTTP 4xx error has headers', async () => {
      const mutation = createJsonMutation({
        request,
        response: {
          contract: unknownContract,
          mapError: ({ error, headers }) => {
            expect(isHttpError({ error })).toBe(true);
            expect(headers?.get('X-Error-Code')).toBe('CUSTOM_ERROR');
            return { error, hasHeaders: !!headers };
          },
        },
      });

      const failureHandler = vi.fn();

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

      createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

      await allSettled(mutation.start, { scope });

      expect(scope.getState(mutation.$failed)).toBe(true);
      expect(failureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ hasHeaders: true }),
        })
      );
    });

    test('HTTP 5xx error has headers', async () => {
      const mutation = createJsonMutation({
        request,
        response: {
          contract: unknownContract,
          mapError: ({ error, headers }) => {
            expect(isHttpError({ error })).toBe(true);
            expect(headers?.get('X-Server-Error')).toBe('DB_DOWN');
            return { error, serverHeader: headers?.get('X-Server-Error') };
          },
        },
      });

      const failureHandler = vi.fn();

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

      createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

      await allSettled(mutation.start, { scope });

      expect(scope.getState(mutation.$failed)).toBe(true);
      expect(failureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ serverHeader: 'DB_DOWN' }),
        })
      );
    });

    test('network error has no headers', async () => {
      const mutation = createJsonMutation({
        request,
        response: {
          contract: unknownContract,
          mapError: ({ error, headers }) => {
            expect(isNetworkError({ error })).toBe(true);
            expect(headers).toBeUndefined();
            return { error, hasHeaders: !!headers };
          },
        },
      });

      const failureHandler = vi.fn();

      const scope = fork({
        handlers: [
          [fetchFx, () => Promise.reject(new TypeError('Network error'))],
        ],
      });

      createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

      await allSettled(mutation.start, { scope });

      expect(scope.getState(mutation.$failed)).toBe(true);
      expect(failureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ hasHeaders: false }),
        })
      );
    });

    test('contract error has headers from successful response', async () => {
      const failingContract = {
        isData: (raw: unknown): raw is never => false,
        getErrorMessages: () => ['Contract validation failed'],
      };

      const mutation = createJsonMutation({
        request,
        response: {
          contract: failingContract,
          mapError: ({ error, headers }) => {
            // Contract errors occur after successful HTTP response
            expect(headers?.get('X-Request-Id')).toBe('req-123');
            return { error, requestId: headers?.get('X-Request-Id') };
          },
        },
      });

      const failureHandler = vi.fn();

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

      createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

      await allSettled(mutation.start, { scope });

      expect(scope.getState(mutation.$failed)).toBe(true);
      expect(failureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ requestId: 'req-123' }),
        })
      );
    });
  });

  test('without mapError, error passes through unchanged', async () => {
    const originalError = { message: 'Original error' };

    const mutation = createJsonMutation({
      request,
      response: {
        contract: unknownContract,
        // No mapError provided
      },
    });

    const fetchMock = vi.fn(() => Promise.reject(originalError));
    const failureHandler = vi.fn();

    const scope = fork({ handlers: [[mutation.__.executeFx, fetchMock]] });

    createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

    await allSettled(mutation.start, { scope });

    expect(scope.getState(mutation.$failed)).toBe(true);
    expect(failureHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        error: originalError,
      })
    );
  });

  test('finished.failure receives transformed error', async () => {
    const originalError = { message: 'Original error' };
    const transformedError = { message: 'Transformed error', code: 'ERR_001' };

    const mutation = createJsonMutation({
      params: declareParams<{ id: number }>(),
      request,
      response: {
        contract: unknownContract,
        mapError: () => transformedError,
      },
    });

    const fetchMock = vi.fn(() => Promise.reject(originalError));
    const failureHandler = vi.fn();

    const scope = fork({ handlers: [[mutation.__.executeFx, fetchMock]] });

    createWatch({ unit: mutation.finished.failure, fn: failureHandler, scope });

    await allSettled(mutation.start, { scope, params: { id: 1 } });

    expect(failureHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: 1 },
        error: transformedError,
      })
    );
  });
});
