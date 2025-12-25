# `createQuery`

## Formulae

::: info
Option `initialData` available in all overloads since [v0.3](/releases/0-3)
:::

### `createQuery({ handler, initialData? })`

Creates [_Query_](/api/primitives/query) based on given asynchronous function.

```ts
const languagesQuery = createQuery({
  handler: async () => {
    const response = await fetch('https://api.salo.com/languages.json');

    return response.json();
  },
});
```

### `createQuery({ effect, validate?, initialData? })`

Creates [_Query_](/api/primitives/query) based on given [_Effect_](https://effector.dev/en/api/effector/effect/).

Usage of [_Effect_](https://effector.dev/en/api/effector/effect/) instead of simple asynchronous function allows you to declare types of possible errors statically that will be passed to [_Query_](/api/primitives/query).

This form allows you to dynamically validate received data using [_Validator_](/api/primitives/validator) in the optional `validate` field.

```ts
const languagesQuery = createQuery({
  effect: createEffect<Response, void, EmptyLanguagesError>(async () => {
    const response = await fetch('https://api.salo.com/languages.json');

    const data = await response.json();

    if (!data.languages) {
      throw new EmptyLanguagesError();
    }

    return data.languages;
  }),
});

// typeof languagesQuery.$error === Store<EmptyLanguagesError | null>
```

### `createQuery({ effect, contract, validate?, initialData? })`

Creates [_Query_](/api/primitives/query) based on given [_Effect_](https://effector.dev/en/api/effector/effect/).

[_Contract_](../primitives/contract) allows you to validate the response and decide how your application should treat it — as a success response or as a failed one. Furthermore, this form allows you to dynamically validate received data using [_Validator_](/api/primitives/validator) in the optional `validate` field.

```ts
const languagesQuery = createQuery({
  effect: fetchLanguagesFx,
  contract: {
    // Our API can return empty array of languages, we consider it as an invalid data
    isData: (response) => response.languages?.length > 0,
    // Array with description of reasons why data is invalid
    getErrorMessages: (response) => ['Expected array with at least one language, but got empty array'],
  },
});

/* typeof languagesQuery.$error === Store<
 *   | InvalidDataError 👈 validation failed, languages list is empty
 *   | string[] 👈 API errors from response.errors
 *   | null 👈 no errors
 * >
 */
```

### `createQuery({ effect, contract?, validate?, mapData: Function, initialData? })`

Creates [_Query_](/api/primitives/query) based on given [_Effect_](https://effector.dev/en/api/effector/effect/). Result of the effect will be validated against the [_Contract_](/api/primitives/contract) and the optional [_Validator_](/api/primitives/validator). Invalid result will cause the [_Query_](/api/primitives/query) to fail.

A valid data is passed to `mapData` callback as well as original parameters of the [_Query_](/api/primitives/query), result of the callback will be treated as a result of the [_Query_](/api/primitives/query).

```ts
const languagesQuery = createQuery({
  effect: fetchLanguagesFx,
  contract: languagesContract,
  mapData({ result: languages, params }) {
    return {
      availableLanguages: languages,
      languageCanBeSelected: languages.length > 1,
    };
  },
});

/* typeof languagesQuery.$data === Store<{
 *   availableLanguages: string[],
 *   languageCanBeSelected: boolean,
 * }>
 */
```

### `createQuery({ effect, contract?, validate?, mapData: { source, fn }, initialData? })`

Creates [_Query_](/api/primitives/query) based on given [_Effect_](https://effector.dev/en/api/effector/effect/). Result of the effect will be validated against the [_Contract_](/api/primitives/contract) and the optional [_Validator_](/api/primitives/validator). Invalid result will cause the query to fail.

A valid data is passed to `mapData.fn` callback as well as original parameters of the [_Query_](/api/primitives/query) and current value of `mapData.source` [_Store_](https://effector.dev/en/api/effector/store/), result of the callback will be treated as a result of the [_Query_](/api/primitives/query).

```ts
const $minimalLanguagesCount = createStore(1);

const languagesQuery = createQuery({
  effect: fetchLanguagesFx,
  contract: languagesContract,
  mapData: {
    // Current value of $minimalLanguagesCount will be passed to `fn` as a third argument
    source: $minimalLanguagesCount,
    fn({ result: languages, params }, minimalLanguagesCount) {
      return {
        availableLanguages: languages,
        languageCanBeSelected: languages.length > minimalLanguagesCount,
      };
    },
  },
});

/* typeof languagesQuery.$data === Store<{
 *   availableLanguages: string[],
 *   languageCanBeSelected: boolean,
 * }>
 */
```

### `createQuery({ effect, contract?, validate?, mapData?, mapFailure: Function, initialData? })` <Badge type="tip" text="since v0.14" />

Creates [_Query_](/api/primitives/query) based on given [_Effect_](https://effector.dev/en/api/effector/effect/). When the [_Query_](/api/primitives/query) fails, the error is passed to `mapFailure` callback, and the result of the callback will be treated as the error of the [_Query_](/api/primitives/query).

```ts
const languagesQuery = createQuery({
  effect: fetchLanguagesFx,
  contract: languagesContract,
  mapFailure({ error, params }) {
    // Transform any error into a user-friendly message
    if (isHttpError({ status: 404, error })) {
      return { code: 'NOT_FOUND', message: 'Languages not found' };
    }
    return { code: 'UNKNOWN', message: 'Failed to fetch languages' };
  },
});

/* typeof languagesQuery.$error === Store<{
 *   code: string,
 *   message: string,
 * } | null>
 */
```

### `createQuery({ effect, contract?, validate?, mapData?, mapFailure: { source, fn }, initialData? })` <Badge type="tip" text="since v0.14" />

Creates [_Query_](/api/primitives/query) based on given [_Effect_](https://effector.dev/en/api/effector/effect/). When the [_Query_](/api/primitives/query) fails, the error is passed to `mapFailure.fn` callback as well as original parameters of the [_Query_](/api/primitives/query) and current value of `mapFailure.source` [_Store_](https://effector.dev/en/api/effector/store/), result of the callback will be treated as the error of the [_Query_](/api/primitives/query).

```ts
const $errorMessages = createStore({
  404: 'Resource not found',
  500: 'Server error',
});

const languagesQuery = createQuery({
  effect: fetchLanguagesFx,
  contract: languagesContract,
  mapFailure: {
    source: $errorMessages,
    fn({ error, params }, errorMessages) {
      if (isHttpError({ error })) {
        return {
          message: errorMessages[error.status] ?? 'Unknown error',
          status: error.status,
        };
      }
      return { message: 'Network error', status: null };
    },
  },
});
```
