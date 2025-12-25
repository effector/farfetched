import {
  type UnitValue,
  allSettled,
  createEvent,
  createStore,
  fork,
} from 'effector';
import { describe, test, vi, expect, beforeAll, afterAll } from 'vitest';

import { watchRemoteOperation } from '../../test_utils/watch_query';
import { createQuery } from '../../query/create_query';
import { retry } from '../retry';

describe('retry with query', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('starts query after failure with same args by default', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));
    const query = createQuery({
      handler,
    });

    retry(query, { times: 1, delay: 0 });

    const scope = fork();

    allSettled(query.start, { scope, params: 'Some test param' });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(handler).toBeCalledTimes(2);

    // Same args for retries
    expect(handler).toHaveBeenNthCalledWith(1, 'Some test param');
    expect(handler).toHaveBeenNthCalledWith(2, 'Some test param');
  });

  test('respects times (static)', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));
    const query = createQuery({
      handler,
    });

    retry(query, { times: 4, delay: 0 });

    const scope = fork();

    allSettled(query.start, { scope, params: 'Some test param' });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(handler).toBeCalledTimes(5);
  });

  test('respects delay (static)', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));
    const query = createQuery({
      handler,
    });

    retry(query, { times: 1, delay: 100 });

    const scope = fork();

    const start = Date.now();

    allSettled(query.start, { scope, params: 'Some test param' });

    await vi.advanceTimersByTimeAsync(100);
    await allSettled(scope);

    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(100);
  });

  test('respects delay (function)', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));
    const query = createQuery({
      handler,
    });

    retry(query, {
      times: 3,
      delay: ({ attempt }) => attempt * 100,
    });

    const scope = fork();

    const start = Date.now();

    allSettled(query.start, { scope, params: 'Some test param' });

    await vi.advanceTimersByTimeAsync(100 + 200 + 300);
    await allSettled(scope);

    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(100 + 200 + 300);
  });

  test('respects delay (string)', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));
    const query = createQuery({
      handler,
    });

    retry(query, { times: 1, delay: '1sec' });

    const scope = fork();

    const start = Date.now();

    allSettled(query.start, { scope, params: 'Some test param' });

    await vi.advanceTimersByTimeAsync(1000);
    await allSettled(scope);

    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(1000);
  });

  test('respects mapParams', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));
    const query = createQuery({
      handler,
    });

    const mapParams = vi.fn(
      ({ params, meta: { attempt } }) => `${params} ${attempt}`
    );

    retry(query, {
      times: 3,
      delay: 0,
      mapParams,
    });

    const scope = fork();

    allSettled(query.start, { scope, params: 'Initial' });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(handler).toBeCalledTimes(4);
    expect(handler).toHaveBeenNthCalledWith(1, 'Initial');
    expect(handler).toHaveBeenNthCalledWith(2, 'Initial 1');
    expect(handler).toHaveBeenNthCalledWith(3, 'Initial 1 2');
    expect(handler).toHaveBeenNthCalledWith(4, 'Initial 1 2 3');

    expect(mapParams.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "error": [Error: Sorry],
            "meta": {
              "attempt": 1,
              "maxAttempts": 3,
              "stale": true,
              "stopErrorPropagation": false,
            },
            "params": "Initial",
          },
        ],
        [
          {
            "error": [Error: Sorry],
            "meta": {
              "attempt": 2,
              "maxAttempts": 3,
              "stale": true,
              "stopErrorPropagation": false,
            },
            "params": "Initial 1",
          },
        ],
        [
          {
            "error": [Error: Sorry],
            "meta": {
              "attempt": 3,
              "maxAttempts": 3,
              "stale": true,
              "stopErrorPropagation": false,
            },
            "params": "Initial 1 2",
          },
        ],
      ]
    `);
  });

  test('respects after success', async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error('Sorry'))
      .mockRejectedValueOnce(new Error('Sorry'))
      .mockResolvedValueOnce('Success')
      .mockRejectedValueOnce(new Error('Sorry'))
      .mockRejectedValueOnce(new Error('Sorry'))
      .mockResolvedValueOnce('Success');

    const query = createQuery({
      handler,
    });

    retry(query, { times: 2, delay: 0 });

    const scope = fork();

    allSettled(query.start, { scope });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(handler).toBeCalledTimes(3);

    allSettled(query.start, { scope });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(scope.getState(query.$data)).toEqual('Success');
    expect(handler).toBeCalledTimes(6);
  });

  test('respects filter option (static)', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));

    const query = createQuery({
      handler,
    });

    retry(query, {
      times: 10,
      delay: 0,
      filter: false,
    });

    const scope = fork();

    allSettled(query.start, { scope });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(handler).toBeCalledTimes(1);
  });

  test('respects filter option (store)', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));

    const query = createQuery({
      handler,
    });

    retry(query, {
      times: 10,
      delay: 0,
      filter: createStore(false),
    });

    const scope = fork();

    allSettled(query.start, { scope });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(handler).toBeCalledTimes(1);
  });

  test('respects filter option (function)', async () => {
    const queryError = new Error('Sorry');
    const handler = vi.fn().mockRejectedValue(queryError);

    const query = createQuery({
      handler,
    });

    const filter = vi.fn().mockReturnValue(false);

    retry(query, {
      times: 10,
      delay: 0,
      filter,
    });

    const scope = fork();

    allSettled(query.start, { scope });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(handler).toBeCalledTimes(1);
    expect(filter).toBeCalledWith(
      expect.objectContaining({ params: undefined, error: queryError })
    );
  });

  test('calls otherwise event after all retries', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));
    const query = createQuery({
      handler,
    });

    const otherwise = createEvent<UnitValue<typeof query.finished.failure>>();
    const otherwiseListener = vi.fn();
    otherwise.watch(otherwiseListener);

    retry(query, {
      times: 2,
      delay: 0,
      otherwise,
    });

    const scope = fork();

    allSettled(query.start, { scope, params: 42 });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(otherwiseListener).toBeCalledTimes(1);
    expect(otherwiseListener).toBeCalledWith(
      expect.objectContaining({ params: 42 })
    );
  });

  test('does not call otherwise event until all retries', async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error('Sorry'))
      .mockResolvedValueOnce(42);
    const query = createQuery({
      handler,
    });

    const otherwise = createEvent<UnitValue<typeof query.finished.failure>>();
    const otherwiseListener = vi.fn();
    otherwise.watch(otherwiseListener);

    retry(query, {
      times: 1,
      delay: 0,
      otherwise,
    });

    const scope = fork();

    allSettled(query.start, { scope, params: 42 });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    expect(otherwiseListener).not.toBeCalled();
  });

  test('reset failure counter for manual query start', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Sorry'));

    const query = createQuery({
      handler,
    });

    retry(query, { times: 1, delay: 0 });

    const scope = fork();

    allSettled(query.start, { scope, params: 42 });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    // 1 for start
    // 1 for retry
    expect(handler).toBeCalledTimes(2);

    allSettled(query.start, { scope, params: 42 });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    // 1 for start
    // 1 for retry
    expect(handler).toBeCalledTimes(4);
  });

  test('throw error in case of retry with supressIntermediateErrors: false', async () => {
    const query = createQuery({
      handler: vi.fn().mockRejectedValue(new Error('Sorry')),
    });

    retry(query, { times: 1, delay: 0, supressIntermediateErrors: false });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    allSettled(query.start, { scope, params: 42 });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    // 1 for original start
    // 1 for retry
    expect(listeners.onFailure).toBeCalledTimes(2);
  });

  test('throw error in case of retry', async () => {
    const query = createQuery({
      handler: vi.fn().mockImplementation(({ attempt }) => {
        throw new Error(`Sorry, attempt ${attempt}`);
      }),
    });

    retry(query, {
      times: 1,
      mapParams({ meta }) {
        return { attempt: meta.attempt };
      },
      delay: 0,
    });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    allSettled(query.start, { scope, params: { attempt: 0 } });

    await vi.advanceTimersByTimeAsync(10);
    await allSettled(scope);

    // 1 for retry
    expect(listeners.onFailure).toBeCalledTimes(1);
    expect(listeners.onFailure.mock.calls[0]).toMatchInlineSnapshot(`
      [
        {
          "error": [Error: Sorry, attempt 1],
          "meta": {
            "responseMeta": undefined,
            "stale": false,
            "stopErrorPropagation": false,
          },
          "params": {
            "attempt": 1,
          },
        },
      ]
    `);
  });
});
