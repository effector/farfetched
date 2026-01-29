import {
  combine,
  createEffect,
  createEvent,
  createStore,
  sample,
  split,
  attach,
  scopeBind,
  type EffectError,
  type EffectParams,
  type EffectResult,
  type EventCallable,
} from 'effector';

import {
  delay,
  normalizeSourced,
  normalizeStaticOrReactive,
  type DynamicallySourcedField,
  type SourcedField,
  type StaticOrReactive,
} from '../libs/patronus';
import { type Time, parseTime } from '../libs/date-nfs';

import {
  type ExecutionMeta,
  type RemoteOperation,
  type RemoteOperationError,
  type RemoteOperationParams,
} from '../remote_operation/type';
import { type RetryMeta } from './type';
import { isAbortError } from '../errors/guards';

export type FailInfo<Q extends RemoteOperation<any, any, any, any>> = {
  params: RemoteOperationParams<Q>;
  error: RemoteOperationError<Q>;
  meta: ExecutionMeta;
};

type RetryConfig<
  Q extends RemoteOperation<any, any, any, any>,
  DelaySource = unknown,
  FilterSource = unknown,
  MapParamsSource = unknown,
> = {
  times: StaticOrReactive<number>;
  delay: SourcedField<RetryMeta, Time, DelaySource>;
  filter?: SourcedField<FailInfo<Q>, boolean, FilterSource>;
  mapParams?: DynamicallySourcedField<
    FailInfo<Q> & { meta: RetryMeta },
    RemoteOperationParams<Q>,
    MapParamsSource
  >;
  otherwise?: EventCallable<FailInfo<Q> | void>;
  supressIntermediateErrors?: boolean;
};

export function retry<
  Q extends RemoteOperation<any, any, any, any>,
  DelaySource = unknown,
  FilterSource = unknown,
  MapParamsSource = unknown,
>(
  operation: Q,
  {
    times,
    delay: timeout,
    filter,
    mapParams,
    ...params
  }: RetryConfig<Q, DelaySource, FilterSource, MapParamsSource>
): void {
  const supressIntermediateErrors = params.supressIntermediateErrors ?? true;

  const $maxAttempts = normalizeStaticOrReactive(times);
  const $attempt = createStore(1, {
    serialize: 'ignore',
    name: 'ff.$attempt',
    sid: 'ff.$attempt',
  });

  const $meta = combine({
    attempt: $attempt,
  });

  const $supressError = combine(
    $attempt,
    $maxAttempts,
    (attempt, maxAttempts) =>
      supressIntermediateErrors && attempt <= maxAttempts
  );

  const failed = createEvent<{
    params: RemoteOperationParams<Q>;
    error: RemoteOperationError<Q>;
    meta: ExecutionMeta;
  }>();

  const newAttempt = createEvent();

  const $partialFilter = normalizeSourced({
    field: filter ?? true,
  });

  const { planNextAttempt, __: retriesAreOver } = split(
    sample({
      clock: failed,
      source: {
        maxAttempts: $maxAttempts,
        attempt: $attempt,
        partialFilter: $partialFilter,
      },
      filter: ({ partialFilter }, clock) => partialFilter(clock),
      fn: ({ attempt, maxAttempts }, { params, error, meta }) => ({
        params,
        error,
        meta: { ...meta, attempt, maxAttempts },
      }),
    }),
    { planNextAttempt: ({ meta }) => meta.attempt <= meta.maxAttempts }
  );

  sample({
    clock: delay({
      clock: sample({
        clock: planNextAttempt,
        source: {
          partialMapper: normalizeSourced({
            field: (mapParams ?? (({ params }: any) => params)) as any,
          }),
        },
        fn: ({ partialMapper }, clock) => partialMapper(clock),
      }),
      timeout: combine(
        {
          partialTimeout: normalizeSourced({
            field: timeout,
          }),
          meta: $meta,
        },
        ({ partialTimeout, meta }) => parseTime(partialTimeout(meta))
      ),
    }),
    fn: (params) => ({
      params,
      meta: { stopErrorPropagation: false, stale: true },
    }),
    target: [newAttempt, operation.__.lowLevelAPI.startWithMeta],
  });

  $attempt
    .on(newAttempt, (attempt) => attempt + 1)
    .reset([operation.finished.success, operation.start]);

  if (params.otherwise) {
    sample({ clock: retriesAreOver, target: params.otherwise });
  }

  if (supressIntermediateErrors) {
    const originalFx =
      operation.__.lowLevelAPI.dataSourceRetrieverFx.use.getCurrent();

    sample({
      clock: operation.__.lowLevelAPI.failedIgnoreSuppression,
      // Filter out abort errors - they should never trigger retries
      filter: (clock) => !isAbortError({ error: clock.error }),
      target: failed,
    });

    // When filter rejects contract/validation errors, let them propagate normally
    // This fixes the issue where query gets stuck in pending state when:
    // 1. stopErrorPropagation is true (from successful fetch)
    // 2. Contract/validation fails
    // 3. Retry filter rejects the error (e.g., isNetworkError returns false for contract errors)
    sample({
      clock: operation.__.lowLevelAPI.failedIgnoreSuppression,
      source: { partialFilter: $partialFilter },
      filter: ({ partialFilter }, clock) => !partialFilter(clock),
      fn: (_, { params, error, meta }) => ({
        params,
        error,
        meta: { ...meta, stopErrorPropagation: false },
      }),
      target: operation.__.lowLevelAPI.failedBeforeMap,
    });

    operation.__.lowLevelAPI.dataSourceRetrieverFx.use(
      attach({
        source: { supressError: $supressError, partialFilter: $partialFilter },
        mapParams: (opts, { supressError, partialFilter }) => ({
          ...opts,
          supressError,
          partialFilter,
        }),
        effect: createEffect<
          EffectParams<
            typeof operation.__.lowLevelAPI.dataSourceRetrieverFx
          > & {
            supressError: boolean;
            partialFilter: (params: FailInfo<Q>) => boolean;
          },
          EffectResult<typeof operation.__.lowLevelAPI.dataSourceRetrieverFx>,
          EffectError<typeof operation.__.lowLevelAPI.dataSourceRetrieverFx>
        >(async ({ supressError, partialFilter, ...opts }) => {
          const boundFailed = scopeBind(failed, { safe: true });
          try {
            const result = await originalFx(opts);

            return { ...result, stopErrorPropagation: supressError };
          } catch (error: any) {
            const failInfo = {
              params: opts.params,
              error: error.error,
              meta: opts.meta,
            };

            /*
             * Abort errors should never be retried.
             * They are intentional cancellations (e.g., from concurrency policies)
             * and retrying them would defeat the purpose of the cancellation.
             */
            if (isAbortError({ error: error.error })) {
              throw error;
            }

            if (
              /*
               * If filter returns false, this fail is not supposed to be retried
               * so we should not suppress this error in any case.
               *
               * If filter returns is true, we should suppress this error only if
               * supressError is true.
               */
              partialFilter(failInfo) &&
              supressError
            ) {
              boundFailed(failInfo);

              throw { error: error.error, stopErrorPropagation: true };
            } else {
              throw error;
            }
          }
        }),
      })
    );
  }

  sample({
    clock: operation.finished.failure,
    // Filter out abort errors - they should never trigger retries.
    // Note: finished.failure should already have abort errors filtered out
    // by the split in create_remote_operation.ts, but this is defensive.
    filter: (clock) => !isAbortError({ error: clock.error }),
    target: failed,
  });
}
