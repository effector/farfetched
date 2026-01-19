import { combine, type Json } from 'effector';

import { httpError } from '../errors/create_error';
import { isHttpError } from '../errors/guards';
import { HttpError } from '../errors/type';

import { normalizeStaticOrReactive } from '../libs/patronus';
import {
  createApiRequest,
  CreationRequestConfigShared,
  ExclusiveRequestConfigShared,
  StaticOnlyRequestConfig,
} from './api';
import { isNullBodyStatus, mergeRecords } from './lib';
import { drain } from 'libs/lohyphen';

export type JsonObject = Record<string, Json>;

interface ExclusiveRequestConfig extends ExclusiveRequestConfigShared {
  body?: Json;
}

type CreationRequestConfig =
  CreationRequestConfigShared<ExclusiveRequestConfig> &
    Omit<StaticOnlyRequestConfig<any>, 'mapBody'>;

interface JsonApiConfig<R extends CreationRequestConfig> {
  request: R;
  response?: { status?: { expected: number | number[] } };
}

export function createJsonApiRequest<R extends CreationRequestConfig>(
  config: JsonApiConfig<R>
) {
  // Add default application/json header to every request
  const $headers = combine(
    {
      method: normalizeStaticOrReactive(config.request.method),
      headers: normalizeStaticOrReactive(config.request.headers),
    },
    ({ method, headers }) =>
      // reversed merge order to allow any modifications in the user code
      mergeRecords(
        {
          Accept: 'application/json',
          'Content-Type': ['GET', 'HEAD'].includes(method)
            ? undefined
            : 'application/json',
        },
        headers
      )
  );

  const jsonApiCallFx = createApiRequest<
    /* Request config, it does not include mapBody, so let's add it */ R & {
      mapBody: (jsonBody: Json) => string;
    },
    /* Result of preparation */ unknown,
    /* Allowed body */ Json
  >({
    ...config,
    request: {
      ...config.request,
      headers: $headers,
      // Serialize body to JSON-string
      mapBody: (jsonBody) => JSON.stringify(jsonBody),
    },
    response: {
      extract: async (response) => {
        const [emptyContent, nonEmptyResponse] =
          await checkEmptyResponse(response);

        if (emptyContent) {
          return null;
        }

        return nonEmptyResponse.json();
      },
      transformError: (error) => {
        if (!isHttpError({ error })) {
          return error;
        }

        const errorAsHttpError = error as HttpError;

        if (typeof errorAsHttpError.response !== 'string') {
          return errorAsHttpError;
        }

        try {
          const parsedError = JSON.parse(errorAsHttpError.response);

          return httpError({
            status: errorAsHttpError.status,
            statusText: errorAsHttpError.statusText,
            response: parsedError,
          });
        } catch (e) {
          return errorAsHttpError;
        }
      },
      status: config.response?.status,
    },
  });

  return jsonApiCallFx;
}

async function checkEmptyResponse(
  response: Response
): Promise<[true, null] | [false, Response]> {
  // Null body statuses (101, 103, 204, 205, 304) cannot have a body per the Fetch spec.
  // We must check this early to avoid "Response with null body status cannot have body" error.
  if (isNullBodyStatus(response.status)) {
    return [true, null];
  }

  if (!response.body) {
    return [true, null];
  }

  const headerAsEmpty = response.headers.get('Content-Length') === '0';
  if (headerAsEmpty) {
    return [true, null];
  }

  const [originalBody, clonedBody] = response.body.tee();

  const bodyAsText = await new Response(clonedBody).text();
  if (bodyAsText.length === 0) {
    await drain(originalBody);

    return [true, null];
  }

  return [false, new Response(originalBody, response)];
}
