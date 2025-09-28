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
  - `credentials?`: <Badge type="tip" text="since v0.7" /> _String_, [available values](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials):
    - `omit` — do not include credentials
    - `same-origin` — include credentials only if the request URL is the same origin
    - `include` — include credentials on all requests

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

  - `status.expected`: `number` or `Array<number>` of expected HTTP status codes, if the response status code is not in the list, the mutation will be treated as failed

  - `abort?`: [_Event_](https://effector.dev/en/api/effector/event/) after calling which all in-flight requests will be aborted
