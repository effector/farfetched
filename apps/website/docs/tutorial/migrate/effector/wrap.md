# Step 1: Wrap existing data fetching _Effects_

::: tip
In this tutorial, we assume you have an application that uses [_Effects_](https://effector.dev/docs/api/effector/effect) for data fetching.
:::

Farfetched has two primitives for data fetching: [_Queries_](/api/primitives/query) and [_Mutations_](/api/primitives/mutation). It is a complete replacement for [_Effects_](https://effector.dev/docs/api/effector/effect) used for data fetching. Let's start with a key difference between _Effects_ and _Queries_/_Mutations_.

## _Effects_ vs _Queries_/_Mutations_

## Differences between _Queries_ and _Mutations_

## Wrap _Effects_ to _Queries_ and _Mutations_

All Farfetched APIs are designed to be used with [_Queries_](/api/primitives/query) and [_Mutations_](/api/primitives/mutation). So, to take advantage of Farfetched, we need to wrap existing [_Effects_](https://effector.dev/docs/api/effector/effect) to [_Queries_](/api/primitives/query) and [_Mutations_](/api/primitives/mutation).

```ts
import { createQuery, createMutation } from '@farfetched/core';

const fetchUserFx = createEffect(/*...*/);
const userQuery = createQuery({ effect }); // [!code ++]

const createPostFx = createEffect(/*...*/);
const createPostMutation = createMutation({ effect }); // [!code ++]
```

After this change, instead of direct usage of [_Effects_](https://effector.dev/docs/api/effector/effect) we have to use [_Queries_](/api/primitives/query) and [_Mutations_](/api/primitives/mutation).

```ts
// Use .start Event instead of Effect
sample({
  clock: someTrigger,
  target: fetchUserFx, // [!code --]
  target: userQuery.start, // [!code ++]
});

// Use .finished.success Event instead of .done Event
sample({
  clock: fetchUserFx.done, // [!code --]
  clock: userQuery.finished.success, // [!code ++]
  target: someTarget,
});

// Use .finished.failure Event instead of .fail Event
sample({
  clock: fetchUserFx.fail, // [!code --]
  clock: userQuery.finished.failure, // [!code ++]
  target: someTarget,
});

// Use .$data Store instead of creating a new Store
const $user = createStore(null); // [!code --]
$user.on(fetchUserFx.doneData, (_, newUser) => newUser); // [!code --]
const $user = userQuery.$data; // [!code ++]
```

As soon as no code in the application uses [_Effects_](https://effector.dev/docs/api/effector/effect) directly, we can hide them to prevent accidental usage.

```ts
const fetchUserFx = createEffect(/*...*/); // [!code --]
const userQuery = createQuery({ effect }); // [!code --]

const userQuery = createQuery({ effect: createEffect(/*...*/) }); // [!code ++]
```

This simple step allows us to use Farfetched APIs with existing [_Effects_](https://effector.dev/docs/api/effector/effect) without rewriting big parts of the codebase. For example, now we can easily add retries to `userQuery`:

```ts
import { retry } from '@farfetched/core';

retry(userQuery, { limit: 3, delay: 1000 });
```

We will dive into more details about Farfetched APIs in the next steps of this tutorial.
