import { allSettled, fork } from 'effector';
import { setTimeout } from 'timers/promises';
import { describe, test, expect, vi } from 'vitest';

import { watchRemoteOperation } from '../../test_utils/watch_query';
import { createMutation } from '../../mutation/create_mutation';
import { createQuery } from '../../query/create_query';
import { update } from '../update';

describe('update', () => {
  test('change query state with a result after mutation success anf failure', async () => {
    const query = createQuery({
      handler: vi.fn().mockRejectedValue(new Error('Cannot')),
    });
    const mutation = createMutation({
      handler: vi
        .fn()
        .mockResolvedValueOnce('from mutation')
        .mockRejectedValueOnce(new Error('Cannot')),
    });

    update(query, {
      on: mutation,
      by: {
        success: () => ({ result: 'bySuccess' }),
        failure: () => ({ result: 'byFailure' }),
      },
    });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    await allSettled(query.start, { scope });

    await allSettled(mutation.start, { scope });
    expect(scope.getState(query.$data)).toEqual('bySuccess');
    expect(scope.getState(query.$error)).toEqual(null);

    await allSettled(mutation.start, { scope });
    expect(scope.getState(query.$data)).toEqual('byFailure');
    expect(scope.getState(query.$error)).toEqual(null);

    expect(listeners.onStart).toBeCalledTimes(1); // only original call
  });

  test('change query state with a result after mutation success anf failure', async () => {
    const query = createQuery({
      handler: vi.fn().mockResolvedValue('from query'),
    });
    const mutation = createMutation({
      handler: vi
        .fn()
        .mockResolvedValueOnce('from mutation')
        .mockRejectedValueOnce(new Error('Cannot')),
    });

    update(query, {
      on: mutation,
      by: {
        success: () => ({ error: 'bySuccess' }),
        failure: () => ({ error: 'byFailure' }),
      },
    });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    await allSettled(query.start, { scope });

    await allSettled(mutation.start, { scope });
    expect(scope.getState(query.$error)).toEqual('bySuccess');
    expect(scope.getState(query.$data)).toEqual(null);

    await allSettled(mutation.start, { scope });
    expect(scope.getState(query.$error)).toEqual('byFailure');
    expect(scope.getState(query.$data)).toEqual(null);

    expect(listeners.onStart).toBeCalledTimes(1); // only original call
  });

  test('respect initialData of query', async () => {
    const query = createQuery({
      handler: vi.fn().mockRejectedValue(new Error('Cannot')),
      initialData: 'initial',
    });
    const mutation = createMutation({
      handler: vi
        .fn()
        .mockResolvedValueOnce('from mutation')
        .mockRejectedValueOnce(new Error('Cannot')),
    });

    update(query, {
      on: mutation,
      by: {
        success: () => ({ error: 'bySuccess' }),
        failure: () => ({ error: 'byFailure' }),
      },
    });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    await allSettled(query.start, { scope });

    await allSettled(mutation.start, { scope });
    expect(scope.getState(query.$error)).toEqual('bySuccess');
    expect(scope.getState(query.$data)).toEqual('initial');

    await allSettled(mutation.start, { scope });
    expect(scope.getState(query.$error)).toEqual('byFailure');
    expect(scope.getState(query.$data)).toEqual('initial');

    expect(listeners.onStart).toBeCalledTimes(1); // only original call
  });

  test('refetch true causes query to be refetched with latest params shorthand', async () => {
    const query = createQuery({
      handler: vi.fn().mockImplementation((params: number) => setTimeout(100).then(() => params.toString())),
      initialData: 'initial',
    });

    const mutation = createMutation({ handler: vi.fn().mockResolvedValue('from mutation') });

    update(query, { on: mutation });

    const scope = fork();
    const { listeners } = watchRemoteOperation(query, scope);

    await allSettled(query.start, { scope, params: 1 });
    await allSettled(query.start, { scope, params: 2 });

    allSettled(mutation.start, { scope }); // Do not wait
    await setTimeout(1); // Async nature of mutations
    expect(scope.getState(query.$data)).toEqual('initial');
    expect(scope.getState(query.$stale)).toBeTruthy();

    await allSettled(scope);
    expect(scope.getState(query.$data)).toEqual('2');

    expect(listeners.onStart).toBeCalledTimes(3); // 2 original and 1 by refetch
    expect(listeners.onStart).toHaveBeenNthCalledWith(3, 2); // refetch uses latest params
    expect(scope.getState(query.$stale)).toBeFalsy();
  });

  test('refetch true causes query to be refetched with latest params', async () => {
    const query = createQuery({
      handler: vi
        .fn()
        .mockImplementation((params: number) =>
          setTimeout(100).then(() => params.toString())
        ),
      initialData: 'initial',
    });
    const mutation = createMutation({
      handler: vi.fn().mockResolvedValue('from mutation'),
    });

    update(query, {
      on: mutation,
      by: {
        success: () => ({ result: 'bySuccess', refetch: true }),
      },
    });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    await allSettled(query.start, { scope, params: 1 });
    await allSettled(query.start, { scope, params: 2 });

    allSettled(mutation.start, { scope }); // Do not wait
    await setTimeout(1); // Async nature of mutations
    expect(scope.getState(query.$data)).toEqual('bySuccess');
    expect(scope.getState(query.$stale)).toBeTruthy();

    await allSettled(scope);
    expect(scope.getState(query.$data)).toEqual('2');

    expect(listeners.onStart).toBeCalledTimes(3); // 2 original and 1 by refetch
    expect(listeners.onStart).toHaveBeenNthCalledWith(3, 2); // refetch uses latest params
    expect(scope.getState(query.$stale)).toBeFalsy();
  });

  test('refetch with params causes query to be refetched with new params', async () => {
    const query = createQuery({
      handler: vi
        .fn()
        .mockImplementation((params: number) =>
          setTimeout(100).then(() => params.toString())
        ),
      initialData: 'initial',
    });
    const mutation = createMutation({
      handler: vi.fn().mockResolvedValue('from mutation'),
    });

    update(query, {
      on: mutation,
      by: {
        success: () => ({ result: 'bySuccess', refetch: { params: 3 } }),
      },
    });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    await allSettled(query.start, { scope, params: 1 });
    await allSettled(query.start, { scope, params: 2 });

    allSettled(mutation.start, { scope }); // Do not wait
    await setTimeout(1); // Async nature of mutations
    expect(scope.getState(query.$data)).toEqual('bySuccess');
    expect(scope.getState(query.$stale)).toBeTruthy();

    await allSettled(scope);
    expect(scope.getState(query.$data)).toEqual('3');

    expect(listeners.onStart).toBeCalledTimes(3); // 2 original and 1 by refetch
    expect(listeners.onStart).toHaveBeenNthCalledWith(3, 3); // refetch uses params from callback
    expect(scope.getState(query.$stale)).toBeFalsy();
  });

  test('query (no params) state passes to rules', async () => {
    const query = createQuery({
      handler: vi
        .fn()
        .mockResolvedValueOnce('original result')
        .mockRejectedValueOnce('original failure'),
    });

    const mutation = createMutation({
      handler: vi
        .fn()
        .mockResolvedValueOnce('mutation success 1')
        .mockRejectedValueOnce('mutation failure 1')
        .mockResolvedValueOnce('mutation success 2')
        .mockRejectedValueOnce('mutation failure 2')
        .mockResolvedValueOnce('mutation success 3')
        .mockRejectedValueOnce('mutation failure 3'),
    });

    const successRule = vi.fn().mockReturnValue({ error: 'bySuccess' });
    const failureRule = vi.fn().mockReturnValue({ error: 'byFailure' });

    update(query, {
      on: mutation,
      by: { success: successRule, failure: failureRule },
    });

    const scope = fork();

    await allSettled(mutation.start, { scope });
    expect(successRule).toBeCalledWith(
      expect.objectContaining({
        query: null,
      })
    );
    await allSettled(query.reset, { scope });
    await allSettled(mutation.start, { scope });
    expect(failureRule).toBeCalledWith(
      expect.objectContaining({
        query: null,
      })
    );

    // success run
    await allSettled(query.start, { scope });
    await allSettled(mutation.start, { scope });
    expect(successRule).toBeCalledWith(
      expect.objectContaining({
        query: { result: 'original result', params: undefined },
      })
    );

    // failed run
    await allSettled(query.start, { scope });

    await allSettled(mutation.start, { scope });
    expect(failureRule).toBeCalledWith(
      expect.objectContaining({
        query: { error: 'original failure', params: undefined },
      })
    );
  });

  test('query (with params) state passes to rules', async () => {
    const query = createQuery({
      handler: vi
        .fn()
        .mockResolvedValueOnce('original result')
        .mockRejectedValueOnce('original failure'),
    });

    const mutation = createMutation({
      handler: vi
        .fn()
        .mockResolvedValueOnce('mutation success 1')
        .mockRejectedValueOnce('mutation failure 1')
        .mockResolvedValueOnce('mutation success 2')
        .mockRejectedValueOnce('mutation failure 2')
        .mockResolvedValueOnce('mutation success 3')
        .mockRejectedValueOnce('mutation failure 3'),
    });

    const successRule = vi.fn().mockReturnValue({ error: 'bySuccess' });
    const failureRule = vi.fn().mockReturnValue({ error: 'byFailure' });

    update(query, {
      on: mutation,
      by: { success: successRule, failure: failureRule },
    });

    const scope = fork();

    await allSettled(mutation.start, { scope });
    expect(successRule).toBeCalledWith(
      expect.objectContaining({
        query: null,
      })
    );
    await allSettled(query.reset, { scope });
    await allSettled(mutation.start, { scope });
    expect(failureRule).toBeCalledWith(
      expect.objectContaining({
        query: null,
      })
    );

    // success run
    await allSettled(query.start, { scope, params: 1 });
    await allSettled(mutation.start, { scope });
    expect(successRule).toBeCalledWith(
      expect.objectContaining({
        query: { result: 'original result', params: 1 },
      })
    );

    // failed run
    await allSettled(query.start, { scope, params: 2 });

    await allSettled(mutation.start, { scope });
    expect(failureRule).toBeCalledWith(
      expect.objectContaining({
        query: { error: 'original failure', params: 2 },
      })
    );
  });

  test('mutation (no params) state passes to rules', async () => {
    const query = createQuery({
      handler: vi.fn().mockResolvedValue('original result'),
    });

    const mutation = createMutation({
      handler: vi
        .fn()
        .mockResolvedValueOnce('mutation result')
        .mockRejectedValueOnce('mutation failure'),
    });

    const successRule = vi.fn().mockReturnValue({ result: 'bySuccess' });
    const failureRule = vi.fn().mockReturnValue({ error: 'byFailure' });

    update(query, {
      on: mutation,
      by: { success: successRule, failure: failureRule },
    });

    const scope = fork();

    // success run
    await allSettled(mutation.start, { scope });
    expect(successRule).toBeCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          result: 'mutation result',
          params: undefined,
        }),
      })
    );
    expect(successRule).toBeCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          result: 'mutation result',
          params: undefined,
        }),
      })
    );

    // failed run
    await allSettled(mutation.start, { scope });
    expect(failureRule).toBeCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          error: 'mutation failure',
          params: undefined,
        }),
      })
    );
    expect(failureRule).toBeCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          error: 'mutation failure',
          params: undefined,
        }),
      })
    );
  });

  test('mutation (with params) state passes to rules', async () => {
    const query = createQuery({
      handler: vi.fn().mockResolvedValue('original result'),
    });

    const mutation = createMutation({
      handler: vi
        .fn()
        .mockResolvedValueOnce('mutation result')
        .mockRejectedValueOnce('mutation failure'),
    });

    const successRule = vi.fn().mockReturnValue({ result: 'bySuccess' });
    const failureRule = vi.fn().mockReturnValue({ error: 'byFailure' });

    update(query, {
      on: mutation,
      by: { success: successRule, failure: failureRule },
    });

    const scope = fork();

    // success run
    await allSettled(mutation.start, { scope, params: 1 });
    expect(successRule).toBeCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          result: 'mutation result',
          params: 1,
        }),
      })
    );
    expect(successRule).toBeCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          result: 'mutation result',
          params: 1,
        }),
      })
    );

    // failed run
    await allSettled(mutation.start, { scope, params: 2 });
    expect(failureRule).toBeCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          error: 'mutation failure',
          params: 2,
        }),
      })
    );
    expect(failureRule).toBeCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          error: 'mutation failure',
          params: 2,
        }),
      })
    );
  });

  test('use initial data type in case of not started query, issue #370', async () => {
    const queryHandler = vi.fn(async (p: string) => [1, Number(p)]);
    const mutationHandler = vi.fn(async (x: number) => x);

    const query = createQuery({
      handler: queryHandler,
      initialData: [1],
    });

    const mutation = createMutation({
      handler: mutationHandler,
    });

    const successHandler = vi.fn(() => ({ result: [], refetch: true }));

    update(query, {
      on: mutation,
      by: {
        success: successHandler,
      },
    });

    const scope = fork();

    await allSettled(mutation.start, { scope, params: 10 });

    expect(queryHandler).not.toBeCalled();
    expect(successHandler).toBeCalledWith(
      expect.objectContaining({ query: { result: [1] } })
    );
  });
});
