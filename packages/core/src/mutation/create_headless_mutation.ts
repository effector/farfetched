import { createRemoteOperation } from '../remote_operation/create_remote_operation';
import {
  readonly,
  type DynamicallySourcedField,
  type StaticOrReactive,
  getFactoryName,
} from '../libs/patronus';
import { type Mutation, MutationSymbol } from './type';
import { type Contract } from '../contract/type';
import { type InvalidDataError } from '../errors/type';
import { type Validator } from '../validation/type';

export interface SharedMutationFactoryConfig {
  name?: string;
  enabled?: StaticOrReactive<boolean>;
}

export function createHeadlessMutation<
  Params,
  Data,
  ContractData extends Data,
  MappedData,
  Error,
  MappedError = Error | InvalidDataError,
  MapDataSource = void,
  MapErrorSource = void,
  ValidationSource = void,
>(
  config: SharedMutationFactoryConfig & {
    contract: Contract<Data, ContractData>;
    validate?: Validator<ContractData, Params, ValidationSource>;
    mapData: DynamicallySourcedField<
      { result: ContractData; params: Params },
      MappedData,
      MapDataSource
    >;
    mapError?: DynamicallySourcedField<
      { error: Error | InvalidDataError; params: Params; headers?: Headers },
      MappedError,
      MapErrorSource
    >;
  }
): Mutation<Params, MappedData, MappedError> {
  const { name, enabled, contract, validate, mapData, mapError } = config;

  const operation = createRemoteOperation<
    Params,
    Data,
    ContractData,
    MappedData,
    Error,
    MappedError,
    null,
    MapDataSource,
    MapErrorSource,
    ValidationSource
  >({
    name: name ?? getFactoryName(),
    serialize: 'ignore',
    enabled,
    kind: MutationSymbol,
    meta: null,
    contract,
    validate,
    mapData,
    mapError,
  });

  // -- Protocols --

  const unitShape = {
    pending: operation.$pending,
    start: operation.start,
    reset: operation.reset,
  };
  const unitShapeProtocol = () => unitShape;

  // -- Public API --

  return {
    start: operation.start,
    reset: operation.reset,
    started: readonly(operation.started),
    aborted: readonly(operation.aborted),
    $status: readonly(operation.$status),
    $idle: readonly(operation.$idle),
    $pending: readonly(operation.$pending),
    $succeeded: readonly(operation.$succeeded),
    $failed: readonly(operation.$failed),
    $finished: readonly(operation.$finished),
    $enabled: readonly(operation.$enabled),
    finished: {
      success: readonly(operation.finished.success),
      failure: readonly(operation.finished.failure),
      finally: readonly(operation.finished.finally),
      skip: readonly(operation.finished.skip),
    },
    __: operation.__,
    '@@unitShape': unitShapeProtocol,
  };
}
