import { allSettled, createEffect, createStore, fork } from 'effector';
import { setTimeout } from 'timers/promises';
import { describe, test, expect, vi } from 'vitest';

import { watchRemoteOperation } from '../../test_utils/watch_query';
import { createQuery } from '../../query/create_query';
import { applyBarrier } from '../apply_barrier';
import { createBarrier } from '../create_barrier';
import { isHttpErrorCode } from '../../errors/guards';
import { httpError } from '../../errors/create_error';
import { createDefer } from '../../libs/lohyphen';

describe('applyBarrier', () => {
  test.concurrent('deactivated barrier does not affect operation', async () => {
    const barrier = createBarrier({ active: createStore(false) });

    const query = createQuery({ handler: vi.fn(async (_: void) => null) });

    applyBarrier(query, { barrier });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    allSettled(query.refresh, { scope });
    expect(listeners.onStart).toBeCalled();

    await setTimeout(1);
    expect(listeners.onSuccess).toBeCalled();

    await allSettled(scope);
  });

  test.concurrent('activated barrier postpones operation', async () => {
    const $barrierActive = createStore(true);

    const barrier = createBarrier({ active: $barrierActive });

    const query = createQuery({ handler: vi.fn(async (_: void) => null) });

    applyBarrier(query, { barrier });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    allSettled(query.refresh, { scope });
    expect(listeners.onStart).toBeCalled();

    await setTimeout(1);
    expect(listeners.onSuccess).not.toBeCalled();

    await allSettled($barrierActive, { scope, params: false });
    expect(listeners.onSuccess).toBeCalled();
  });

  test.concurrent('barrier activates on query fail', async () => {
    const defer = createDefer();

    const renewTokenFx = createEffect(() => defer.promise);

    const authBarrier = createBarrier({
      activateOn: { failure: isHttpErrorCode(401) },
      perform: [renewTokenFx],
    });

    const query = createQuery({
      handler: vi
        .fn()
        .mockRejectedValueOnce(
          httpError({ status: 401, statusText: 'Nooo', response: null })
        )
        .mockResolvedValueOnce('OK'),
    });

    applyBarrier(query, { barrier: authBarrier });

    const scope = fork();

    const { listeners } = watchRemoteOperation(query, scope);

    allSettled(query.refresh, { scope });
    await setTimeout(1);
    expect(scope.getState(authBarrier.$active)).toBeTruthy();

    defer.resolve(null);
    await allSettled(scope);
    expect(scope.getState(authBarrier.$active)).toBeFalsy();
    expect(listeners.onFailure).toBeCalledTimes(1);
    expect(listeners.onSuccess).toBeCalledTimes(1);
    expect(listeners.onSuccess).toBeCalledWith(
      expect.objectContaining({ result: 'OK' })
    );
  });

  test.concurrent('two queries start barrier performer only once', async () => {
    const performerDefer = createDefer();
    const performer = vi.fn(() => performerDefer.promise);

    const authBarrier = createBarrier({
      activateOn: { failure: isHttpErrorCode(401) },
      perform: [createEffect(performer)],
    });

    const query1 = createQuery({
      handler: vi
        .fn()
        .mockRejectedValueOnce(
          httpError({ status: 401, statusText: 'Nooo', response: null })
        )
        .mockResolvedValueOnce('OK'),
    });

    const query2 = createQuery({
      handler: vi
        .fn()
        .mockRejectedValueOnce(
          httpError({ status: 401, statusText: 'Nooo', response: null })
        )
        .mockResolvedValueOnce('OK'),
    });

    applyBarrier([query1, query2], { barrier: authBarrier });

    const scope = fork();

    allSettled(query1.refresh, { scope });
    allSettled(query2.refresh, { scope });

    performerDefer.resolve(null);
    await allSettled(scope);

    expect(performer).toBeCalledTimes(1);
  });

  test.concurrent(
    'suppress intermediate failure on operation fail',
    async () => {
      const defer = createDefer();

      const renewTokenFx = createEffect(() => defer.promise);

      const authBarrier = createBarrier({
        activateOn: { failure: isHttpErrorCode(401) },
        perform: [renewTokenFx],
      });

      const query = createQuery({
        handler: vi
          .fn()
          .mockRejectedValueOnce(
            httpError({ status: 401, statusText: 'Nooo', response: null })
          )
          .mockResolvedValueOnce('OK'),
      });

      applyBarrier(query, {
        barrier: authBarrier,
        suppressIntermediateFailures: true,
      });

      const scope = fork();

      const { listeners } = watchRemoteOperation(query, scope);

      allSettled(query.refresh, { scope });
      await setTimeout(1);
      expect(scope.getState(authBarrier.$active)).toBeTruthy();

      defer.resolve(null);
      await allSettled(scope);
      expect(scope.getState(authBarrier.$active)).toBeFalsy();
      expect(listeners.onFailure).toBeCalledTimes(0);
      expect(listeners.onSuccess).toBeCalledTimes(1);
      expect(listeners.onSuccess).toBeCalledWith(
        expect.objectContaining({ result: 'OK' })
      );
    }
  );
});
