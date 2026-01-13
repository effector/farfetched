import { createStore } from 'effector';
import { describe, test, expectTypeOf } from 'vitest';

import { createApiRequest, HttpMethod } from '../api';

describe('createApiRequest request.method', () => {
  // Does not matter
  const mapBody = () => 'any body';
  const url = 'https://api.salo.com';
  const credentials = 'same-origin';

  // Does not matter
  const response = {
    extract: async <T>(v: T) => v,
  };

  test('static method', () => {
    const callApiFx = createApiRequest({
      request: { mapBody, credentials, method: 'QUERY' as const },
      response,
    });

    expectTypeOf(callApiFx).toBeCallableWith({ url });

    () => {
      callApiFx({
        url,
        // @ts-expect-error should be callable without method
        method: 'GET',
      });
    };
  });

  test('reactive method', () => {
    const $method = createStore<HttpMethod>('GET');

    const callApiFx = createApiRequest({
      request: { mapBody, credentials, method: $method },
      response,
    });

    expectTypeOf(callApiFx).toBeCallableWith({ url });
    () => {
      callApiFx({
        url,
        // @ts-expect-error should be callable without method
        method: 'GET',
      });
    };
  });
});
