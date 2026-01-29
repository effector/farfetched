# @farfetched/core

## 0.15.0

### Minor Changes

- d5b3011: Added `request.fetch` feature to createJson\* methods, which allows to apply any valid `RequestInit` setting to underlying `fetch` call

  The top-level `request.credentials` is deprecated in favor of `request.fetch.credentials`

## 0.14.2

### Patch Changes

- f64389b: Support React-Native Response object

## 0.14.1

### Patch Changes

- d2a2afb: Fix "No Content" responses support

## 0.14.0

### Minor Changes

- 9e89fb8: Delete `concurrency` field in favour of `concurrency` operator
- 0d3bcb0: Delete `attachOperation` operator
- 4035fee: Added a new feature - `mapError` mapper to all Queries and Mutations

### Patch Changes

- 3a319bc: Fix retry operator to not retry abort errors from concurrency policies. Previously, when using `concurrency` with `TAKE_LATEST` strategy alongside `retry`, abort errors could leak through the retry mechanism, causing unnecessary retry attempts for intentionally cancelled requests. Now abort errors are automatically filtered out before retry logic is applied.
- 6efc16a: Get rid off `response.clone()` to support streaming in edge runtimes
- e12648e: Export `ExecutionMeta`
- 3c0c3a9: Export `attachObservability`

## 0.13.2

### Patch Changes

- 8084897: Fix incorrect links in console warnings

## 0.13.1

### Patch Changes

- 7fc6e28: Add workaround for Safari 14.0 bugged implementation of URL constructor

## 0.13.0

### Minor Changes

- 9345f18: Add _Event_ `.forceDeactivate` to _Barrier_
- 121de27: Runtime deprecation warnings about `concurrency` field in `createJsonQuery` and `createJsonMutation`
- 00cb181: Pass response original `headers` to `mapData` callback in `createJsonQuery`
- 46c3402: Runtime deprecation warning in `attachOperation`
- 9345f18: Add _Event_ `.performed` to _Barrier_
- 00cb181: Pass response original `headers` to `mapData` callback in `createJsonMutation`

## 0.12.8

## 0.12.7

### Patch Changes

- 88b6096: Decrease bundle size and key length in `cache` operator by replacing sha-1 by custom hashing function
- 1d05aba: Fix name extraction in _Query_ and _Mutation_ from babel-plugin/swc-plugin

## 0.12.6

### Patch Changes

- 6107570: Fix types in `connectQuery` in case of source _Query_ with `initialData`

## 0.12.5

### Patch Changes

- 0d4c1a6: Fix support of relative urls in `createJsonQuery` and `createJsonMutation`

## 0.12.4

## 0.12.3

### Patch Changes

- 16f68b2: Update formatting (bump prettier to v3)
- d0fc25b: Fix bug with extra fires of `finished.failure` in case of failed contract application with `retry` operator
- 1f59bb3: Abort all in-flight operations on `.reset`

## 0.12.2

### Patch Changes

- 1b4ea89: Invoke `.finished.failure` in case of disabled `retry` applied to operation

## 0.12.1

### Patch Changes

- f724207: Fix typings of `createQuery` in case of handler with no params
- 5c0f6d6: Fix race in validation of `obAbort` call in case of starting many operations by single `sample`
- ce4ea66: Add `.reset` _Event_ to `@@unitShape` on _Mutation_

## 0.12.0

### Minor Changes

- 7331eb8: Add `.reset` _Event_ to _Mutation_
- 66991a0: Add `filter` parameter to `connectQuery` operator
- ef2bf7d: Add `onAbort` to save abort handlers in `createQuery`/`createMutation`
- 004c47b: Initial release of Dev Tools interface
- b9d84bb: Add parameter `humanReadableKeys` to operator `cache`
- 2ea13bd: Deprecate `attachOperation`
- e8d0512: New overload `applyBarrier(operations, { barrier })`

### Patch Changes

- 0b8df65: Fix types of `update` operator to allow returning InitialData from callback
- 896e27d: Update build tool-chain

## 0.11.4

