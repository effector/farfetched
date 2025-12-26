import { createStore, Event, Store } from 'effector';
import { describe, test, expectTypeOf } from 'vitest';

import { unknownContract } from '../../contract/unknown_contract';
import { declareParams } from '../../remote_operation/params';
import { createJsonQuery } from '../create_json_query';
import { JsonApiRequestError } from '../../fetch/api';
import { ExecutionMeta } from '../../remote_operation/type';

describe('createJsonQuery', () => {
  describe('mapError', () => {
    test('callback receives correct types', () => {
      createJsonQuery({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'GET' as const },
        response: {
          contract: unknownContract,
          mapError: ({ error, params, headers }) => {
            expectTypeOf(error).toEqualTypeOf<JsonApiRequestError>();
            expectTypeOf(params).toEqualTypeOf<string>();
            expectTypeOf(headers).toEqualTypeOf<Headers | undefined>();

            return { code: 'ERROR', message: 'test' };
          },
        },
      });
    });

    test('callback receives void params when no params declared', () => {
      createJsonQuery({
        request: { url: 'http://api.salo.com', method: 'GET' as const },
        response: {
          contract: unknownContract,
          mapError: ({ error, params, headers }) => {
            expectTypeOf(error).toEqualTypeOf<JsonApiRequestError>();
            expectTypeOf(params).toEqualTypeOf<void>();
            expectTypeOf(headers).toEqualTypeOf<Headers | undefined>();

            return { code: 'ERROR' };
          },
        },
      });
    });

    test('return type is used for $error store', () => {
      const query = createJsonQuery({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'GET' as const },
        response: {
          contract: unknownContract,
          mapError: () => ({ code: 'ERROR', message: 'test' } as const),
        },
      });

      expectTypeOf(query.$error).toEqualTypeOf<
        Store<{ readonly code: 'ERROR'; readonly message: 'test' } | null>
      >();
    });

    test('return type is used for finished.failure event', () => {
      const query = createJsonQuery({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'GET' as const },
        response: {
          contract: unknownContract,
          mapError: () => ({ code: 'ERROR', message: 'test' } as const),
        },
      });

      expectTypeOf(query.finished.failure).toEqualTypeOf<
        Event<{
          error: { readonly code: 'ERROR'; readonly message: 'test' };
          params: string;
          meta: ExecutionMeta;
        }>
      >();
    });

    test('sourced callback receives source value', () => {
      createJsonQuery({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'GET' as const },
        response: {
          contract: unknownContract,
          mapError: {
            source: createStore({ defaultMessage: 'Unknown error' }),
            fn: ({ error, params, headers }, source) => {
              expectTypeOf(error).toEqualTypeOf<JsonApiRequestError>();
              expectTypeOf(params).toEqualTypeOf<string>();
              expectTypeOf(headers).toEqualTypeOf<Headers | undefined>();
              expectTypeOf(source).toEqualTypeOf<{ defaultMessage: string }>();

              return { code: 'ERROR', message: source.defaultMessage };
            },
          },
        },
      });
    });

    test('sourced callback return type is used for $error', () => {
      const query = createJsonQuery({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'GET' as const },
        response: {
          contract: unknownContract,
          mapError: {
            source: createStore(42),
            fn: () => ({ errorCode: 123 } as const),
          },
        },
      });

      expectTypeOf(query.$error).toEqualTypeOf<
        Store<{ readonly errorCode: 123 } | null>
      >();
    });

    test('sourced callback return type is used for finished.failure', () => {
      const query = createJsonQuery({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'GET' as const },
        response: {
          contract: unknownContract,
          mapError: {
            source: createStore(42),
            fn: () => ({ errorCode: 123 } as const),
          },
        },
      });

      expectTypeOf(query.finished.failure).toEqualTypeOf<
        Event<{
          error: { readonly errorCode: 123 };
          params: string;
          meta: ExecutionMeta;
        }>
      >();
    });

    test('without mapError, error type is JsonApiRequestError', () => {
      const query = createJsonQuery({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'GET' as const },
        response: {
          contract: unknownContract,
        },
      });

      expectTypeOf(query.$error).toEqualTypeOf<
        Store<JsonApiRequestError | null>
      >();

      expectTypeOf(query.finished.failure).toEqualTypeOf<
        Event<{
          error: JsonApiRequestError;
          params: string;
          meta: ExecutionMeta;
        }>
      >();
    });
  });
});

