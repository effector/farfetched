# Cache

Farfetched provides a way to [`cache`](/api/operators/cache) the result of the [_Query_](/api/primitives/query). Let's dive into internal details of this mechanism.

> In the following article, some [Effector](https://effector.dev) APIs are used to describe application logic — `createStore`, `createEffect` `combine`, `sample`.

## Valid data guarantee

[`cache`](/api/operators/cache) operator provides a guarantee that the cached data won't be saved to [_Query_](/api/primitives/query) unless it is valid for the current state of the [_Query_](/api/primitives/query). It means, you can safely deploy a new version of your application with a new expected shape of the data and the old cached data will be automatically invalidated.

### Data-flow

Internal implementation of this guarantee is a pretty simple. Farfetched is based on [Do not trust remote data](/statements/never_trust) principle, so it uses [_Contract_](/api/primitives/contract) and [_Validator_](/api/primitives/validator) to validate the data from the remote source.

::: tip
Read more detailed description of data-flow in [Data flow in Remote Operation](/recipes/data_flow) article.
:::

`cache` operator pushes the data to the [_Query_](/api/primitives/query) right after the **response parsing** stage of the data-flow. It means, same [_Contract_](/api/primitives/contract) and [_Validator_](/api/primitives/validator) are used to validate the cached data as any other data from the regular remote source. If the cached data is valid, it is saved to the [_Query_](/api/primitives/query). Otherwise, the cached data is ignored, and the [_Query_](/api/primitives/query) is updated with the new data from the remote source.

::: info
User-land code can't access the cached data directly. It is only available through the [_Query_](/api/primitives/query) object. So, invalid cached data is not exposed to the user.
:::

To achieve this, Every [_Query_](/api/primitives/query) exposes `.__.lowLevelAPI.dataSources` which contains an array of data sources that are used to retrieve the data for the [_Query_](/api/primitives/query). By default, the first element of this array is always the original handler of the [_Query_](/api/primitives/query). We can mutate this array to add new data sources to the [_Query_](/api/primitives/query). [`cache`](/api/operators/cache) operator does exactly this, it adds a new data source to the array that is responsible for the cached data.

::: danger
`.__.lowLevelAPI.dataSources` is a low-level API that is not recommended using it directly in user-land.
:::

## Cache key generation

[`cache`](/api/operators/cache) does not require any manual key generation to work, it uses the [SID](https://effector.dev/en/explanation/sids/) of the [_Query_](/api/primitives/query) and all external [_Stores_](https://effector.dev/en/api/effector/store/) that affect [_Query_](/api/primitives/query) to create a unique identifier for every cache entry. It means, key generation is fully automatic, and you don't need to worry about it.

### Sources extraction

Due to static nature of [Effector](/statements/effector) we can extract all external [_Stores_](https://effector.dev/en/api/effector/store/) that affect [_Query_](/api/primitives/query) right after application loading and use their values in key generation process.

Every factory has to pass a list of [_Sourced_][_sourced_](/api/primitives/sourced) fields used in the [_Query_](/api/primitives/query) creation process to field `.__.lowLevelAPI.sourced`.

For example, the following [_Query_](/api/primitives/query) uses `$language` and `$region` [_Stores_](https://effector.dev/en/api/effector/store/) to define the final value of the field `url`:

```ts
const locationQuery = createJsonQuery({
  request: {
    url: {
      source: combine({ language: $language, region: $region }),
      fn: (_params, { language, region }) => (region === 'us' ? `https://us-west.salo.com/${language}/location` : `https://eu-cent.salo.com/${language}/location`),
    },
  },
});
```

Of course, we can just save both `$language` and `$region` to `.__.lowLevelAPI.sourced` and use them in key generation process, but it is not the best solution. Final URL does not include the value of `$region` directly, it cares only if it is `"us"` or not, so we have to emphasize this fact in `.__.lowLevelAPI.sourced`. To solve this issue, let's check internal implementation of [_Sourced_](/api/primitives/sourced) fields.

::: info
[_Sourced_](/api/primitives/sourced) fields are special fields in Farfetched that are allows to use any combination of [_Stores_](https://effector.dev/en/api/effector/store/) and functions to define the final value of the field.
:::

Under the hood Farfetched uses special helper `normalizeSourced` that transforms any [_Sourced_](/api/primitives/sourced) field to simple [_Stores_](https://effector.dev/en/api/effector/store/), in our case it would be something like this:

```ts
// internal function in Farfetched's sources
function normalizedSourced($store, start, transform) {
  const $result = createStore(null);
  sample({
    clock: start,
    source: $store,
    fn: (store, params) => transform(params, store),
    target: $result,
  });
  return $result;
}

