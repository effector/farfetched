# `update` <Badge type="tip" text="since v0.5" />

Updates [_Query_](/api/primitives/query) after [_Mutation_](/api/primitives/query) execution.

## Formulae

```ts
import { update } from '@farfetched/core';

update(query, { on, by: { success, failure } });
```

### Arguments

- `query` - [_Query_](/api/primitives/query) to update
- `on` - [_Mutation_](/api/primitives/mutation) to subscribe to
- `by.success` - [a rule](#update-rule) to update the [_Query_](/api/primitives/query) on [_Mutation_](/api/primitives/mutation) success
- `by.failure?` - [a rule](#update-rule) to update the [_Query_](/api/primitives/query) on [_Mutation_](/api/primitives/mutation) failure

## Update rule

An update rule can be either:

- a function that accepts the [_Query_](/api/primitives/query) and [_Mutation_](/api/primitives/mutation) state and returns an object for new [_Query_](/api/primitives/query) state
- an object with the following fields:
  - `source` - any external [_Store_](https://effector.dev/en/api/effector/store/)
  - `fn` - a function that accepts the [_Query_](/api/primitives/query), [_Mutation_](/api/primitives/mutation) state and current value of the `source` and returns an object for new [_Query_](/api/primitives/query) state

### Arguments

An update rule function accepts two arguments:

- `state` - an object with the following fields:
  - `query` - current [_Query_](/api/primitives/query) state
  - `mutation` - current [_Mutation_](/api/primitives/mutation) state

- `source` - current value of the `source` field of the update rule object

`state.query` and `state.mutation` have the following structure:

```ts
type QueryState =
  | null
  | {
      result: QueryResult;
      params: QueryParams;
    }
  | {
      error: QueryError;
      params: QueryParams;
    };

type MutationState =
  | {
      result: MutationResult;
      params: MutationParams;
    }
  | {
      error: MutationError;
      params: MutationParams;
    };
```

### Return value

A return value of the update rule has the following structure:

```ts
type RuleResult =
  | {
      result: QueryResult;
      refresh: boolean | { params: QueryParams };
    }
  | {
      error: QueryError;
      refresh: boolean | { params: QueryParams };
    };
```

- If `refresh` is `true`, the [_Query_](/api/primitives/query) will be immediately re-fetched with the same parameters as it was fetched before the [_Mutation_](/api/primitives/mutation) execution. If it was not fetched before, it **will not be re-fetched**.

- If `refresh` is an object, the [_Query_](/api/primitives/query) will be immediately re-fetched with the given `params`.

- While the [_Query_](/api/primitives/query) is re-fetching, it will be marked as stale.

- In case of returned `result`, it will replace the current data in the [_Query_](/api/primitives/query).

- In case of returned `error`, it will replace the current error in the [_Query_](/api/primitives/query).
