# Dependent Queries

:::tip You will learn

- How to connect one Query to another
- How to check that dependent Query is stale
- How to add multiple children
- How to add multiple parents

:::

## Connections between Queries

Dependent (or serial) [Queries](/api/primitives/query) depend on previous ones to finish before they can execute. To achieve this, it's as easy as using the [`connectQuery`](/api/operators/connect_query) method.

Let's create two [Queries](/api/primitives/query), the second one will require data from the first one:

```ts
// Our Query from the previous section
const characterQuery = createQuery({
  handler: async ({ id }) => {
    const response = await fetch(`https://rickandmortyapi.com/api/character/${id}`);

    return response.json();
  },
});

// Let's create a Query that extracts data about character's origin,
// originUrl is a part of response of characterQuery
const originQuery = createQuery({
  handler: async ({ originUrl }) => {
    const response = await fetch(originUrl);

    return response.json();
  },
});
```

Now, we have to connect these [Queries](/api/primitives/query) to establish static relationship between them.

```ts
import { connectQuery } from '@farfetched/core';

connectQuery({
  source: characterQuery,
  fn({ result: character }) {
    return { params: { originUrl: character.origin.url } };
  },
  target: originQuery,
});
```

It's done, after every successful execution of `characterQuery`, `originQuery` will be executed with the parameters returned by `fn` in `connectQuery`.

## Stale state

After established connection, it becomes clear that `originQuery` results are useless right after new `characterQuery` start. But `.$status` of the child [Query](/api/primitives/query) won't change at parent start because loading of the child query is not started yet.

To determine that data in the [Query](/api/primitives/query) is outdated (e.g. because parent execution is already started), you can use boolean Store `.$stale`.

::: details The typical flow of statuses changes with two dependent queries

1. Start of the application
   - Parent
     - `characterQuery.$status` is "initial"
     - `characterQuery.$stale` is false
   - Child
     - `originQuery.$status` is "initial"
     - `originQuery.$stale` is false

2. Call `characterQuery.start({ id: 1 })`
   - Parent
     - `characterQuery.$status` is "pending" 🚨
     - `characterQuery.$stale` is false
   - Child
     - `originQuery.$status` is "initial"
     - `originQuery.$stale` is true 🚨

3. `characterQuery` successfully finished execution, `originQuery` is immediately started with the parameters returned by `fn` in `connectQuery`
   - Parent
     - `characterQuery.$status` is "success"
     - `characterQuery.$stale` is false
   - Child
     - `originQuery.$status` is "pending" 🚨
     - `originQuery.$stale` is true 🚨

4. `originQuery` successfully finished execution
   - Parent
     - `characterQuery.$status` is "success"
     - `characterQuery.$stale` is false
   - Child
     - `originQuery.$status` is "success"
     - `originQuery.$stale` is false

:::

## Multiple children

`connectQuery` accepts an array of children as well. E.g., if we have two [Queries](/api/primitives/query) that depend on the same data, we can connect them to parent in one call:

```ts
connectQuery({
  source: characterQuery,
  fn({ result: character }) {
    return { params: { originUrl: character.origin.url } };
  },
  target: [originQuery, originDetailsQuery],
});
```

::: info
All children [Queries](/api/primitives/query) have to have the same parameters in this form.
:::

## Multiple parents

`connectQuery` accepts an object with any amount of named parents as well.

```ts
connectQuery({
  source: { character: characterQuery, language: languageQuery },
  fn({ character, language }) {
    return {
      params: {
        originUrl: character.result.origin.url,
        language: language.result,
      },
    };
  },
  target: originQuery,
});
```

Behavior of this form is pretty simple — children [Queries](/api/primitives/query) will be started with the parameters returned by `fn` in `connectQuery` right after all parents are successfully finished. After first execution, re-execution of any parent will trigger re-execution of all children.

## Simplified form

Sometimes, children [Queries](/api/primitives/query) don't need any parameters. In this case, you can use simplified form of `connectQuery`:

```ts
connectQuery({
  source: characterQuery,
  target: originQuery,
});
```
