import { allSettled, createStore, createWatch, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';
import { setTimeout } from 'timers/promises';

import { watchRemoteOperation } from '../../test_utils/watch_query';
import { unknownContract } from '../../contract/unknown_contract';
import { createDefer } from '../../libs/lohyphen';
import { createRemoteOperation } from '../create_remote_operation';
import { isTimeoutError } from '../../errors/guards';
import { timeoutError } from '../../errors/create_error';
import { onAbort } from '../on_abort';

const defaultConfig = {
  name: 'test',
  mapData: (v: any) => v,
  meta: null,
  kind: 'test',
  contract: unknownContract,
};

describe('createRemoteOperation, disable in-flight', () => {
  test('emit skip with success in handler', async () => {
    const defer = createDefer();

    const $enabled = createStore(true);

    const operation = createRemoteOperation({
      ...defaultConfig,
      enabled: $enabled,
    });
    operation.__.executeFx.use(() => defer.promise);

    const scope = fork();

    const { listeners } = watchRemoteOperation(operation, scope);

    allSettled(operation.start, { scope, params: 1 });
    allSettled($enabled, { scope, params: false });

    defer.resolve({});

    await allSettled(scope);

    expect(listeners.onSkip).toBeCalledTimes(1);
    expect(listeners.onSkip).toBeCalledWith(
      expect.objectContaining({ params: 1 })
    );
    expect(listeners.onSuccess).not.toBeCalled();
  });

  test('emit skip with error in handler', async () => {
    const defer = createDefer();

    const $enabled = createStore(true);

    const operation = createRemoteOperation({
      ...defaultConfig,
      enabled: $enabled,
    });
    operation.__.executeFx.use(() => defer.promise);

    const scope = fork();

    const { listeners } = watchRemoteOperation(operation, scope);

    allSettled(operation.start, { scope, params: 1 });
    allSettled($enabled, { scope, params: false });

    defer.reject({});

    await allSettled(scope);

    expect(listeners.onSkip).toBeCalledTimes(1);
    expect(listeners.onSkip).toBeCalledWith(
      expect.objectContaining({ params: 1 })
    );
    expect(listeners.onFailure).not.toBeCalled();
  });

  test('$status changes on stages', async () => {
    const executorFirstDefer = createDefer();
    const executorSecondDefer = createDefer();

    const operation = createRemoteOperation({
      ...defaultConfig,
    });

    const scope = fork({
      handlers: [
        [
          operation.__.executeFx,
          vi
            .fn()
            .mockImplementationOnce(() => executorFirstDefer.promise)
            .mockImplementationOnce(() => executorSecondDefer.promise),
        ],
      ],
    });

    expect(scope.getState(operation.$status)).toBe('initial');
    expect(scope.getState(operation.$idle)).toBeTruthy();
    expect(scope.getState(operation.$pending)).toBeFalsy();
    expect(scope.getState(operation.$failed)).toBeFalsy();
    expect(scope.getState(operation.$succeeded)).toBeFalsy();
    expect(scope.getState(operation.$finished)).toBeFalsy();

    // do not await
    allSettled(operation.start, { scope, params: 42 });

    expect(scope.getState(operation.$status)).toBe('pending');
    expect(scope.getState(operation.$idle)).toBeFalsy();
    expect(scope.getState(operation.$pending)).toBeTruthy();
    expect(scope.getState(operation.$failed)).toBeFalsy();
    expect(scope.getState(operation.$succeeded)).toBeFalsy();
    expect(scope.getState(operation.$finished)).toBeFalsy();

    executorFirstDefer.resolve('result');
    await allSettled(scope);

    expect(scope.getState(operation.$status)).toBe('done');
    expect(scope.getState(operation.$idle)).toBeFalsy();
    expect(scope.getState(operation.$pending)).toBeFalsy();
    expect(scope.getState(operation.$failed)).toBeFalsy();
    expect(scope.getState(operation.$succeeded)).toBeTruthy();
    expect(scope.getState(operation.$finished)).toBeTruthy();

    // do not await
    allSettled(operation.start, { scope, params: 42 });

    expect(scope.getState(operation.$status)).toBe('pending');
    expect(scope.getState(operation.$idle)).toBeFalsy();
    expect(scope.getState(operation.$pending)).toBeTruthy();
    expect(scope.getState(operation.$failed)).toBeFalsy();
    expect(scope.getState(operation.$succeeded)).toBeFalsy();
    expect(scope.getState(operation.$finished)).toBeFalsy();

    executorSecondDefer.reject(new Error('error'));
    await allSettled(scope);

    expect(scope.getState(operation.$status)).toBe('fail');
    expect(scope.getState(operation.$idle)).toBeFalsy();
    expect(scope.getState(operation.$pending)).toBeFalsy();
    expect(scope.getState(operation.$failed)).toBeTruthy();
    expect(scope.getState(operation.$succeeded)).toBeFalsy();
    expect(scope.getState(operation.$finished)).toBeTruthy();
  });
});

describe('RemoteOperation.__.lowLevelAPI.callObjectCreated', () => {
  test('Call object is emitted', async () => {
    const callObjectEmitted = vi.fn();
    const operation = createRemoteOperation({
      ...defaultConfig,
    });
    operation.__.executeFx.use(() => Promise.resolve({}));
    const scope = fork();
    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: callObjectEmitted,
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(callObjectEmitted).toBeCalledTimes(1);
    expect(callObjectEmitted).toBeCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        abort: expect.any(Function),
      })
    );
  });

  test('Call object may abort operation early and will throw abortError by default', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });
    operation.__.executeFx.use(() => Promise.resolve({}));

    const scope = fork();
    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: ({ abort }) => abort(),
    });

    const operationFailed = vi.fn();

    createWatch({
      unit: operation.aborted,
      scope,
      fn: operationFailed,
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(operationFailed).toBeCalledTimes(1);
  });

  test('Call object may abort operation early and will throw custom error if provided', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });
    operation.__.executeFx.use(() => Promise.resolve({}));

    const scope = fork();
    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: ({ abort }) => abort(timeoutError({ timeout: 0 })),
    });

    const operationFailed = vi.fn();

    createWatch({
      unit: operation.finished.failure,
      scope,
      fn: operationFailed,
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(operationFailed).toBeCalledTimes(1);
    expect(isTimeoutError(operationFailed.mock.calls[0][0])).toBe(true);
  });

  test('Call object abort does not affect other pending calls', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });
    operation.__.executeFx.use(() => Promise.resolve({}));

    const scope = fork();
    let count = 0;
    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: ({ abort }) => {
        count++;
        if (count === 2) {
          abort();
        }
      },
    });

    const operationFinished = vi.fn();
    const operationAborted = vi.fn();

    createWatch({
      unit: operation.finished.finally,
      scope,
      fn: (f) => operationFinished(f.params),
    });

    createWatch({
      unit: operation.aborted,
      scope,
      fn: (f) => operationAborted(f.params),
    });

    allSettled(operation.start, { scope, params: 42 });
    allSettled(operation.start, { scope, params: 43 }); // will be aborted
    allSettled(operation.start, { scope, params: 44 });

    await allSettled(scope);

    expect(operationFinished).toBeCalledTimes(2);
    expect(operationFinished.mock.calls.map(([arg]) => arg)).toEqual([42, 44]);

    expect(operationAborted).toBeCalledTimes(1);
    expect(operationAborted.mock.calls.map(([arg]) => arg)).toEqual([43]);
  });

  test('Call objects are always in "finished" status for sync handlers', async () => {
    /**
     * Sync handler cannot be aborted early, since for the "rest of the world"
     * its execution is instant
     *
     * Call objects in that case are always "finished"
     */

    const callObjectEmitted = vi.fn();

    const operation = createRemoteOperation({
      ...defaultConfig,
    });
    operation.__.executeFx.use(() => ({}));

    const scope = fork();

    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: callObjectEmitted,
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(callObjectEmitted).toBeCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        abort: expect.any(Function),
        status: 'finished',
      })
    );
  });

  test('Cannot abort calls after operation is finished', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });
    operation.__.executeFx.use(() => Promise.resolve({}));

    const scope = fork();

    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: ({ abort }) => {
        setTimeout(10).then(() => {
          abort();
        });
      },
    });

    const operationFinished = vi.fn();

    createWatch({
      unit: operation.finished.finally,
      scope,
      fn: (f) =>
        operationFinished({
          params: f.params,
          status: f.status,
          error: (f as { error: unknown }).error,
        }),
    });

    await allSettled(operation.start, { scope, params: 42 });
    await setTimeout(20);

    expect(operationFinished).toBeCalledTimes(1);
    expect(operationFinished.mock.calls.map(([arg]) => arg))
      .toMatchInlineSnapshot(`
      [
        {
          "error": undefined,
          "params": 42,
          "status": "done",
        },
      ]
    `);
  });

  test('promise is exposed on call object for async handlers', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });
    operation.__.executeFx.use(() => Promise.resolve({}));

    const scope = fork();

    const callObjectEmitted = vi.fn();

    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: (callObj) => {
        callObjectEmitted(callObj);
      },
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(callObjectEmitted).toBeCalledWith(
      expect.objectContaining({
        promise: expect.any(Promise),
      })
    );
  });

  test('promise is NOT exposed on call object for SYNC handlers', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });
    operation.__.executeFx.use(() => ({}));

    const scope = fork();

    const callObjectEmitted = vi.fn();

    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: (callObj) => {
        callObjectEmitted(callObj);
      },
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(callObjectEmitted).toBeCalledWith(
      expect.not.objectContaining({
        promise: expect.anything(),
      })
    );
  });
});

