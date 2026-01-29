import { attach, type Json, createEffect } from 'effector';

import { type Contract } from '../contract/type';
import { unknownContract } from '../contract/unknown_contract';
import {
  type HttpMethod,
  type JsonApiRequestError,
  type FetchOptions,
} from '../fetch/api';
import { createJsonApiRequest } from '../fetch/json';
import { type FetchApiRecord } from '../fetch/lib';
import { type ParamsDeclaration } from '../remote_operation/params';
import {
  type DynamicallySourcedField,
  type SourcedField,
  type StaticOrReactive,
  normalizeSourced,
} from '../libs/patronus';
import { type Validator } from '../validation/type';
import {
  createHeadlessMutation,
  type SharedMutationFactoryConfig,
} from './create_headless_mutation';
import { type Mutation } from './type';
import { onAbort } from '../remote_operation/on_abort';
import { Meta, Result } from '../remote_operation/store_meta';

// -- Shared --

type RequestConfig<Params, BodySource, QuerySource, HeadersSource, UrlSource> =
  {
    url: SourcedField<Params, string, UrlSource>;
    credentials?: RequestCredentials;
    fetchOptions?: StaticOrReactive<FetchOptions>;
    query?:
      | SourcedField<Params, FetchApiRecord, QuerySource>
      | SourcedField<Params, string, QuerySource>;
    headers?: SourcedField<Params, FetchApiRecord, HeadersSource>;
  } & (
    | {
        method: 'GET' | 'HEAD';
      }
    | {
        method: Exclude<HttpMethod, 'GET' | 'HEAD'>;
        body?: SourcedField<Params, Json, BodySource>;
      }
  );

interface BaseJsonMutationConfigNoParams<
  Data,
  BodySource,
  QuerySource,
  HeadersSource,
  UrlSource,
> extends SharedMutationFactoryConfig {
  request: RequestConfig<
    void,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  >;
}

interface BaseJsonMutationConfigWithParams<
  Params,
  Data,
  BodySource,
  QuerySource,
  HeadersSource,
  UrlSource,
> extends SharedMutationFactoryConfig {
  params: ParamsDeclaration<Params>;
  request: RequestConfig<
    Params,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  >;
}

// -- Overloads

// params + mapData
export function createJsonMutation<
  Params,
  Data,
  TransformedData,
  BodySource = void,
  QuerySource = void,
  HeadersSource = void,
  UrlSource = void,
  DataSource = void,
  MappedError = JsonApiRequestError,
  FailureSource = void,
  ValidationSource = void,
>(
  config: BaseJsonMutationConfigWithParams<
    Params,
    TransformedData,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  > & {
    response: {
      contract: Contract<unknown, Data>;
      mapData: DynamicallySourcedField<
        { result: Data; params: Params; headers?: Headers },
        TransformedData,
        DataSource
      >;
      mapError?: DynamicallySourcedField<
        { error: JsonApiRequestError; params: Params; headers?: Headers },
        MappedError,
        FailureSource
      >;
      validate?: Validator<TransformedData, Params, ValidationSource>;
      status?: { expected: number | number[] };
    };
  }
): Mutation<Params, TransformedData, MappedError>;

// params + no mapData
export function createJsonMutation<
  Params,
  Data,
  BodySource = void,
  QuerySource = void,
  HeadersSource = void,
  UrlSource = void,
  MappedError = JsonApiRequestError,
  FailureSource = void,
  ValidationSource = void,
>(
  config: BaseJsonMutationConfigWithParams<
    Params,
    Data,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  > & {
    response: {
      contract: Contract<unknown, Data>;
      mapError?: DynamicallySourcedField<
        { error: JsonApiRequestError; params: Params; headers?: Headers },
        MappedError,
        FailureSource
      >;
      validate?: Validator<Data, Params, ValidationSource>;
      status?: { expected: number | number[] };
    };
  }
): Mutation<Params, Data, MappedError>;

// No params + mapData
export function createJsonMutation<
  Data,
  TransformedData,
  BodySource = void,
  QuerySource = void,
  HeadersSource = void,
  UrlSource = void,
  DataSource = void,
  MappedError = JsonApiRequestError,
  FailureSource = void,
  ValidationSource = void,
>(
  config: BaseJsonMutationConfigNoParams<
    TransformedData,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  > & {
    response: {
      contract: Contract<unknown, Data>;
      mapData: DynamicallySourcedField<
        { result: Data; params: void; headers?: Headers },
        TransformedData,
        DataSource
      >;
      mapError?: DynamicallySourcedField<
        { error: JsonApiRequestError; params: void; headers?: Headers },
        MappedError,
        FailureSource
      >;
      validate?: Validator<TransformedData, void, ValidationSource>;
      status?: { expected: number | number[] };
    };
  }
): Mutation<void, TransformedData, MappedError>;

// No params + no mapData
export function createJsonMutation<
  Data,
  BodySource = void,
  QuerySource = void,
  HeadersSource = void,
  UrlSource = void,
  MappedError = JsonApiRequestError,
  FailureSource = void,
  ValidationSource = void,
>(
  config: BaseJsonMutationConfigNoParams<
    Data,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  > & {
    response: {
      contract: Contract<unknown, Data>;
      mapError?: DynamicallySourcedField<
        { error: JsonApiRequestError; params: void; headers?: Headers },
        MappedError,
        FailureSource
      >;
      validate?: Validator<Data, void, ValidationSource>;
      status?: { expected: number | number[] };
    };
  }
): Mutation<void, Data, MappedError>;

// -- Implementation --
export function createJsonMutation(config: any): Mutation<any, any, any> {
  const credentials: RequestCredentials | undefined =
    config.request.credentials;
  const fetchOptions: StaticOrReactive<FetchOptions> | undefined =
    config.request.fetchOptions;

  const requestFx = createJsonApiRequest({
    request: { method: config.request.method, credentials, fetchOptions },
    response: { status: config.response.status },
  });

  const headlessMutation = createHeadlessMutation({
    contract: config.response.contract ?? unknownContract,
    mapData: config.response.mapData ?? (({ result }) => result),
    mapError: config.response.mapError,
    validate: config.response.validate,
    enabled: config.enabled,
    name: config.name,
  });

  const executeFx = createEffect(async (c: any) => {
    const abortController = new AbortController();
    onAbort(() => abortController.abort());

    const { result, meta } = await requestFx({ ...c, abortController });

    return { [Result]: result, [Meta]: meta };
  });

  headlessMutation.__.executeFx.use(
    attach({
      source: {
        partialUrl: normalizeSourced({
          field: config.request.url,
        }),
        partialBody: normalizeSourced({
          field: config.request.body,
        }),
        partialHeaders: normalizeSourced({
          field: config.request.headers,
        }),
        partialQuery: normalizeSourced({
          field: config.request.query,
        }),
      },
      mapParams(
        params: any,
        { partialUrl, partialBody, partialHeaders, partialQuery }
      ) {
        return {
          url: partialUrl(params),
          body: partialBody(params),
          headers: partialHeaders(params),
          query: partialQuery(params),
        };
      },
      effect: executeFx,
    })
  );

  return {
    ...headlessMutation,
    __: { ...headlessMutation.__, executeFx },
  };
}
