# `createJsonMutation` <Badge type="tip" text="since v0.2" />

## Formulae

### `createJsonMutation(config)`

Config fields:

- `params?`: parameters for the [_Mutation_](/api/primitives/mutation)
  - You can declare [_Mutation_](/api/primitives/mutation) parameters by call [`declareParams`](/tutorial/built_in_mutation_factories#parameters-declaration) function.
  - If not passed, [_Mutation_](/api/primitives/mutation) will be created without parameters.

- `request`: declarative rules to formulate request to the API.
  - `method`: _String_
  - `url`: _[Sourced](/api/primitives/sourced) string_
  - `body`: _[Sourced](/api/primitives/sourced) Json_, any value which can be serialized to JSON and parsed back without loses by JavaScript native module JSON. For example, `{ a: 1, b: 2 }`. Note that body cannot be used in `GET` and `HEAD` requests.
  - `query?`: _[Sourced](/api/primitives/sourced) object_, keys of the object must be `String` and values must be `String` or `Array<String>` or (since v0.8) _[Sourced](/api/primitives/sourced) String_ containing ready-to-use query string
  - `headers?`: _[Sourced](/api/primitives/sourced) object_, keys of the object must be `String` and values must be `String` or `Array<String>`
  - `credentials?`: <Badge type="warning" text="deprecated" /> _String_, [available values](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials). **Deprecated**: use `fetch.credentials` instead.
    - `omit` — do not include credentials
    - `same-origin` — include credentials only if the request URL is the same origin
    - `include` — include credentials on all requests
  - `fetch?`: <Badge type="tip" text="since v0.14.3" /> _Object or [Store](https://effector.dev/docs/api/effector/Store) with Object_, additional [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options) options to pass to the underlying fetch request. This allows configuring options like `mode`, `cache`, `redirect`, `referrerPolicy`, `integrity`, `keepalive`, etc. If `credentials` is specified both at the top level and in `fetch`, the top-level value takes precedence.

- `response`: declarative rules to handle response from the API.
  - `contract`: [_Contract_](/api/primitives/contract) allows you to validate the response and decide how your application should treat it — as a success response or as a failed one.
  - `validate?`: [_Validator_](/api/primitives/validator) allows you to dynamically validate received data.
  - `mapData?`: optional mapper for the response data, available overloads:
    - `(res) => mapped`
    - `{ source: Store, fn: (data, res) => mapped }`

    `res` object contains:
    - `result`: parsed and validated response data
    - `params`: params which were passed to the [_Mutation_](/api/primitives/mutation)
    - `headers`: <Badge type="tip" text="since v0.13" /> raw response headers

  - `mapError?`: <Badge type="tip" text="since v0.14" /> optional mapper for the error, available overloads:
    - `(err) => mapped`
    - `{ source: Store, fn: (err, sourceValue) => mapped }`

    `err` object contains:
    - `error`: the original error that occurred
    - `params`: params which were passed to the [_Mutation_](/api/primitives/mutation)
    - `headers`: raw response headers (available for HTTP errors and contract/validation errors where the response was received, not available for network errors)

  - `status.expected`: `number` or `Array<number>` of expected HTTP status codes, if the response status code is not in the list, the mutation will be treated as failed

## Examples

### Error mapping

You can transform errors before they are passed to the [_Mutation_](/api/primitives/mutation) using `mapError`:

```ts
const loginMutation = createJsonMutation({
  params: declareParams<{ login: string; password: string }>(),
  request: {
    method: 'POST',
    url: 'https://api.salo.com/login',
    body: ({ login, password }) => ({ login, password }),
  },
  response: {
    contract: loginContract,
    mapError({ error, params, headers }) {
      if (isHttpError({ status: 401, error })) {
        return {
          type: 'unauthorized',
          message: 'Invalid credentials',
          requestId: headers?.get('X-Request-Id'),
        };
      }
      if (isHttpError({ status: 429, error })) {
        return {
          type: 'rate_limited',
          message: 'Too many attempts, please try again later',
          requestId: headers?.get('X-Request-Id'),
        };
      }
      return {
        type: 'unknown',
        message: 'Something went wrong',
        requestId: headers?.get('X-Request-Id'),
      };
    },
  },
});
```

With a sourced mapper:

```ts
const $errorMessages = createStore({
  401: 'Invalid credentials',
  429: 'Too many attempts',
});

const loginMutation = createJsonMutation({
  params: declareParams<{ login: string; password: string }>(),
  request: {
    method: 'POST',
    url: 'https://api.salo.com/login',
    body: ({ login, password }) => ({ login, password }),
  },
  response: {
    contract: loginContract,
    mapError: {
      source: $errorMessages,
      fn({ error, headers }, messages) {
        if (isHttpError({ error })) {
          return {
            message: messages[error.status] ?? 'Unknown error',
            requestId: headers?.get('X-Request-Id'),
          };
        }
        return { message: 'Network error', requestId: null };
      },
    },
  },
});
```