// this transformation applied to the field `url` to get the final value
const $url = normalizedSourced(combine({ language: $language, region: $region }), query.start, (_params, { language, region }) => (region === 'us' ? `https://us-west.salo.com/${language}/location` : `https://eu-cent.salo.com/${language}/location`));
```

After that, we can use `$url` in `.__.lowLevelAPI.sources`, it will contain only related data and could be used as a part of cache entry key. Same transformation applies for every sourced field to extract only significant data.

::: danger
`normalizeSourced` is a low-level API function that is used internally in Farfetched. It is not recommended using it directly in user-land.
:::

Static nature of [Effector](/statements/effector) allows us to perform this transformation under the hood and use only related data from to formulate cache entry key. It is an essential part of stable key generation that leads us to higher cache-hit rate.

### SID

Every [_Query_](/api/primitives/query) has a unique identifier — [SID](https://effector.dev/en/explanation/sids/). Effector provides a couple of plugins for automatic SIDs generation.

<!--@include: ../shared/sids_plugins.md-->

### Hashing algorithm

So, the key is a hash of the following data:

- `SID` of the [_Query_](/api/primitives/query)
- `params` of the particular call of the [_Query_](/api/primitives/query)
- current values of all external [_Stores_](https://effector.dev/en/api/effector/store/) that affect [_Query_](/api/primitives/query)

To get short and unique key, we stringify all data, concatenate it and then hash it with [custom hash function](https://github.com/igorkamyshev/farfetched/blob/master/packages/core/src/cache/lib/hash.ts).

:::tip
It is a cryptographically broken, but we use it for key generation only, so it is safe to use it in this case.
:::

### Custom key modification

Key modification based on already generated key. It can be useful for multiple cases: SSR, multiple account, localizations, environment variable or something else.
For example, we can use localization with known store value: we know that cache must be related with your localization, but we don't need use localization key as query `params`, and we don't need purge already loaded (previous) locale.
```ts
import { attach } from "effector";
import { createQuery, localStorageCache } from "@farfetched/core";

const $locale = createStore("en");

const modifyKeyFx = attach({
  source: { locale: $locale },
  effect: ({locale}, key: string) => {
    return `${key}:lang_${locale}`;
  },
});

const query = createQuery({
  effect: createEffect(async () => fetch("/api/posts").json()),
});

cache(query, {
  adapter: localStorageCache,
  modifyKey: modifyKeyFx,
});
```

## Adapter replacement

Sometimes it's necessary to replace current cache adapter with a different one. E.g. it's impossible to use `localStorage` on server-side during SSR, so you have to replace it with some in-memory adapter. To do this Farfetched provides a special property in every adapter `.__.$instance` that can be replaced via Fork API.

### Adapter internal structure

Fork API allows to replace any [_Store_](https://effector.dev/en/api/effector/store/) value in the particular [_Scope_](https://effector.dev/en/api/effector/scope/), so we have to provide some "magic" to adapters to make it [_Store_](https://effector.dev/en/api/effector/store/)-like.

In general, every adapter is a simple object with the following structure:

```ts
const someAdapter = {
  get: createEffect(({ key }) => /* ... */),
  set: createEffect(({ key, value }) => /* ... */),
  purge: createEffect(() => /* ... */),
};
```

We have to add `.__.$instance` property to it to make it replacable via Fork API:

```ts
// internal function in Farfetched's sources
function makeAdapterRepalcable(adapter) {
  return {
    ...adapter,
    __: {
      $instance: createStore(adapter),
    },
  };
}
```

::: danger
`makeAdapterRepalcable` is a low-level API function that is used internally in Farfetched. It is not recommended using it directly in user-land.
:::

That's it, now we can replace any adapter with another one via Fork API:

```ts
// app.ts
import { localStorageCache } from '@farfetched/core';

// Create some adapter to use in the appliaction
const applicationCacheAdapter = localStorageCache();

cache(query, { adapter: applicationCacheAdapter });

// app.test.ts
import { inMemoryCache } from '@farfetched/core';

test('app', async () => {
  const scope = fork({
    values: [
      // Replace its implementation during fork
      [applicationCacheAdapter.__.$instance, inMemoryCache()],
    ],
  });
});
```

Operator [`cache`](/api/operators/cache) does not use `.get`, `.set` and `.purge` methods directly, it extracts them from the `.__.$instance` on every hit instead. It allows users to replace adapters in specific environments (such as tests or SSR) without any changes in the application code.

## [_Query_](/api/primitives/query) interruption

[`cache`](/api/operators/cache) allows skipping [_Query_](/api/primitives/query) execution if the result is already in the cache and does not exceed the `staleAfter` time. It uses `.__.lowLevelAPI.dataSources` as well.

To retrieve new data a [_Query_](/api/primitives/query) iterates over all data sources and calls `.get` method on them. If the result is not empty it stops iteration and returns the result. So, `cache` operator just adds a new data source to the start of the list of data sources.
