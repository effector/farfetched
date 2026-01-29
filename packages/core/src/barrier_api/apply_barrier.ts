import { attach, sample, type Effect } from 'effector';

import { type RemoteOperation } from '../remote_operation/type';
import { type Barrier } from './type';

/**
 * Applies the Barrier to the Query or Mutation. After operation start it checks the Barrier .$active status and postpones the execution if the Barrier is active. After the Barrier is deactivated, it resumes the execution of the operation.
 *
 * @param operation Query or Mutation to apply Barrier to
 * @param config.barrier Barrier to apply
 * @param config.suppressIntermediateFailures Whether to suppress intermediate failures or not, defaults to `false`
 */
export function applyBarrier(
  operation: RemoteOperation<any, any, any, any, any>,
  {
    barrier,
    suppressIntermediateFailures,
  }: { barrier: Barrier; suppressIntermediateFailures?: boolean }
): void;

/**
 * Applies the Barrier to the Query or Mutation. After operation start it checks the Barrier .$active status and postpones the execution if the Barrier is active. After the Barrier is deactivated, it resumes the execution of the operation.
 *
 * @param operations Query or Mutation to apply Barrier to
 * @param config.barrier Barrier to apply
 * @param config.suppressIntermediateFailures Whether to suppress intermediate failures or not, defaults to `false`
 */
export function applyBarrier(
  operations: RemoteOperation<any, any, any, any, any>[],
  {
    barrier,
    suppressIntermediateFailures,
  }: { barrier: Barrier; suppressIntermediateFailures?: boolean }
): void;

export function applyBarrier(
  operation:
    | RemoteOperation<any, any, any, any, any>
    | RemoteOperation<any, any, any, any, any>[],
  {
    barrier,
    suppressIntermediateFailures = false,
  }: { barrier: Barrier; suppressIntermediateFailures?: boolean }
): void {
  if (Array.isArray(operation)) {
    for (const op of operation) {
      applyBarrier(op, { barrier });
    }
  } else {
    sample({ clock: operation.started, target: barrier.__.touch });

    sample({
      clock: operation.finished.failure,
      target: barrier.__.operationFailed,
    });

    sample({
      clock: barrier.activated,
      filter: operation.$failed,
      source: operation.__.$latestParams,
      fn: (params) => ({
        params,
        meta: { stopErrorPropagation: false, stale: false },
      }),
      target: operation.__.lowLevelAPI.startWithMeta,
    });

    const blockerSourceFx = attach({
      source: { mutex: barrier.__.$mutex, active: barrier.$active },
      async effect({ mutex }) {
        await mutex?.waitForUnlock();

        return null;
      },
    }) as any as Effect<
      { params: any },
      { result: unknown; stale: boolean } | null,
      unknown
    >;

    operation.__.lowLevelAPI.dataSources.unshift({
      name: 'barrier_blocker',
      get: blockerSourceFx,
    });
  }
}
