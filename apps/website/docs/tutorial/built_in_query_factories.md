# Built-in factories for Query

:::tip You will learn

- Why do we need built-in factories
- How to use built-in factories
- How to create your own factory

:::

`createQuery` is pretty powerful, it allows you to create any [_Query_](/api/primitives/query) you want. But it's not always the best solution. Sometimes you just want to create a simple query, and you don't want to bother with all the details. That's why we have built-in factories.

::: info
Built-in factories are easier to use, and they are more declarative, which makes them more readable. On the other hand, they are less flexible, so that's the price.
:::

## JSON API

A lot of modern APIs work with JSON. It accepts JSON as input and returns JSON as output. It's a very convenient format, because it's easy to read and write. Not only that, but it's also very flexible, because it allows you to send only the data you need. So, Farfetched has a built-in factory for JSON API — `createJsonQuery`.

Let's start with an example, and then we'll explain what's going on.

```ts
import { createJsonQuery } from '@farfetched/core';

const characterQuery = createJsonQuery({
  params: declareParams<{ id: number }>(),
  request: {
    method: 'GET',
    url: ({ id }) => `https://rickandmortyapi.com/api/character/${id}`,
  },
  response: {
    contract: Character,
  },
});
```

### Parameters declaration

::: info
Parameters declaration is required only for TypeScript-based projects because it is used only for correct type inferences. You can skip this part in a JS project.
:::

As you can see, it is no explicit handler here, however we still need to declare some parameters of the [_Query_](/api/primitives/query), Farfetched provides special helper for that — `declareParams`. It accepts a generic type which is type of parameters.

```ts{4}
import { declareParams } from '@farfetched/core';

const characterQuery = createJsonQuery({
  params: declareParams<{ id: number }>(),
  request: {
    method: 'GET',
    url: ({ id }) => `https://rickandmortyapi.com/api/character/${id}`,
  },
  response: {
    contract: Character,
  },
});
```

By default, `createJsonQuery` returns a [_Query_](/api/primitives/query) without any parameters.

### Request

`request` field of the config is dedicated to description of the request to the API. It has plenty fields, which are listed in [the API reference](/api/factories/create_json_query), for now let's concentrate on the most important ones.

- `request.method` has to be a _string_ with an HTTP method in uppercase, e.g. `GET` or `POST`.
- `request.url` is used to formulate a URL of the request, it could be declared in many forms, but two the most interesting for us:
  - just static _string_
  - function that accepts [_Query_](/api/primitives/query) parameters and returns a _string_

```ts{3-6}
const characterQuery = createJsonQuery({
  params: declareParams<{ id: number }>(),
  request: {
    method: 'GET',
    url: ({ id }) => `https://rickandmortyapi.com/api/character/${id}`,
  },
  response: {
    contract: Character,
  },
});
```

### Response

`response` field of the config is dedicated to description of the response from the API. It has plenty fields, which are listed in [the API reference](/api/factories/create_json_query), for now let's concentrate on the most important ones.

- `response.contract` is used to describe the shape of the response, it has to be a [_Contract_](/api/primitives/contract) object.

```ts{7-9}
const characterQuery = createJsonQuery({
  params: declareParams<{ id: number }>(),
  request: {
    method: 'GET',
    url: ({ id }) => `https://rickandmortyapi.com/api/character/${id}`,
  },
  response: {
    contract: Character,
  },
});
```

::: tip
Built-in factories consider any response as `unknown` by default, so you have to provide a [_Contract_](/api/primitives/contract) to validate the shape of the response because we think that [you should not trust remote data](/statements/never_trust).
:::

### What's else?

`createJsonQuery` does some additional job to make your life easier. It does the following:

- Add `Content-Type: application/json` header to the request
- Parse the response as JSON

## Custom factories

Sometimes you need to create a bunch of [_Queries_](/api/primitives/query) that are not covered by built-in factories and do not want to do the same job many times for every [_Query_](/api/primitives/query). In this case, you can create your own factory.

Read more about it [in custom factories' recipe](/recipes/custom_query).
