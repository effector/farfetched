import { attach, createEffect } from 'effector';

import { normalizeStaticOrReactive, StaticOrReactive } from '../libs/patronus';
import { drain, NonOptionalKeys } from '../libs/lohyphen';
import {
  ConfigurationError,
  HttpError,
  InvalidDataError,
  NetworkError,
  PreparationError,
  TimeoutError,
} from '../errors/type';
import { preparationError, invalidDataError } from '../errors/create_error';
import {
  formatUrl,
  mergeRecords,
  formatHeaders,
  isNullBodyStatus,
  type FetchApiRecord,
  mergeQueryStrings,
} from './lib';
import { requestFx, type RequestError } from './request';

export type HttpMethod =
  | 'HEAD'
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'QUERY'
  | 'OPTIONS';

export type RequestBody = Blob | BufferSource | FormData | string;

// Future-proof: automatically includes any new RequestInit fields from the browser
export type FetchOptions = Omit<
  RequestInit,
  'method' | 'headers' | 'body' | 'signal'
>;

// These settings can be defined only statically
export interface StaticOnlyRequestConfig<B> {
  method: StaticOrReactive<HttpMethod>;
  mapBody(body: B): RequestBody;
}

// These settings can be defined once — statically or dynamically
export interface ExclusiveRequestConfigShared {
  url: string;
  credentials?: RequestCredentials;
  fetchOptions?: FetchOptions;
  abortController?: AbortController;
}

export interface ExclusiveRequestConfig<
  B,
> extends ExclusiveRequestConfigShared {
  body?: B;
}

// These settings can be defined twice — both statically and dynamically, they will be merged
export interface InclusiveRequestConfig {
  query?: FetchApiRecord | string;
  headers?: FetchApiRecord;
}

export type CreationRequestConfigShared<E> = {
  [key in keyof E]?: StaticOrReactive<E[key]>;
} & {
  [key in keyof InclusiveRequestConfig]?: StaticOrReactive<
    InclusiveRequestConfig[key]
  >;
};

type CreationRequestConfig<B> = CreationRequestConfigShared<
  ExclusiveRequestConfig<B>
> &
  StaticOnlyRequestConfig<B>;

type DynamicRequestConfig<B> = ExclusiveRequestConfig<B> &
  Required<InclusiveRequestConfig>;

interface ApiConfigResponse<P> {
  /**
   * Transforms Response
   *
   * @example
   *
   * const callApiFx = createApiRequest({
   *   prepare: { extract: (response) => response.json() },
   * })
   */
  extract: (response: Response) => Promise<P>;
  transformError?: (
    error: NetworkError | HttpError
  ) => NetworkError | HttpError;
  /** Configuration of allowed response statuses */
  status?: {
    expected: number | number[];
  };
}

interface ApiConfig<B, R extends CreationRequestConfig<B>, P> {
  /** Rules to create Request */
  request: R;
  /** Rules to handle Response */
  response: ApiConfigResponse<P>;
}

export type ApiRequestError =
  | ConfigurationError
  | TimeoutError
  | PreparationError
  | NetworkError
  | HttpError;

export type JsonApiRequestError = ApiRequestError | InvalidDataError;

export type ApiRequestErrorWithMeta = {
  error: ApiRequestError;
  responseMeta?: { headers: Headers };
};

export function createApiRequest<
  R extends CreationRequestConfig<B>,
  P,
  B = RequestBody,
