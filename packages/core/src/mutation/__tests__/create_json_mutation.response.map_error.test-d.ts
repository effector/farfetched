import { createStore, Event } from 'effector';
import { describe, test, expectTypeOf } from 'vitest';

import { unknownContract } from '../../contract/unknown_contract';
import { declareParams } from '../../remote_operation/params';
import { createJsonMutation } from '../create_json_mutation';
import { JsonApiRequestError } from '../../fetch/api';
import { ExecutionMeta } from '../../remote_operation/type';

describe('createJsonMutation', () => {
  describe('mapError', () => {
    test('callback receives correct types', () => {
      createJsonMutation({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'POST' as const },
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
      createJsonMutation({
        request: { url: 'http://api.salo.com', method: 'POST' as const },
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

    test('return type is used for finished.failure event', () => {
      const mutation = createJsonMutation({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'POST' as const },
        response: {
          contract: unknownContract,
          mapError: () => ({ code: 'ERROR', message: 'test' } as const),
        },
      });

      expectTypeOf(mutation.finished.failure).toEqualTypeOf<
        Event<{
          error: { readonly code: 'ERROR'; readonly message: 'test' };
          params: string;
          meta: ExecutionMeta;
        }>
      >();
    });

    test('sourced callback receives source value', () => {
      createJsonMutation({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'POST' as const },
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

    test('sourced callback return type is used for finished.failure', () => {
      const mutation = createJsonMutation({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'POST' as const },
        response: {
          contract: unknownContract,
          mapError: {
            source: createStore(42),
            fn: () => ({ errorCode: 123 } as const),
          },
        },
      });

      expectTypeOf(mutation.finished.failure).toEqualTypeOf<
        Event<{
          error: { readonly errorCode: 123 };
          params: string;
          meta: ExecutionMeta;
        }>
      >();
    });

    test('without mapError, error type is JsonApiRequestError', () => {
      const mutation = createJsonMutation({
        params: declareParams<string>(),
        request: { url: 'http://api.salo.com', method: 'POST' as const },
        response: {
          contract: unknownContract,
        },
      });

      expectTypeOf(mutation.finished.failure).toEqualTypeOf<
        Event<{
          error: JsonApiRequestError;
          params: string;
          meta: ExecutionMeta;
        }>
      >();
    });
  });
});

