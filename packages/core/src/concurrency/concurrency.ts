import {
  type Event,
  type Store,
  createStore,
  sample,
  attach,
  createEffect,
  createEvent,
} from 'effector';
import { type RemoteOperation } from '../remote_operation/type';
import { type CallObject } from '../remote_operation/with_call_object';
import { abortError } from '../errors/create_error';

/**
 * @param op Query or Mutation to apply concurrency to
 * @param config.strategy  Auto-cancelation strategy
 * - `TAKE_EVERY` will not cancel any requests
 * - `TAKE_LATEST` will cancel all but the latest request
 * - `TAKE_FIRST` will ignore all but the first request
 * @param config.abortAll All requests will be aborted on this event call
 */
export function concurrency(
  op: RemoteOperation<any, any, any, any>,
  {
    strategy,
    abortAll,
  }: {
    strategy?: 'TAKE_LATEST' | 'TAKE_EVERY' | 'TAKE_FIRST';
    abortAll?: Event<any>;
  }
) {
  const $callObjects = callObejcts(op);

  if (strategy) {
    switch (strategy) {
      case 'TAKE_EVERY':
        /* do nothing */
        break;
      case 'TAKE_FIRST': {
        const $haveToAbort = createStore(false, { serialize: 'ignore' });
        const markAsHaveToAbort = createEvent();

        sample({
          clock: markAsHaveToAbort,
          fn: () => true,
          target: $haveToAbort,
        });

        const concurrencyDataSource = {
          name: 'concurrency',
          get: attach({
            source: $haveToAbort,
            async effect(
              haveToAbort,
              _original: any
            ): Promise<{ result: unknown; stale: boolean } | null> {
              if (haveToAbort) {
                throw abortError();
              }

              markAsHaveToAbort();

              return null;
            },
          }),
        };
        op.__.lowLevelAPI.dataSources.unshift(concurrencyDataSource);

        sample({
          clock: op.finished.finally,
          fn: () => false,
          target: $haveToAbort,
        });

        break;
      }
      case 'TAKE_LATEST': {
        sample({
          clock: op.__.lowLevelAPI.callObjectCreated,
          source: $callObjects,
          fn: (callObjects, currentCallObject) =>
            callObjects.filter((obj) => obj !== currentCallObject),
          target: abortManyFx,
        });
        break;
      }
    }
  }

  if (abortAll) {
    abortAllInFlight(op, { clock: abortAll });
  }

  return op;
}

export function abortAllInFlight(
  op: RemoteOperation<any, any, any, any>,
  { clock }: { clock: Event<any> }
) {
  sample({ clock, source: callObejcts(op), target: abortManyFx });
}

function callObejcts(
  op: RemoteOperation<any, any, any, any>
): Store<CallObject[]> {
  if (!op.__.meta.$callObjects) {
    const $callObjects = createStore<CallObject[]>([], { serialize: 'ignore' });

    sample({
      clock: op.__.lowLevelAPI.callObjectCreated,
      source: $callObjects,
      fn: (callObjects, callObject) =>
        callObjects
          .filter((obj) => obj.status === 'pending')
          .concat(callObject),
      target: $callObjects,
    });

    sample({
      clock: abortManyFx.done,
      source: $callObjects,
      fn: (callObjects, { params: abortedCallObjects }) =>
        callObjects.filter((obj) => !abortedCallObjects.includes(obj)),
      target: $callObjects,
    });

    op.__.meta.$callObjects = $callObjects;
  }

  return op.__.meta.$callObjects!;
}

const abortManyFx = createEffect((callObjects: CallObject[]) =>
  callObjects.forEach((callObject) => callObject.abort())
);