>(config: ApiConfig<B, R, P>) {
  type ApiRequestParams = Omit<ExclusiveRequestConfig<B>, NonOptionalKeys<R>> &
    InclusiveRequestConfig;
  type ApiRequestResult = P;

  const prepareFx = createEffect(config.response.extract);

  const apiRequestFx = createEffect<
    DynamicRequestConfig<B> & {
      method: HttpMethod;
    },
    { result: ApiRequestResult; meta: { headers: Headers } },
    ApiRequestErrorWithMeta
  >(
    async ({
      url,
      method,
      query,
      headers,
      credentials,
      fetchOptions,
      body,
      abortController,
    }) => {
      const mappedBody = body ? config.request.mapBody(body) : null;

      const request = new Request(formatUrl(url, query), {
        ...fetchOptions,
        method,
        headers: formatHeaders(headers),
        body: mappedBody,
        signal: abortController?.signal,
        /**
         * `credentials` is available both in `fetchOptions` and in the top-level config.
         * The top-level config was introduced much earlier, so it takes precedence.
         */
        ...(credentials !== undefined ? { credentials } : {}),
      });

      const response = await requestFx(request).catch((cause: RequestError) => {
        // cause is { error, responseMeta? }
        const transformedError =
          config.response.transformError?.(cause.error) ?? cause.error;

        // Re-throw with responseMeta preserved
        throw { error: transformedError, responseMeta: cause.responseMeta };
      });

      const responseHeaders = response.headers;

      // For null body statuses (101, 103, 204, 205, 304), the Response constructor
      // throws if a body is provided, so we must use null body for these statuses.
      const hasNullBodyStatus = isNullBodyStatus(response.status);

      // Determine how to handle body cloning based on environment capabilities
      let responseForPrepare: Response;
      let responseForError: Response | null = null;
      let streamForError: ReadableStream | null = null;

      if (hasNullBodyStatus) {
        responseForPrepare = new Response(null, response);
      } else if (response.body && typeof response.body.tee === 'function') {
        // Streams API available (browsers, edge runtimes)
        const [forPrepare, forError] = response.body.tee();
        responseForPrepare = new Response(forPrepare, response);
        streamForError = forError;
      } else {
        // Fallback for React Native (no Streams API)
        responseForPrepare = response.clone();
        responseForError = response;
      }

      const prepared = await prepareFx(responseForPrepare).then(
        async (result) => {
          await drain(streamForError);

          return result;
        },
        async (cause) => {
          let errorResponseText = '';
          if (streamForError) {
            errorResponseText = await new Response(streamForError).text();
          } else if (responseForError) {
            errorResponseText = await responseForError.text();
          }

          throw {
            error: preparationError({
              response: errorResponseText,
              reason: cause?.message ?? null,
            }),
            responseMeta: { headers: responseHeaders },
          };
        }
      );

      if (config.response.status) {
        const expected = Array.isArray(config.response.status.expected)
          ? config.response.status.expected
          : [config.response.status.expected];

        if (!expected.includes(response.status)) {
          throw {
            error: invalidDataError({
              validationErrors: [
                `Expected response status has to be one of [${expected.join(
                  ', '
                )}], got ${response.status}`,
              ],
              response: prepared,
            }),
            responseMeta: { headers: responseHeaders },
          };
        }
      }

      return { result: prepared, meta: { headers: response.headers } };
    }
  );

  return attach({
    source: {
      url: normalizeStaticOrReactive(config.request.url),
      method: normalizeStaticOrReactive(config.request.method),
      query: normalizeStaticOrReactive(config.request.query),
      headers: normalizeStaticOrReactive(config.request.headers),
      credentials: normalizeStaticOrReactive(config.request.credentials),
      fetchOptions: normalizeStaticOrReactive(config.request.fetchOptions),
      body: normalizeStaticOrReactive(config.request.body),
    },
    mapParams(dynamicConfig: ApiRequestParams, staticConfig) {
      // Exclusive settings

      const url: string =
        staticConfig.url ??
        // @ts-expect-error TS cannot infer type correctly, but there is always field in staticConfig or dynamicConfig
        dynamicConfig.url;

      const credentials: RequestCredentials | undefined =
        staticConfig.credentials ??
        // @ts-expect-error TS cannot infer type correctly, but there is always field in staticConfig or dynamicConfig
        dynamicConfig.credentials;

      const fetchOptions: FetchOptions | undefined =
        staticConfig.fetchOptions ??
        // @ts-expect-error TS cannot infer type correctly, but there is always field in staticConfig or dynamicConfig
        dynamicConfig.fetchOptions;

      const body: B =
        staticConfig.body ??
        // @ts-expect-error TS cannot infer type correctly, but there is always field in staticConfig or dynamicConfig
        dynamicConfig.body;

      // Inclusive settings

      const query = mergeQueryStrings(staticConfig.query, dynamicConfig.query);
      const headers = mergeRecords(staticConfig.headers, dynamicConfig.headers);

      // Other settings
      const { method } = staticConfig;
      // @ts-expect-error
      const { abortController } = dynamicConfig;

      return {
        url,
        method: method!, // TODO: fix type inference here
        query,
        headers,
        credentials,
        fetchOptions,
        body,
        abortController,
      };
    },
    effect: apiRequestFx,
  });
}