### Patch Changes

- f14f944: Fix incorrect type of `__.$instance` in Cache API

## 0.11.3

### Patch Changes

- 3649ae9: Support Cloudflare Workers runtime by deleting explicitly setting credentials in internal code, observed behavior has not changed for other runtimes

## 0.11.2

## 0.11.1

### Patch Changes

- 730ef73: Do not flick `.$status` during cancellation

## 0.11.0

### Minor Changes

- c925412: Introduce Barrier API
- 67d7288: Hide `isAbortError` from public API
- ffdfffa: Adopt for Effector 23

### Patch Changes

- ef2d3a5: Support `enabled` in `keepFresh`
- ec2ab95: Do not throw nonserializable error in case of invalid URL

## 0.10.6

### Patch Changes

- a3b87b6: Add missed header Accept in `createJsonQuery`/`createJsonMutation`

## 0.10.5

### Patch Changes

- 4a86b3e: Fix undefined case in isEqual with custom classes with no valueOf
- ac5e2d8: Support null-prototype objects as first-class citizens in `keepFresh` operator. Aftershock for release 0.10.3.

## 0.10.4

### Patch Changes

- 0f30158: Add missed export of `JsonApiRequestError`

## 0.10.3

### Patch Changes

- 54d3bf1: Do not stop refreshing if source contains weird object

## 0.10.2

### Patch Changes

- 8590dfb: Allow passing to connectQuery query with initialData

## 0.10.1

### Patch Changes

- e8a1385: Support _Query_ with initial data in `update` operator types

## 0.10.0

### Minor Changes

- f118011: Finalize separation of `.aborted` _Event_ in _Remote Operation_
- f118011: Add `timeout` operator
- f118011: Change default value of `supressIntermediateErrors` in `retry` operator
- f118011: Allow to pass `null` and `undefined` to `FetchApiRecord`, it will be ignored

## 0.9.0

### Minor Changes

- 961f32f: Allow passing array of codes to `isHttpErrorCode`
- a5f4f38: Add _Event_ `.started` to _Query_ and _Mutation_
- e632dca: Support custom serialization in `localStorageCache` and `sessionStorageCache`
- 7e909d2: Add _Event_ `aborted` to _Query_
- faa19ec: Mark read-only _Events_ and _Stores_ with `readonly`
- ca20587: Add _Store_ `.$finished` to _Remote Operation_
- 7448b5c: Delete `externalCache`
- 1ec644e: Add option `supressIntermediateErrors` to `retry` operator
- f759034: Add info about _Query_ status and corresponding data to `.finished.finally` _Event_

### Patch Changes

- 3ecc6ea: Rework internal structure of sourced fields to fix race-condition in `attachOperation`
- 43917a7: Add `ExecutionMeta` to `otherwise` _Event_ in `retry` operator

## 0.8.15

### Patch Changes

- 7790cb2: Introduce `@farfetched/atomic-router`

## 0.8.14

### Patch Changes

- b435591: Reset attempts count in `retry` after manual start of the operation

## 0.8.13

### Patch Changes

- 55baa71: Add `OPTIONS` method to allowed `HttpMethod`

## 0.8.12

### Patch Changes

- 4a1f222: Simplify `keepFresh` typings
- 461fbc8: Fix incorrect typings of `triggers` in `keepFresh`

## 0.8.11

### Patch Changes

- 528416b: Export missed types for custom cache adapters

## 0.8.10

### Patch Changes

- 33b32c8: Fix sync batching in `keepFresh`

## 0.8.9

### Patch Changes

- 8c61933: Fix refreshing after enabling _Query_ with different sources

## 0.8.8

### Patch Changes

- 6cbe074: Fix re-run old refreshes after enabling and disabling _Query_

## 0.8.7

### Patch Changes

- d393e78: Fix extra refresh in `keepFresh` while source is changing for disabled _Query_

## 0.8.6

### Patch Changes

- d432e00: Expose missed `createCacheAdapter`

## 0.8.5

### Patch Changes

