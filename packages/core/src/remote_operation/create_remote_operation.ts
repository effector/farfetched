import {
  createEffect,
  createEvent,
  createStore,
  sample,
  split,
} from 'effector';

import {
  not,
  readonly,
  normalizeSourced,
  normalizeStaticOrReactive,
  type DynamicallySourcedField,
  type StaticOrReactive,
  type FetchingStatus,
  type SourcedField,
} from '../libs/patronus';
import { createContractApplier } from '../contract/apply_contract';
import { type Contract } from '../contract/type';
import { invalidDataError } from '../errors/create_error';
import { type InvalidDataError } from '../errors/type';
import { type DataSource, type ExecutionMeta } from './type';
import { checkValidationResult } from '../validation/check_validation_result';
import { type Validator } from '../validation/type';
import { unwrapValidationResult } from '../validation/unwrap_validation_result';
import { validValidator } from '../validation/valid_validator';
import { type RemoteOperation } from './type';
import { get } from '../libs/lohyphen';
import { isAbortError } from '../errors/guards';
import { getCallObjectEvent } from './with_call_object';
import { abortAllInFlight } from '../concurrency/concurrency';
import { hasMeta, Result, Meta } from './store_meta';

export function createRemoteOperation<
  Params,
  Data,
  ContractData extends Data,
  MappedData,
  Error,
  MappedError = Error | InvalidDataError,
  Meta = unknown,
  MapDataSource = void,
  mapErrorSource = void,
  ValidationSource = void,