describe('RemoteOperation and onAbort callback', () => {
  test('callObject.abort triggers onAbort callback', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });

    const handleCancel = vi.fn();

    operation.__.executeFx.use(() => {
      onAbort(handleCancel);

      return null;
    });

    const scope = fork();

    createWatch({
      unit: operation.__.lowLevelAPI.callObjectCreated,
      scope,
      fn: ({ abort }) => {
        abort();
      },
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(handleCancel).toBeCalledTimes(1);
  });

  test('throw error while trying to call onAbort after async operation', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });

    const handleCancel = vi.fn();

    operation.__.executeFx.use(async () => {
      await setTimeout(0);

      onAbort(handleCancel);

      return null;
    });

    const scope = fork();

    const operationFailed = vi.fn();
    createWatch({
      unit: operation.finished.failure,
      scope,
      fn: operationFailed,
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(operationFailed).toBeCalledTimes(1);
    expect(operationFailed.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "error": {
              "errorType": "CONFIGURATION",
              "explanation": "Operation is misconfigured",
              "reason": "onAbort call is not allowed",
              "validationErrors": [
                "onAbort can be called only in the context of a handler before any async operation is performed",
              ],
            },
            "meta": {
              "responseMeta": undefined,
              "stale": false,
              "stopErrorPropagation": false,
            },
            "params": 42,
          },
        ],
      ]
    `);
    expect(handleCancel).toBeCalledTimes(0);
  });

  test('throw error call onAbort twice', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });

    const handleCancel = vi.fn();

    operation.__.executeFx.use(async () => {
      onAbort(handleCancel);

      onAbort(() => {
        // second call
      });

      return null;
    });

    const scope = fork();

    const operationFailed = vi.fn();
    createWatch({
      unit: operation.finished.failure,
      scope,
      fn: operationFailed,
    });

    await allSettled(operation.start, { scope, params: 42 });

    expect(operationFailed).toBeCalledTimes(1);
    expect(operationFailed.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "error": {
              "errorType": "CONFIGURATION",
              "explanation": "Operation is misconfigured",
              "reason": "onAbort call is not allowed",
              "validationErrors": [
                "onAbort can be called only once per operation",
              ],
            },
            "meta": {
              "responseMeta": undefined,
              "stale": false,
              "stopErrorPropagation": false,
            },
            "params": 42,
          },
        ],
      ]
    `);
    expect(handleCancel).toBeCalledTimes(0);
  });

  test('abort in-flight operations in case of .reset call, issue #461', async () => {
    const operation = createRemoteOperation({
      ...defaultConfig,
    });

    const handleCancel = vi.fn();

    operation.__.executeFx.use(async () => {
      onAbort(handleCancel);

      await setTimeout(10);

      return null;
    });

    const scope = fork();

    allSettled(operation.start, { scope, params: 42 });
    allSettled(operation.reset, { scope });

    await allSettled(scope);

    expect(handleCancel).toBeCalledTimes(1);
  });

  test('reset during execution should not leave operation in pending state, issue #545', async () => {
    const defer = createDefer();

    const operation = createRemoteOperation({
      ...defaultConfig,
    });

    operation.__.executeFx.use(() => defer.promise);

    const scope = fork();

    // Start the operation (don't await)
    allSettled(operation.start, { scope, params: 42 });

    // Reset while it's still executing (don't await)
    allSettled(operation.reset, { scope });

    // Resolve the deferred promise to let the effect complete
    defer.resolve(null);

    await allSettled(scope);

    // After reset, status should be 'initial', not 'pending'
    expect(scope.getState(operation.$status)).toBe('initial');
    expect(scope.getState(operation.$pending)).toBe(false);
  });
});
