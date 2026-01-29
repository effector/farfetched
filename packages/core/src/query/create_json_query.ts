import { attach, createEffect, type Json } from 'effector';

import { type Contract } from '../contract/type';
import { createJsonApiRequest } from '../fetch/json';
import {
  type HttpMethod,
  type JsonApiRequestError,
  type FetchOptions,
} from '../fetch/api';
import { type StaticOrReactive } from '../libs/patronus';
import {
  normalizeSourced,
  type SourcedField,
  type DynamicallySourcedField,
} from '../libs/patronus';
import { type ParamsDeclaration } from '../remote_operation/params';
import { type Query } from './type';
import { type FetchApiRecord } from '../fetch/lib';
import {
  createHeadlessQuery,
  type SharedQueryFactoryConfig,
} from './create_headless_query';
import { unknownContract } from '../contract/unknown_contract';
import { type Validator } from '../validation/type';
import { onAbort } from '../remote_operation/on_abort';
import { Result, Meta } from '../remote_operation/store_meta';

// -- Shared

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

interface BaseJsonQueryConfigNoParams<
  Data,
  BodySource,
  QuerySource,
  HeadersSource,
  UrlSource,
> extends SharedQueryFactoryConfig<Data> {
  request: RequestConfig<
    void,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  >;
}

interface BaseJsonQueryConfigWithParams<
  Params,
  Data,
  BodySource,
  QuerySource,
  HeadersSource,
  UrlSource,
> extends SharedQueryFactoryConfig<Data> {
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
export function createJsonQuery<
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
  config: BaseJsonQueryConfigWithParams<
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
    };
  }
): Query<Params, TransformedData, MappedError>;

export function createJsonQuery<
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
  config: BaseJsonQueryConfigWithParams<
    Params,
    TransformedData,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  > & {
    initialData?: TransformedData;
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
    };
  }
): Query<Params, TransformedData, MappedError, TransformedData>;

// params + no mapData
export function createJsonQuery<
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
  config: BaseJsonQueryConfigWithParams<
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
    };
  }
): Query<Params, Data, MappedError>;

export function createJsonQuery<
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
  config: BaseJsonQueryConfigWithParams<
    Params,
    Data,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  > & {
    initialData?: Data;
    response: {
      contract: Contract<unknown, Data>;
      mapError?: DynamicallySourcedField<
        { error: JsonApiRequestError; params: Params; headers?: Headers },
        MappedError,
        FailureSource
      >;
      validate?: Validator<Data, Params, ValidationSource>;
    };
  }
): Query<Params, Data, MappedError, Data>;

// No params + mapData
export function createJsonQuery<
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
  config: BaseJsonQueryConfigNoParams<
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
    };
  }
): Query<void, TransformedData, MappedError>;

export function createJsonQuery<
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
  config: BaseJsonQueryConfigNoParams<
    TransformedData,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  > & {
    initialData?: TransformedData;
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
    };
  }
): Query<void, TransformedData, MappedError, TransformedData>;

// No params + no mapData
export function createJsonQuery<
  Data,
  BodySource = void,
  QuerySource = void,
  HeadersSource = void,
  UrlSource = void,
  MappedError = JsonApiRequestError,
  FailureSource = void,
  ValidationSource = void,
>(
  config: BaseJsonQueryConfigNoParams<
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
    };
  }
): Query<void, Data, MappedError>;

export function createJsonQuery<
  Data,
  BodySource = void,
  QuerySource = void,
  HeadersSource = void,
  UrlSource = void,
  MappedError = JsonApiRequestError,
  FailureSource = void,
  ValidationSource = void,
>(
  config: BaseJsonQueryConfigNoParams<
    Data,
    BodySource,
    QuerySource,
    HeadersSource,
    UrlSource
  > & {
    initialData?: Data;
    response: {
      contract: Contract<unknown, Data>;
      mapError?: DynamicallySourcedField<
        { error: JsonApiRequestError; params: void; headers?: Headers },
        MappedError,
        FailureSource
      >;
      validate?: Validator<Data, void, ValidationSource>;
    };
  }
): Query<void, Data, MappedError, Data>;

// -- Implementation --
export function createJsonQuery(config: any) {
  const credentials: RequestCredentials | undefined =
    config.request.credentials;
  const fetchOptions: StaticOrReactive<FetchOptions> | undefined =
    config.request.fetchOptions;

  // Basement
  const requestFx = createJsonApiRequest({
    request: {
      method: config.request.method,
      credentials,
      fetchOptions,
    },
  });

  const headlessQuery = createHeadlessQuery<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >({
    initialData: config.initialData,
    contract: config.response.contract ?? unknownContract,
    mapData: config.response.mapData ?? (({ result }) => result),
    mapError: config.response.mapError,
    validate: config.response.validate,
    enabled: config.enabled,
    name: config.name,
    serialize: config.serialize,
    sourced: [
      config.request.url,
      config.request.body,
      config.request.headers,
      config.request.query,
    ],
    paramsAreMeaningless: true,
  });

  const executeFx = createEffect(async (c: any) => {
    const abortController = new AbortController();
    onAbort(() => abortController.abort());

    const { result, meta } = await requestFx({ ...c, abortController });

    return { [Result]: result, [Meta]: meta };
  });

  headlessQuery.__.executeFx.use(
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
    ...headlessQuery,
    __: { ...headlessQuery.__, executeFx },
  };
}