- fa0727a: Allow using _Query_ with `initialData` in `keepFresh`

## 0.8.4

### Patch Changes

- 8bf8b77: Allow to use booleans in FetchApiRecord

## 0.8.3

## 0.8.2

### Patch Changes

- f627cf4: Fix sharing `cache` between `attach`-ed _Queries_

## 0.8.1

### Patch Changes

- c1ceb16: Fix extra `setup` calls of `@@trigger` in `keepFresh`
- 4c7f25f: Do not flood keys with same value in meta in `sessionStorageCache` and `localStorageCache`
- 0ca10d3: Do not skip `.refresh` for disabled _Query_, instead postpone it until enabling
- 0822244: Do not skip _Query_ execution with `.refresh` with different params

## 0.8.0

### Minor Changes

- f04aa0d: Allow to pass any string as `query` in `createJson*`
- 386752e: Expose original error in `NetworkError` as well
- 24cb348: Add new _Event_ for the _Query_ — `.refresh`
- f6ce0bf: Fix types of `connectQuery` in case of target Query<void, ...>
- e298d2f: Add new low-level function — `combineSourced`
- 573ad52: Add `.$idle` _Store_ that shows if fetching has started or not in _Remote Operations_
- 24cb348: Add new operator — `keepFresh`
- 19e9626: Mark `externalCache` as deprecated

### Patch Changes

- 2f6fa1c: Export `fetchFx` to allow low-level mocks
- 8b76a37: Fix `.$stale` in initial state, now it is `true`
- 25c051f: Fix error type of _Mutations_ and _Queries_ create by `createJson*` factories
- 90be139: Add utility types for _Remote Operations_ to public API
- c9766d0: Fix type inference of `attachOperation`

## 0.7.2

### Patch Changes

- be8bb8b: Return null for empty response without header in `createJson*`

## 0.7.1

### Patch Changes

- f1afd34: Add a response field in invalid data error

## 0.7.0

### Minor Changes

- 294f0ae: Add `name` field to meta of any _RemoteOperation_
- 7fd0c57: Share `inMemoryCache` between scopes, do not block `allSettled` in it
- 2116b36: Use `name` of a _Query_ as a part of key in `cache` in case of absent `sid` and uniq `name`
- 942cbf2: Allow to override `credentials` in `createJsonQuery` and `createJsonMutation`
- 79593c6: Make `unset` method of custom `cache` adapter required

## 0.6.4

### Patch Changes

- 5da04bf: Fix type inference in `createQuery` in `effect` and `mapData` overload

## 0.6.3

## 0.6.2

### Patch Changes

- 05b4860: Fix `cache` invalidation after `update`

## 0.6.1

### Patch Changes

- c2b67a6: Fix `cache` overlapping in `createJsonQuery`

## 0.6.0

### Minor Changes

- 521834d: Allow passing abort signal to `createJsonQuery` and `createJsonMutation`
- f7def6f: Ignore `params` while `cache` `createJsonQuery` to decrease number of cache misses
- b57c5ee: Add `attachOperation` operator
- c2431af: Parse response in `httpError` in `createJson*` as JSON
- b57c5ee: Expose `initialData` in _Query_ meta

### Patch Changes

- fa4a40f: Return `null` for empty response in `createJsonApiRequest` instead of `preparationError`

## 0.5.1

### Patch Changes

- 2ad92fb: Do not use value from `cache` on refetch after `update`

## 0.5.0

### Minor Changes

- 57abab2: Add config `concurrency.strategy` for `createJsonQuery` factory
- dcbdcaa: Support more formats in _Time_
- e914ba2: Add operator `update` to connect _Query_ and _Mutation_
- 127f78a: Pass params of source _Queries_ to `fn` in `connectQuery`
- e0802dd: Support `@@unitShape` protocol of Effector

### Patch Changes

- e52935e: Do not stop _Query_ after trying to `cache` entry with invalid key
- 41096d5: Decreased number of cache misses
- d32d69f: Skip in-flight _Query_ and _Mutation_ while disabling
- 41096d5: Do not try to serialize unserializable params during `cache`

