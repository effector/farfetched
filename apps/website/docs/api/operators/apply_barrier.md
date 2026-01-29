# `applyBarrier` <Badge type="tip" text="since v0.11" />

Applies the [_Barrier_](/api/primitives/barrier) to the [_Query_](/api/primitives/query) or [_Mutation_](/api/primitives/mutation). After operation start it checks the [_Barrier_](/api/primitives/barrier) `.$active` status and postpones the execution if the [_Barrier_](/api/primitives/barrier) is active. After the [_Barrier_](/api/primitives/barrier) is `deactivated`, it resumes the execution of the operation.

## Formulae

### `applyBarrier(operation, config)`

```ts
import { applyBarrier } from '@farfetched/core';

applyBarrier(operation, config);
```

Operation could be a [_Query_](/api/primitives/query) or a [_Mutation_](/api/primitives/mutation) to apply the [_Barrier_](/api/primitives/barrier) to.

Config fields:

- `barrier` - [_Barrier_](/api/primitives/barrier) to apply.
- `suppressIntermediateFailures?` - _boolean_ whether to suppress intermediate failures or not, defaults to `false`. If `true`, then the operation will be marked as failed after the first fail.

### `applyBarrier(operations, config)` <Badge type="tip" text="since v0.12" />

```ts
import { applyBarrier } from '@farfetched/core';

applyBarrier([operation1, operation2], config);
```

Operations is an array of [_Queries_](/api/primitives/query) or [_Mutations_](/api/primitives/mutation) to apply the [_Barrier_](/api/primitives/barrier) to.

Config fields:

- same as [previous formula](/api/operators/apply_barrier#applybarrier-operation-config).
