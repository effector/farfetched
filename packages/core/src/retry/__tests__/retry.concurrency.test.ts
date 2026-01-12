import { allSettled, createEvent, createWatch, fork } from 'effector';
import { describe, test, vi, expect, beforeAll, afterAll } from 'vitest';
import { setTimeout } from 'timers/promises';

import { createDefer } from '../../libs/lohyphen';
import { createQuery } from '../../query/create_query';
import { createJsonQuery } from '../../query/create_json_query';
import { onAbort } from '../../remote_operation/on_abort';
import { concurrency } from '../../concurrency/concurrency';
import { retry } from '../retry';
import { unknownContract } from '../../contract/unknown_contract';
import { fetchFx } from '../../fetch/fetch';
import { watchRemoteOperation } from '../../test_utils/watch_query';
import { declareParams } from '../../remote_operation/params';

describe('retry with concurrency', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('TAKE_LATEST strategy', () => {
    test('abort error should NOT trigger retry', async () => {
      const handler = vi.fn().mockImplementation(async (id: string) => {
        const defer = createDefer();

        onAbort(() => defer.reject(new Error('aborted')));

        await setTimeout(100);
        defer.resolve(id);

        return defer.promise;
      });

      const query = createQuery({ handler });

      concurrency(query, { strategy: 'TAKE_LATEST' });
      retry(query, { times: 3, delay: 10 });

      const scope = fork();

      const abortedListener = vi.fn();
      createWatch({ unit: query.aborted, fn: abortedListener, scope });

      // Start first request
      allSettled(query.start, { scope, params: '1' });

      // Start second request immediately (should abort first)
      allSettled(query.start, { scope, params: '2' });

      await vi.advanceTimersByTimeAsync(200);
      await allSettled(scope);

      // First request should be aborted
      expect(abortedListener).toHaveBeenCalledTimes(1);

      // Handler should only be called twice (1 aborted + 1 successful)
      // NOT 5 times (1 aborted + 3 retries + 1 successful)
      expect(handler).toBeCalledTimes(2);

      // Query should have data from second request
      expect(scope.getState(query.$data)).toBe('2');
      expect(scope.getState(query.$error)).toBeNull();
    });

    test('retry should still work for non-abort errors with TAKE_LATEST', async () => {
      const handler = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const query = createQuery({ handler });

      concurrency(query, { strategy: 'TAKE_LATEST' });
      retry(query, { times: 3, delay: 10 });

      const scope = fork();

      allSettled(query.start, { scope, params: 'test' });

      await vi.advanceTimersByTimeAsync(50);
      await allSettled(scope);

      // Handler should be called twice (1 failed + 1 retry success)
      expect(handler).toBeCalledTimes(2);
      expect(scope.getState(query.$data)).toBe('success');
    });

    test('multiple rapid requests should only complete the last one', async () => {
      const handler = vi.fn().mockImplementation(async (id: string) => {
        const defer = createDefer();

        onAbort(() => defer.reject(new Error('aborted')));

        await setTimeout(50);
        defer.resolve(id);

        return defer.promise;
      });

      const query = createQuery({ handler });

      concurrency(query, { strategy: 'TAKE_LATEST' });
      retry(query, { times: 2, delay: 10 });

      const scope = fork();

      const abortedListener = vi.fn();
      createWatch({ unit: query.aborted, fn: abortedListener, scope });

      // Rapid fire multiple requests
      allSettled(query.start, { scope, params: '1' });
      allSettled(query.start, { scope, params: '2' });
      allSettled(query.start, { scope, params: '3' });

      await vi.advanceTimersByTimeAsync(200);
      await allSettled(scope);

      // First two should be aborted
      expect(abortedListener).toHaveBeenCalledTimes(2);

      // Only the last request should succeed, no retries for aborts
      expect(scope.getState(query.$data)).toBe('3');
      expect(scope.getState(query.$error)).toBeNull();
    });
  });

  describe('TAKE_FIRST strategy', () => {
    test('abort error from TAKE_FIRST should NOT trigger retry', async () => {
      const handler = vi.fn().mockImplementation(async (id: string) => {
        const defer = createDefer();

        onAbort(() => defer.reject(new Error('aborted')));

        await setTimeout(50);
        defer.resolve(id);

        return defer.promise;
      });

      const query = createQuery({ handler });

      concurrency(query, { strategy: 'TAKE_FIRST' });
      retry(query, { times: 3, delay: 10 });

      const scope = fork();

      const abortedListener = vi.fn();
      createWatch({ unit: query.aborted, fn: abortedListener, scope });

      // Start first request
      allSettled(query.start, { scope, params: '1' });

      // Start second request (should be ignored/aborted)
      allSettled(query.start, { scope, params: '2' });

      await vi.advanceTimersByTimeAsync(200);
      await allSettled(scope);

      // Second request should be aborted
      expect(abortedListener).toHaveBeenCalledTimes(1);

      // Handler should only be called once (first request succeeds)
      // The aborted second request should NOT trigger retry
      expect(handler).toBeCalledTimes(1);

      // Query should have data from first request
      expect(scope.getState(query.$data)).toBe('1');
    });
  });

  describe('abortAll event', () => {
    test('abort via abortAll should NOT trigger retry', async () => {
      const handler = vi.fn().mockImplementation(async () => {
        const defer = createDefer();

        onAbort(() => defer.reject(new Error('aborted')));

        await setTimeout(100);
        defer.resolve('data');

        return defer.promise;
      });

      const query = createQuery({ handler });

      const abortAll = createEvent();
      concurrency(query, { abortAll });
      retry(query, { times: 3, delay: 10 });

      const scope = fork();

      const abortedListener = vi.fn();
      createWatch({ unit: query.aborted, fn: abortedListener, scope });

      // Start request
      allSettled(query.start, { scope });

      // Abort via abortAll event
      await allSettled(abortAll, { scope });

      await vi.advanceTimersByTimeAsync(200);
      await allSettled(scope);

      // Request should be aborted
      expect(abortedListener).toHaveBeenCalledTimes(1);

      // Handler should only be called once (no retries)
      expect(handler).toBeCalledTimes(1);

      // Query should not have data (was aborted)
      expect(scope.getState(query.$data)).toBeNull();
      expect(scope.getState(query.$error)).toBeNull();
    });
  });

  describe('with createJsonQuery', () => {
    test('TAKE_LATEST + retry with createJsonQuery should not retry aborts', async () => {
      const fetchMock = vi.fn().mockImplementation(async (request: Request) => {
        await setTimeout(50);

        if (request.signal.aborted) {
          throw new Error('Request aborted');
        }

        return new Response(JSON.stringify({ data: request.url }));
      });

      const query = createJsonQuery({
        params: declareParams<{ id: string }>(),
        request: {
          url: ({ id }) => `https://api.example.com/${id}`,
          method: 'GET' as const,
        },
        response: { contract: unknownContract },
      });

      concurrency(query, { strategy: 'TAKE_LATEST' });
      retry(query, { times: 3, delay: 10 });

      const scope = fork({
        handlers: [[fetchFx, fetchMock]],
      });

      const abortedListener = vi.fn();
      createWatch({ unit: query.aborted, fn: abortedListener, scope });

      // Start first request
      allSettled(query.start, { scope, params: { id: '1' } });

      // Start second request (should abort first)
      allSettled(query.start, { scope, params: { id: '2' } });

      await vi.advanceTimersByTimeAsync(200);
      await allSettled(scope);

      // First request should be aborted
      expect(abortedListener).toHaveBeenCalledTimes(1);

      // Fetch should be called twice (1 aborted + 1 success), not more
      expect(fetchMock).toBeCalledTimes(2);

      // Query should have data from second request
      expect(scope.getState(query.$data)).toMatchObject({
        data: 'https://api.example.com/2',
      });
    });
  });

  describe('retry filter with concurrency', () => {
    test('custom retry filter should still be respected for non-abort errors', async () => {
      const handler = vi
        .fn()
        .mockRejectedValueOnce({ type: 'NETWORK' })
        .mockRejectedValueOnce({ type: 'VALIDATION' })
        .mockResolvedValueOnce('success');

      const query = createQuery({ handler });

      concurrency(query, { strategy: 'TAKE_LATEST' });
      retry(query, {
        times: 3,
        delay: 10,
        filter: ({ error }) => (error as any).type === 'NETWORK',
      });

      const scope = fork();

      const { listeners } = watchRemoteOperation(query, scope);

      allSettled(query.start, { scope, params: 'test' });

      await vi.advanceTimersByTimeAsync(100);
      await allSettled(scope);

      // Handler called twice: 1 NETWORK (retried) + 1 VALIDATION (not retried)
      expect(handler).toBeCalledTimes(2);

      // Should fail with VALIDATION error (not retried)
      expect(listeners.onFailure).toBeCalledTimes(1);
      expect(scope.getState(query.$error)).toEqual({ type: 'VALIDATION' });
    });
  });

  describe('edge cases', () => {
    test('abort during retry delay should not cause issues', async () => {
      const defer = createDefer();
      const handler = vi.fn().mockImplementation(async () => {
        onAbort(() => defer.reject(new Error('aborted')));
        return defer.promise;
      });

      const query = createQuery({ handler });

      const abortAll = createEvent();
      concurrency(query, { abortAll });
      retry(query, { times: 3, delay: 100 });

      const scope = fork();

      // Start request (will hang until aborted)
      allSettled(query.start, { scope, params: 'test' });

      // Wait a tick
      await vi.advanceTimersByTimeAsync(10);

      // Abort the in-flight request
      await allSettled(abortAll, { scope });

      await vi.advanceTimersByTimeAsync(200);
      await allSettled(scope);

      // Should not be stuck in pending
      expect(scope.getState(query.$pending)).toBe(false);
    });

    test('concurrent requests with different params and retry', async () => {
      let callCount = 0;
      const handler = vi.fn().mockImplementation(async (id: string) => {
        callCount++;
        const defer = createDefer();

        onAbort(() => defer.reject(new Error('aborted')));

        // First request fails, others succeed
        if (callCount === 1 && id === '1') {
          throw new Error('First request failed');
        }

        await setTimeout(30);
        defer.resolve(`result-${id}`);

        return defer.promise;
      });

      const query = createQuery({ handler });

      concurrency(query, { strategy: 'TAKE_LATEST' });
      retry(query, { times: 2, delay: 10 });

      const scope = fork();

      // Start request that will fail
      allSettled(query.start, { scope, params: '1' });

      // Immediately start another (will abort first)
      allSettled(query.start, { scope, params: '2' });

      await vi.advanceTimersByTimeAsync(200);
      await allSettled(scope);

      // Should end with result from second request
      expect(scope.getState(query.$data)).toBe('result-2');
      expect(scope.getState(query.$pending)).toBe(false);
    });
  });
});