>({
  name: ownName,
  meta,
  kind,
  serialize,
  enabled,
  contract,
  validate,
  mapData,
  mapError,
  sourced,
  paramsAreMeaningless,
}: {
  name?: string;
  meta: Meta;
  kind: unknown;
  serialize?: 'ignore';
  enabled?: StaticOrReactive<boolean>;
  contract: Contract<Data, ContractData>;
  validate?: Validator<ContractData, Params, ValidationSource>;
  mapData: DynamicallySourcedField<
    { result: ContractData; params: Params },
    MappedData,
    MapDataSource
  >;
  mapError?: DynamicallySourcedField<
    { error: Error | InvalidDataError; params: Params; headers?: Headers },
    MappedError,
    mapErrorSource
  >;
  sourced?: SourcedField<Params, unknown, unknown>[];
  paramsAreMeaningless?: boolean;
}): RemoteOperation<Params, MappedData, MappedError, Meta> {
  const revalidate = createEvent<{ params: Params; refresh: boolean }>();
  const pushData = createEvent<MappedData>();
  const pushError = createEvent<MappedError>();
  const startWithMeta = createEvent<{ params: Params; meta: ExecutionMeta }>();

  // Default mapError to identity function
  const effectivemapError =
    mapError ?? (({ error }) => error as MappedError);

  const applyContractFx = createContractApplier<Params, Data, ContractData>(
    contract
  );

  const name = ownName ?? 'unnamed';

  // Dummy effect, it will be replaced with real in head-full factory
  const executeFx = createEffect<any, any, any>({
    handler: () => {
      throw new Error('Not implemented');
    },
    sid: `ff.${name}.executeFx`,
    name: `${name}.executeFx`,
  });

  const callObjectCreated = getCallObjectEvent(executeFx);

  const remoteDataSource: DataSource<Params> = {
    name: 'remote_source',
    get: createEffect<
      { params: Params },
      { result: unknown; stale: boolean; meta?: unknown } | null,
      unknown
    >(async ({ params }) => {
      const result = await executeFx(params);

      if (hasMeta(result)) {
        return {
          result: result[Result],
          stale: false,
          meta: result[Meta],
        };
      }

      return { result, stale: false };
    }),
  };

  const dataSources = [remoteDataSource];

  const {
    retrieveDataFx,
    notifyAboutNewValidDataFx,
    notifyAboutDataInvalidationFx,
  } = createDataSourceHandlers<Params>(dataSources);

  const start = createEvent<Params>();
  const reset = createEvent();

  const started = createEvent<{ params: Params; meta: ExecutionMeta }>();

  sample({
    clock: start,
    fn: (params) => ({
      params,
      meta: { stopErrorPropagation: false, stale: true },
    }),
    target: startWithMeta,
  });

  // Signal-events
  const finished = {
    success: createEvent<{
      params: Params;
      result: MappedData;
      meta: ExecutionMeta;
    }>(),
    failure: createEvent<{
      params: Params;
      error: MappedError;
      meta: ExecutionMeta;
    }>(),
    skip: createEvent<{ params: Params; meta: ExecutionMeta }>(),
    finally: createEvent<
      { params: Params; meta: ExecutionMeta } & (
        | {
            status: 'done';
            result: MappedData;
          }
        | { status: 'fail'; error: MappedError }
        | { status: 'skip' }
      )
    >(),
  };
  // Intermediate event before mapError is applied
  const failedBeforeMap = createEvent<{
    params: Params;
    error: Error | InvalidDataError;
    meta: ExecutionMeta;
  }>();
  const failedNoFilters = createEvent<{
    params: Params;
    error: MappedError;
    meta: ExecutionMeta;
  }>();
  const failedIgnoreSuppression = createEvent<{
    params: Params;
    error: Error | InvalidDataError;
    meta: ExecutionMeta;
  }>();
  const aborted = createEvent<{
    params: Params;
    meta: ExecutionMeta;
  }>();

  // Apply mapError transformation
  sample({
    clock: failedBeforeMap,
    source: {
      partialMapper: normalizeSourced({
        field: effectivemapError,
      }),
    },
    fn: ({ partialMapper }, { error, params, meta }) => ({
      error: partialMapper({
        error,
        params,
        ...(metaHasResponseMeta(meta) ? meta.responseMeta : {}),
      }),
      params,
      meta,
    }),
    target: failedNoFilters,
  });

  split({
    source: failedNoFilters,
    match: {
      aborted: ({ error }) => isAbortError({ error }),
    },
    cases: {
      aborted,
      __: finished.failure,
    },
  });

  // -- Main stores --
  const $status = createStore<FetchingStatus>('initial', {
    sid: `ff.${name}.$status`,
    name: `ff.${name}.$status`,
    serialize,
  });

  sample({ clock: reset, target: $status.reinit });

  const $statusHistory = createStore<FetchingStatus[]>([], {
    serialize: 'ignore',
    name: `ff.${name}.$statusHistory`,
    sid: `ff.${name}.$statusHistory`,
  });

  sample({
    clock: $status.updates,
    source: $statusHistory,
    fn: (history, nextStatus) => [...history, nextStatus],
    target: $statusHistory,
  });

  const $enabled = normalizeStaticOrReactive(enabled ?? true).map(Boolean);

  const $latestParams = createStore<Params | undefined>(undefined, {
    serialize: 'ignore',
    name: `ff.${name}.$latestParams`,
    sid: `ff.${name}.$latestParams`,
    skipVoid: false,
  });

  // -- Derived stores --
  const $idle = $status.map((status) => status === 'initial');
  const $pending = $status.map((status) => status === 'pending');
  const $failed = $status.map((status) => status === 'fail');
  const $succeeded = $status.map((status) => status === 'done');
  const $finished = $status.map((status) => ['fail', 'done'].includes(status));

  // -- Indicate status --
  sample({
    clock: [
      retrieveDataFx.map(() => 'pending' as const),
      finished.success.map(() => 'done' as const),
      finished.failure.map(() => 'fail' as const),
      sample({
        clock: aborted,
        source: {
          history: $statusHistory,
          retrieveDataPengind: retrieveDataFx.pending,
        },
        fn: ({ history, retrieveDataPengind }) => {
          if (retrieveDataPengind) {
            return 'pending';
          }

          return history[history.length - 2] ?? 'initial';
        },
      }),
    ],
    target: $status,
  });

  sample({
    clock: startWithMeta,
    filter: $enabled,
    fn: ({ params }) => params,
    target: $latestParams,
  });

  // -- Execution flow
  sample({
    clock: start,
    filter: not($enabled),
    fn(params) {
      return {
        params,
        meta: { stopErrorPropagation: false, stale: false },
      };
    },
    target: finished.skip,
  });

  sample({
    clock: revalidate,
    fn: ({ params }) => ({
      params,
      meta: { stopErrorPropagation: false, stale: true },
    }),
    target: notifyAboutDataInvalidationFx,
  });

  sample({
    clock: notifyAboutDataInvalidationFx.finally,
    source: revalidate,
    filter: ({ refresh }) => refresh,
    fn: ({ params }) => ({
      params,
      meta: { stopErrorPropagation: false, stale: true },
    }),
    target: startWithMeta,
  });

  sample({
    clock: startWithMeta,
    filter: $enabled,
    target: retrieveDataFx,
  });

  sample({ clock: retrieveDataFx, target: started });

  sample({
    clock: retrieveDataFx.done,
    fn: ({ params, result }) => ({
      params: params.params,
      result: result.result as Data,
      meta: {
        stopErrorPropagation: result.stopErrorPropagation ?? false,
        stale: result.stale,
        responseMeta: result.meta,
      },
    }),
    filter: $enabled,
    target: applyContractFx,
  });

  sample({
    clock: retrieveDataFx.fail,
    source: $enabled,
    filter: (enabled, { error }) => enabled && !error.stopErrorPropagation,
    fn: (_, { error, params }) => ({
      error: error.error as any,
      params: params.params,
      meta: {
        stopErrorPropagation: error.stopErrorPropagation,
        stale: false,
        responseMeta: error.responseMeta,
      },
    }),
    target: failedBeforeMap,
  });

  const { validDataRecieved, __: invalidDataRecieved } = split(
    sample({
      clock: applyContractFx.done,
      source: {
        partialValidator: normalizeSourced({
          field: validate ?? validValidator,
        }),
      },
      fn: (
        { partialValidator },
        {
          params: {
            /* Extract original params, it is params of params */ params,
            meta,
          },
          result,
        }
      ) => ({
        result,
        params,
        validation: partialValidator({
          result,
          params,
        }),
        meta,
      }),
    }),
    {
      validDataRecieved: ({ validation }) => checkValidationResult(validation),
    }
  );

  sample({
    clock: validDataRecieved,
    source: {
      partialMapper: normalizeSourced({
        field: mapData,
      }),
    },
    fn: ({ partialMapper }, { params, result, meta }) => ({
      result: partialMapper({
        params,
        result,
        ...(metaHasResponseMeta(meta) ? meta.responseMeta : {}),
      }),
      params,
      meta,
    }),
    target: finished.success,
  });

  sample({
    clock: finished.success,
    filter: ({ meta }) => meta.stale,
    fn: ({ params, meta }) => ({ params, meta, skipStale: true }),
    target: retrieveDataFx,
  });

  sample({
    clock: validDataRecieved,
    filter: ({ meta }) => !meta.stale,
    target: notifyAboutNewValidDataFx,
  });

  sample({
    clock: applyContractFx.fail,
    filter: ({ params }) => !params.meta.stopErrorPropagation,
    fn: ({ error, params }) => ({
      error,
      // Extract original params, it is params of params
      params: params.params,
      meta: params.meta,
    }),
    target: failedBeforeMap,
  });

  sample({
    clock: applyContractFx.fail,
    fn: ({ error, params }) => ({
      error,
      // Extract original params, it is params of params
      params: params.params,
      meta: params.meta,
    }),
    target: failedIgnoreSuppression,
  });

  sample({
    clock: invalidDataRecieved,
    filter: ({ meta }) => !meta.stopErrorPropagation,
    fn: ({ params, validation, meta, result }) => ({
      params,
      error: invalidDataError({
        validationErrors: unwrapValidationResult(validation),
        response: result,
      }),
      meta,
    }),
    target: failedBeforeMap,
  });

  sample({
    clock: invalidDataRecieved,
    fn: ({ params, validation, meta, result }) => ({
      params,
      error: invalidDataError({
        validationErrors: unwrapValidationResult(validation),
        response: result,
      }),
      meta,
    }),
    target: failedIgnoreSuppression,
  });

  // Emit skip for disabling in-flight operation
  sample({
    clock: $enabled.updates,
    source: start,
    filter: not($enabled),
    fn: (params) => ({
      params,
      meta: {
        stopErrorPropagation: false,
        stale: true,
      },
    }),
    target: finished.skip,
  });

  // -- Send finally --
  sample({
    clock: finished.success,
    fn: ({ params, result, meta }) => ({
      status: 'done' as const,
      params,
      result,
      meta,
    }),
    target: finished.finally,
  });

  sample({
    clock: finished.failure,
    fn: ({ params, error, meta }) => ({
      status: 'fail' as const,
      params,
      error,
      meta,
    }),
    target: finished.finally,
  });

  sample({
    clock: finished.skip,
    fn: ({ params, meta }) => ({
      status: 'skip' as const,
      params,
      meta,
    }),
    target: finished.finally,
  });

  const op = {
    start,
    finished,
    started,
    aborted,
    reset,
    $status,
    $idle,
    $pending,
    $failed,
    $succeeded,
    $finished,
    $enabled,
    __: {
      executeFx,
      meta: { ...meta, name, flags: {} },
      kind,
      $latestParams: readonly($latestParams),
      lowLevelAPI: {
        dataSources,
        dataSourceRetrieverFx: retrieveDataFx,
        sourced: sourced ?? [],
        paramsAreMeaningless: paramsAreMeaningless ?? false,
        revalidate,
        pushError,
        pushData,
        startWithMeta,
        callObjectCreated,
        // Cast to any because failedIgnoreSuppression fires before mapError is applied,
        // so it has the original error type, not MappedError
        failedIgnoreSuppression: failedIgnoreSuppression as any,
      },
    },
  };

  abortAllInFlight(op, { clock: reset });

  return op;
}

