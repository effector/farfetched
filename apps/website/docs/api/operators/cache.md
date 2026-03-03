---
outline: [2, 3]
---

# `cache` <Badge type="tip" text="since v0.3" />

Saves result of the [_Query_](/api/primitives/query) to some storage and allows to restore it back.

## Formulae

```ts
import { cache } from '@farfetched/core';

cache(query, config);
```

Config fields:

- `adapter?`: _CacheAdapter_
- `staleAfter?`: [_Time_](/api/primitives/time) after which the data is considered stale and will be re-fetched immediately
- `purge?`: [_Event_](https://effector.dev/en/api/effector/event/) after calling which all records will be deleted from the cache
- `humanReadableKeys?`: <Badge type="tip" text="since v0.12" /> _boolean_ whether to use human-readable keys in the cache. Default is `false` and the key is not human-readable.
- `modifyKey?`: [_Effect<string, string>_](https://effector.dev/en.effector/Effect/) keys modification (important: don't use for keys replacement).  

## Adapters

Required field `adapter` is used to specify storage to save results. Available adapters:

- `inMemoryCache` (**default adapter**) useful for caching results of the [_Query_](/api/primitives/query) during one interaction with the application.
- `sessionStorageCache` uses [Session Storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage), useful for caching results of the [_Query_](/api/primitives/query) across tab reloads during single session.
- `localStorageCache` uses [Local Storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), useful for caching results of the [_Query_](/api/primitives/query) across sessions.
- `voidCache` never saves anything, never restores anything. It's useful for testing purposes.

### Auto-deletion

Every adapter accepts settings for auto-deletion of the cached results by the following fields:

- `maxAge?` - [_Time_](/api/primitives/time) with a maximum age of the cached result
- `maxEntries?` — _number_ with a maximum number of maximum entries in the cache

```ts
import { cache } from '@farfetched/core';
import { createEvent } from 'effector';

cache(query, {
  adapter: someAdapter({ maxAge: '15m', maxEntries: 300 }),
});
```

### Observability

Every adapter accepts settings for observability of the cached results by the field `observability`:

```ts
import { cache } from '@farfetched/core';
import { createEvent } from 'effector';

const hit = createEvent(); // result is **found** and restored
const miss = createEvent(); // result is **not found**
const expired = createEvent(); // cache entry is **expired** and deleted
const evicted = createEvent(); // cache entry is **evicted** and deleted

cache(query, {
  adapter: someAdapter({ observability: { hit, miss, expired, evicted } }),
});
```

Farfetched provides a helper function to attach observability to the custom adapter — `attachObservability`. It accepts the object with the following properties:

- `adapter` — the adapter instance itself
- `options` — the object with [_Events_](https://effector.dev/en/api/effector/event/) which should be **passed by the user to the adapter from application code**:
  - `hit` — the [_Event_](https://effector.dev/en/api/effector/event/) that will be triggered on cache hit
  - `miss` — the [_Event_](https://effector.dev/en/api/effector/event/) that will be triggered on cache miss
  - `expired` — the [_Event_](https://effector.dev/en/api/effector/event/) that will be triggered on cache expiration
  - `evicted` — the [_Event_](https://effector.dev/en/api/effector/event/) that will be triggered on cache eviction
- `events` — the object with [_Events_](https://effector.dev/en/api/effector/event/) which have to be **triggered by the adapter itself**:
  - `itemEvicted` — the [_Event_](https://effector.dev/en/api/effector/event/) that is triggered on cache eviction
  - `itemExpired` — the [_Event_](https://effector.dev/en/api/effector/event/) that is triggered on cache expiration

```ts
import { createEvent } from 'effector';
import { attachObservability } from '@farfetched/core';

function myCustomAdapter({
  observability,
}: {
  observability: {
    hit?: Event<{ key: string }>;
    miss?: Event<{ key: string }>;
    expired?: Event<{ key: string }>;
    evicted?: Event<{ key: string }>;
  };
}) {
  const adapter = createCacheAdapter({
    // ...
  });

  const itemEvicted = createEvent<{ key: string }>();
  const itemExpired = createEvent<{ key: string }>();

  attachCacheObservability({
    adapter,
    options: observability,
    events: { itemEvicted, itemExpired },
  });

  return adapter;
}
```

However, we still need to trigger `itemEvicted` and `itemExpired` events in our adapter.

### Custom serialization <Badge type="tip" text="since v0.9" />

Adapters that use `localStorage` and `sessionStorage` as a storage for cached results use `JSON.stringify` and `JSON.parse` to serialize and deserialize data. If you need to use custom serialization, you can use `serialize` field in the adapter config:

```ts
import { cache, localStorageCache } from '@farfetched/core';

cache(query, {
  adapter: localStorageCache({
    serialize: {
      read: (data) => {
        // Do your custom deserialization here

        return parsedData;
      },
      write: (data) => {
        // Do your custom serialization here

        return serializedData;
      },
    },
  }),
});
```
