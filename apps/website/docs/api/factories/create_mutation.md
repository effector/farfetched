# `createMutation` <Badge type="tip" text="since v0.2" />

## Formulae

### `createMutation({ handler })`

Creates [_Mutation_](/api/primitives/mutation) based on given asynchronous function.

```ts
const loginMutation = createMutation({
  handler: async ({ login, password }) => {
    const response = await fetch('https://api.salo.com/login.json', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });

    return response.json();
  },
});
```

### `createMutation({ effect })`

Creates [_Mutation_](/api/primitives/mutation) based on given [_Effect_](https://effector.dev/en/api/effector/effect/).

Usage of [_Effect_](https://effector.dev/en/api/effector/effect/) instead of simple asynchronous function allows you to declare types of possible errors statically that will be passed to [_Mutation_](/api/primitives/mutation).

```ts
const loginMutation = createMutation({
  effect: createEffect<{ login: string; password: string }, { email: string }, LoginError>(async ({ login, password }) => {
    const response = await fetch('https://api.salo.com/login.json', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });

    if (!response.ok) {
      throw new LoginError();
    }

    return response.json();
  }),
});

// typeof loginMutation.finished.failure === Event<{
//   error: LoginError,
//   params: { login: string, password: string }
// }>
```

### `createMutation({ effect, contract })`

Creates [_Mutation_](/api/primitives/mutation) based on given [_Effect_](https://effector.dev/en/api/effector/effect/).

[_Contract_](../primitives/contract) allows you to validate the response and decide how your application should treat it — as a success response or as a failed one.

```ts
const loginMutation = createMutation({
  effect: loginFx,
  contract: {
    // Our API can return empty object, we consider it as a failed mutation
    isData: (response) => !response.email,
    // Array with description of reasons why data is invalid
    getErrorMessages: (response) => ['Expected object with email, but got empty object'],
  },
});

// typeof loginMutation.finished.failure === Event<{
//   error:
//     | InvalidDataError 👈 validation failed
//     | ErrorFromEffect[] 👈 API request failed,
//   params: { login: string, password: string }
// }>
```

### `createMutation({ effect, contract?, mapError: Function })` <Badge type="tip" text="since v0.14" />

Creates [_Mutation_](/api/primitives/mutation) based on given [_Effect_](https://effector.dev/en/api/effector/effect/). When the [_Mutation_](/api/primitives/mutation) fails, the error is passed to `mapError` callback, and the result of the callback will be treated as the error of the [_Mutation_](/api/primitives/mutation).

```ts
const loginMutation = createMutation({
  effect: loginFx,
  contract: loginContract,
  mapError({ error, params }) {
    // Transform any error into a user-friendly message
    if (isHttpError({ status: 401, error })) {
      return { code: 'UNAUTHORIZED', message: 'Invalid credentials' };
    }
    return { code: 'UNKNOWN', message: 'Failed to login' };
  },
});

// typeof loginMutation.finished.failure === Event<{
//   error: { code: string, message: string },
//   params: { login: string, password: string }
// }>
```

### `createMutation({ effect, contract?, mapError: { source, fn } })` <Badge type="tip" text="since v0.14" />

Creates [_Mutation_](/api/primitives/mutation) based on given [_Effect_](https://effector.dev/en/api/effector/effect/). When the [_Mutation_](/api/primitives/mutation) fails, the error is passed to `mapError.fn` callback as well as original parameters of the [_Mutation_](/api/primitives/mutation) and current value of `mapError.source` [_Store_](https://effector.dev/en/api/effector/store/), result of the callback will be treated as the error of the [_Mutation_](/api/primitives/mutation).

```ts
const $errorMessages = createStore({
  401: 'Invalid credentials',
  403: 'Access denied',
});

const loginMutation = createMutation({
  effect: loginFx,
  contract: loginContract,
  mapError: {
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
