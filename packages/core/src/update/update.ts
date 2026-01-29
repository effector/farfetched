import {
  combine,
  createEvent,
  merge,
  sample,
  split,
  type Store,
} from 'effector';

import { isNotEmpty } from '../libs/lohyphen';
import {
  type DynamicallySourcedField,
  normalizeSourced,
} from '../libs/patronus';
import { type Mutation } from '../mutation/type';
import { type QueryInitialData, type Query } from '../query/type';
import {
  type RemoteOperationError,
  type RemoteOperationParams,
  type RemoteOperationResult,
} from '../remote_operation/type';

type QueryState<Q extends Query<any, any, any, any>> =
  | {
      result: RemoteOperationResult<Q>;
      params: RemoteOperationParams<Q>;
    }
  | {
      error: RemoteOperationError<Q>;
      params: RemoteOperationParams<Q>;
    }
  | (QueryInitialData<Q> extends null ? null : { result: QueryInitialData<Q> });

type Refetch<Q extends Query<any, any, any, any>> =
  | boolean
  | { params: RemoteOperationParams<Q> };

type RuleResult<Q extends Query<any, any, any, any>> =
  | {
      result: RemoteOperationResult<Q> | QueryInitialData<Q>;
      refetch?: Refetch<Q>;
    }
  | {
      error: RemoteOperationError<Q>;
      refetch?: Refetch<Q>;
    };

export function update<
  Q extends Query<any, any, any, any>,
  M extends Mutation<any, any, any>,
  BySuccessSource = void,
  ByFailureSource = void
>(
  query: Q,
  {
    on: mutation,
    by: rules,
  }: {
    on: M;
    by?: {
      success: DynamicallySourcedField<
        {
          query: QueryState<Q>;
          mutation: {
            result: RemoteOperationResult<M>;
            params: RemoteOperationParams<M>;
          };
        },
        RuleResult<Q>,
        BySuccessSource
      >;
      failure?: DynamicallySourcedField<
        {
          query: QueryState<Q>;
          mutation: {
            error: RemoteOperationError<M>;
            params: RemoteOperationParams<M>;
          };
        },
        RuleResult<Q>,
        ByFailureSource
      >;
    };
  }
): void {
  const $queryState = queryState(query);

  const fillQueryData = createEvent<{
    result: RemoteOperationResult<Q> | QueryInitialData<Q>;
    refetch?: Refetch<Q>;
  }>();
  const fillQueryError = createEvent<{
    error: RemoteOperationError<Q>;
    refetch?: Refetch<Q>;
  }>();

  const success = rules?.success || (() => ({ error: null, refetch: true }));

  split({
    source: sample({
      clock: mutation.finished.success,
      source: {
        partialRule: normalizeSourced({
          field: success,
        }),
        queryState: $queryState,
      },
      fn: ({ partialRule, queryState }, mutation) =>
        partialRule({
          query: queryState,
          mutation,
        }),
    }),
    match: {
      fillData: (payload: any) => isNotEmpty(payload.result),
    },
    cases: { fillData: fillQueryData, __: fillQueryError },
  });

  if (rules?.failure) {
    split({
      source: sample({
        clock: mutation.finished.failure,
        source: {
          partialRule: normalizeSourced({
            field: rules.failure,
          }),
          queryState: $queryState,
        },
        fn: ({ partialRule, queryState }, mutation) =>
          partialRule({
            query: queryState,
            mutation,
          }),
      }),
      match: {
        fillData: (payload: any) => isNotEmpty(payload.result),
      },
      cases: { fillData: fillQueryData, __: fillQueryError },
    });
  }

  sample({
    clock: fillQueryData,
    fn: ({ result }) => result,
    target: query.__.lowLevelAPI.pushData,
  });

  sample({
    clock: fillQueryError,
    fn: ({ error }) => error,
    target: query.__.lowLevelAPI.pushError,
  });

  // -- Refetching
  const { shouldRefetch, __: shouldNotRefetch } = split(
    merge([fillQueryData, fillQueryError]).map(({ refetch }) => refetch),
    {
      shouldRefetch: (refetch): refetch is Refetch<Q> => Boolean(refetch),
    }
  );

  sample({
    clock: shouldRefetch,
    source: $queryState,
    filter: (state, refetch) =>
      (typeof refetch === 'object' && 'params' in refetch) ||
      (state && 'params' in state),
    fn: (state, refetch) => {
      if (typeof refetch === 'object' && 'params' in refetch) {
        return { params: refetch.params, refresh: true };
      }

      // @ts-expect-error I do not want to fight with TS here
      return { params: state?.params, refresh: true };
    },
    target: [query.__.lowLevelAPI.revalidate, query.$stale.reinit],
  });

  sample({
    clock: shouldNotRefetch,
    source: $queryState,
    filter: (state) => state && 'params' in state,
    fn: (state: any): { params: any; refresh: false } => ({
      params: state.params,
      refresh: false,
    }),
    target: query.__.lowLevelAPI.revalidate,
  });
}

function queryState<Q extends Query<any, any, any, any>>(
  query: Q
): Store<QueryState<Q>> {
  return combine(
    {
      idle: query.$idle,
      result: query.$data,
      params: query.__.$latestParams,
      error: query.$error,
      failed: query.$failed,
    },
    ({ idle, result, params, error, failed }): any => {
      if (result == null && error == null) {
        return null;
      }

      if (idle) {
        return { result };
      }

      if (failed) {
        return { error, params };
      }

      return { result, params };
    }
  );
}
