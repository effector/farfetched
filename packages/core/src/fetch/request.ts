import { createEffect } from 'effector';

import { HttpError, NetworkError } from '../errors/type';
import { httpError, networkError } from '../errors/create_error';
import { fetchFx } from './fetch';

export type RequestError = {
  error: NetworkError | HttpError;
  responseMeta?: { headers: Headers };
};

/**
 * Basic request effect around fetchFx, with some additional features:
 * + it throws error if response status is 4XX/5XX
 * + it throws serializable NetworkError instead of TypeError
 * + it includes responseMeta with headers for HTTP errors
 */
export const requestFx = createEffect<Request, Response, RequestError>({
  handler: async (request) => {
    const response = await fetchFx(request).catch((cause) => {
      // Network error - no response, no responseMeta
      throw { error: networkError({ reason: cause?.message ?? null, cause }) };
    });

    if (!response.ok) {
      // HTTP error - include responseMeta with headers
      throw {
        error: httpError({
          status: response.status,
          statusText: response.statusText,
          response: (await response.text().catch(() => null)) ?? null,
        }),
        responseMeta: { headers: response.headers },
      };
    }

    return response;
  },
  sid: 'ff.requestFx',
});
