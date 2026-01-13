import type { Store, Event, EventCallable, StoreWritable } from 'effector';

import type { RemoteOperation } from '../remote_operation/type';
import type { Serialize } from '../libs/patronus';

export const QuerySymbol = Symbol('Query');

export interface QueryMeta<Data, InitialData> {
  /**
   * This field is used to determine how to serialize data in various cases:
   * - transfer state from server to client during SSR
   * - save state to persistent storage during caching
   */
  serialize: Serialize<Data | InitialData>;
  initialData: InitialData;
  sid: string | null;
}

export type QueryExtraLowLevelAPI = {
  refreshSkipDueToFreshness: Event<void>;
};

export interface Query<
  Params,
  Data,
  Error,
  InitialData = null,
> extends RemoteOperation<
  Params,
  Data,
  Error,
  QueryMeta<Data, InitialData>,
  QueryExtraLowLevelAPI
> {
  /**
   * Start fetching data if it is absent or stale.
   */
  refresh: EventCallable<Params>;
  /**
   * The reactive value of the latest received data.
   *
   * If there was an error during fetching or there has not been a request yet, the store will be `null`.
   */
  $data: Store<Data | InitialData>;
  /**
   * The reactive value of the data retrieval error.
   *
   * If the data was successfully fetched or there is no request yet, the store will be `null`.
   */
  $error: Store<Error | null>;
  /**
   * Is data stale?
   */
  $stale: StoreWritable<boolean>;
  '@@unitShape': () => {
    data: Store<Data | InitialData>;
    error: Store<Error | null>;
    stale: Store<boolean>;
    pending: Store<boolean>;
    start: EventCallable<Params>;
  };
}

export type QueryInitialData<Q extends Query<any, any, any, any>> =
  Q['__']['meta']['initialData'];

export function isQuery(value: any): value is Query<any, any, any> {
  return value?.__?.kind === QuerySymbol;
}
