import type {
  Effect,
  Event,
  EventCallable,
  EventPayload,
  Store,
} from 'effector';

import type { SourcedField, FetchingStatus } from '../libs/patronus';
import type { CallObject } from './with_call_object';

interface DefaultMeta {
  name: string;
  flags: Record<string, boolean>;
  $callObjects?: Store<CallObject[]>;
}

export interface RemoteOperation<
  Params,
  Data,
  Error,
  Meta,
  // eslint-disable-next-line @typescript-eslint/ban-types
  ExtraLowLevelAPI = {},
> {
  /**
   * Reactive current request status
   *
   * + `initial` — the data has never been fetched yet
   * + 'pending' — the data is being fetched right now
   * + 'done' — the data has been successfully fetched
   * + 'fail' — an error occurred while fetching data
   */
  $status: Store<FetchingStatus>;
  /** Is fetching started? */
  $idle: Store<boolean>;
  /** Is fetching in progress right now? */
  $pending: Store<boolean>;
  /** Is fetching failed? */
  $failed: Store<boolean>;
  /** Is fetching succeeded? */
  $succeeded: Store<boolean>;
  /** Is fetching finished? */
  $finished: Store<boolean>;
  /**
   * Is operation enabled?
   *
   * + false — any `start` call will be ignored, event done.skip will be fired immediately
   * + true — query will be executed after any `start` call
   */
  $enabled: Store<boolean>;
  /** Event to trigger operation */
  start: EventCallable<Params>;
  /** Event to reset the whole state of the operation */
  reset: EventCallable<void>;
  /** Event that trigered after operation started */
  started: Event<{ params: Params; meta: ExecutionMeta }>;
  aborted: Event<{ params: Params; meta: ExecutionMeta }>;
  /** Set of events that represent end of query */
  finished: {
    /** Query was successfully ended, data will be passed as a payload */
    success: Event<{ params: Params; result: Data; meta: ExecutionMeta }>;
    /** Query was failed, error will be passed as a payload */
    failure: Event<{ params: Params; error: Error; meta: ExecutionMeta }>;
    /** Query execution was skipped due to `enabled` field in config */
    skip: Event<{ params: Params; meta: ExecutionMeta }>;
    /** Query was ended, it merges `success`, `error` and `skip` */
    finally: Event<
      { params: Params; meta: ExecutionMeta } & (
        | { status: 'done'; result: Data }
        | { status: 'fail'; error: Error }
        | { status: 'skip' }
      )
    >;
  };
  /**
   * DO NOT USE THIS FIELD IN PRODUCTION
   *
   * It is internal operator details which is useful for testing.
   */
  __: {
    /**
     * Internal effect, which executes to retrieve data.
     *
     * It must not be used in production. Please use it only for test purposes.
     *
     * @example
     *
     * import { locationQuery } from './location';
     *
     * test('some test', async () => {
     *   const scope = fork({
     *     handlers: [[locationQuery.__.executeFx, vi.fn()]]
     *   });
     *
     *   //...test code
     * })
     */
    executeFx: Effect<any, any, any>;
    /**
     * Meta information about operation and its configuration.
     */
    meta: Meta & DefaultMeta;
    /**
     * Distinguish different kinds of operations
     */
    kind: unknown;
    $latestParams: Store<Params | undefined>;
    /**
     * Low-level API, it can be changed anytime without any notice!
     */
    lowLevelAPI: {
      dataSources: Array<DataSource<Params>>;
      dataSourceRetrieverFx: Effect<
        { params: Params; meta: ExecutionMeta },
        { result: unknown; stale: boolean },
        any
      >;
      sourced: SourcedField<Params, unknown, unknown>[];
      paramsAreMeaningless: boolean;
      revalidate: EventCallable<{ params: Params; refresh: boolean }>;
      pushData: EventCallable<Data>;
      pushError: EventCallable<Error>;
      startWithMeta: EventCallable<{ params: Params; meta: ExecutionMeta }>;
      callObjectCreated: Event<CallObject>;
      failedIgnoreSuppression: Event<{
        params: Params;
        error: Error;
        meta: ExecutionMeta;
      }>;
    } & ExtraLowLevelAPI;
  };
}

export type RemoteOperationResult<
  Q extends RemoteOperation<any, any, any, any>,
> = EventPayload<Q['finished']['success']>['result'];
export type RemoteOperationError<
  Q extends RemoteOperation<any, any, any, any>,
> = EventPayload<Q['finished']['failure']>['error'];
export type RemoteOperationParams<
  Q extends RemoteOperation<any, any, any, any>,
> = EventPayload<Q['start']>;

export interface ExecutionMeta {
  stopErrorPropagation: boolean;
  stale: boolean;
}

export type DataSource<Params> = {
  name: string;
  get: Effect<
    { params: Params },
    { result: unknown; stale: boolean; meta?: unknown } | null,
    unknown
  >;
  set?: Effect<{ params: Params; result: unknown }, void, unknown>;
  unset?: Effect<{ params: Params }, void, unknown>;
};