function createDataSourceHandlers<Params>(dataSources: DataSource<Params>[]) {
  const retrieveDataFx = createEffect<
    {
      params: Params;
      skipStale?: boolean;
      meta: ExecutionMeta;
    },
    {
      result: unknown;
      stale: boolean;
      stopErrorPropagation?: boolean;
      meta?: unknown;
    },
    {
      stopErrorPropagation: boolean;
      error: unknown;
      responseMeta?: { headers: Headers };
    }
  >({
    handler: async ({ params, skipStale }) => {
      for (const dataSource of dataSources) {
        try {
          const fromSource = await dataSource.get({ params });

          if (skipStale && fromSource?.stale) {
            continue;
          }

          if (fromSource) {
            return fromSource;
          }
        } catch (error: any) {
          throw {
            stopErrorPropagation: false,
            error: error.error ?? error,
            responseMeta: error.responseMeta,
          };
        }
      }

      throw {
        stopErrorPropagation: false,
        error: new Error('No data source returned data'),
      };
    },
  });

  const notifyAboutNewValidDataFx = createEffect<
    {
      params: Params;
      result: unknown;
    },
    void,
    any
  >({
    handler: async ({ params, result }) => {
      await Promise.all(
        dataSources
          .map(get('set'))
          .filter(Boolean)
          .map((set) => set!({ params, result }))
      );
    },
  });

  const notifyAboutDataInvalidationFx = createEffect<
    {
      params: Params;
    },
    void,
    any
  >({
    handler: async ({ params }) => {
      await Promise.all(
        dataSources
          .map(get('unset'))
          .filter(Boolean)
          .map((unset) => unset!({ params }))
      );
    },
  });

  return {
    retrieveDataFx,
    notifyAboutNewValidDataFx,
    notifyAboutDataInvalidationFx,
  };
}

function metaHasResponseMeta(
  meta: any
): meta is { responseMeta: Record<string, unknown> } {
  return 'responseMeta' in meta && typeof meta.responseMeta === 'object';
}