## 0.4.1

### Patch Changes

- 9fb4ead: Export DynamicallySourcedField type
- b175216: Export FetchingStatus type

## 0.4.0

### Minor Changes

- 77a3832: Decrease bundle size by 36 percent
- a413bf9: Get rid of patronum, inline required functions
- 1638921: Change signature of mapper in `mapData` to be consistent with `.finished.*` _Events_
- d6ab20b: Change signature of Validator to be consistent with `.finished.*` _Events_
- dbd6fee: Change signature of `.finished.success` to be consistent with `.done` of _Effect_
- d92411c: Sync versions of all packages
- 6521bc7: Change signature of mapper in `connectQuery` to add more info about parents in future
- f6fbc4f: Remove deprecated overload of `retry`
- 90102e8: Add `TAKE_FIRST` strategy in concurrency settings of internal createApiRequest

### Patch Changes

- 8bb8bce: Get rid of @farfetched/misc, inline functions
- 3280ab9: Hide private types from published package

## 0.3.5

### Patch Changes

- 7cc84da: Fix incorrect cache saving in `cache` on _Query_ with `mapData`

## 0.3.4

### Patch Changes

- ffee151: Do not throw error on initializing stage for browser-only cache adapters in node-env

## 0.3.3

### Patch Changes

- 733c0dd: Fix incorrect typings of `cache` operator for Query with initial data

## 0.3.2

### Patch Changes

- 072aae1: Handle null values in Sourced fields

## 0.3.1

### Patch Changes

- 7498a4a: Remove dependency added by mistake — `runtypes`

## 0.3.0

### Minor Changes

- d1b5f5a: Add `cache` operator
- d1b5f5a: Allow passing Time as a `delay` in `retry`
- d1b5f5a: Add `sessionStorageCache` adapter
- d1b5f5a: Add option `initialData` for `createJsonQuery`
- d1b5f5a: Add option `initialData` for `createQuery`
- d1b5f5a: Allow using `retry` with Mutation
- d1b5f5a: Allow setting initial data for _Query_
- d1b5f5a: Add `inMemoryCache` adapter
- d1b5f5a: Support custom serialization for `$data` in Query with Effector 22.4
- d1b5f5a: Add `voidCache` adapter
- d1b5f5a: Add `localStorageCache` adapter
- d1b5f5a: Add `externalCache` adapter

## 0.2.6

### Patch Changes

- 9e9ba85: Handle nullish values in Sourced fields

## 0.2.5

### Patch Changes

- 989891f: Fix `connectQuery` incorrect inference of argument in `fn` in some cases

## 0.2.4

### Patch Changes

- 3fc1ff3: Expose types `ValidationResult` and `Validator`

## 0.2.3

### Patch Changes

- f373689: Add ESM build
- Updated dependencies [f373689]
  - @farfetched/misc@0.1.2

## 0.2.2

### Patch Changes

- e871f8b: Do not change `$status` for disabled Queries

## 0.2.1

### Patch Changes

- b4a594a: Fix type definitions of error guards

## 0.2.0

### Minor Changes

- 7c3c78f: Add `reset` command to Query
- 0162a13: Allow skipping body in non GET/QUERY requests in `createJsonQuery`
- cb5a598: Add new factory — `createMutation`
- f26284c: Add new stores to Query — `$failed` and `$succeeded`
- cb5a598: Add new factory — `createHeadlessMutation`
- cb5a598: Add new concept — Mutation
- 1b1fca4: Add `otherwise` to `retry` that is called after all attempts are exceeded
- cb5a598: Add new factory — `createJsonMutation`

### Patch Changes

- e3a922a: Fix `createJsonQuery` return object structure, now it passes `isQuery` check
- 55c1920: Ignore non-object values in headers transformers

## 0.1.2

### Patch Changes

- b345f60: Add license to package.json
- Updated dependencies [b345f60]
  - @farfetched/misc@0.1.1

## 0.1.1

### Patch Changes

- 269334f: Add missed dependencies to package.json
