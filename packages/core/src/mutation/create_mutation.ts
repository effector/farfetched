import { Effect } from 'effector';

import {
  createHeadlessMutation,
  SharedMutationFactoryConfig,
} from './create_headless_mutation';
import { InvalidDataError } from '../errors/type';
import { Contract } from '../contract/type';
import { Mutation } from './type';
import { resolveExecuteEffect } from '../remote_operation/resolve_execute_effect';
import { unknownContract } from '../contract/unknown_contract';
import { type DynamicallySourcedField } from '../libs/patronus';

// Overload: Only handler
export function createMutation<Params, Data>(
  config: {
    handler: (params: Params) => Promise<Data>;
  } & SharedMutationFactoryConfig
): Mutation<Params, Data, unknown>;

// Overload: Only effect
export function createMutation<Params, Data, Error>(
  config: {
    effect: Effect<Params, Data, Error>;
  } & SharedMutationFactoryConfig
): Mutation<Params, Data, Error>;

// Overload: Effect with mapError
export function createMutation<
  Params,
  Data,
  Error,
  MappedError,
  MapErrorSource = void,
>(
  config: {
    effect: Effect<Params, Data, Error>;
    mapError: DynamicallySourcedField<
      { error: Error; params: Params },
      MappedError,
      MapErrorSource
    >;
  } & SharedMutationFactoryConfig
): Mutation<Params, Data, MappedError>;

// Overload: Effect with contract
export function createMutation<Params, Data, ContractData extends Data, Error>(
  config: {
    effect: Effect<Params, Data, Error>;
    contract: Contract<Data, ContractData>;
  } & SharedMutationFactoryConfig
): Mutation<Params, ContractData, Error | InvalidDataError>;

// Overload: Effect with contract and mapError
export function createMutation<
  Params,
  Data,
  ContractData extends Data,
  Error,
  MappedError,
  MapErrorSource = void,
>(
  config: {
    effect: Effect<Params, Data, Error>;
    contract: Contract<Data, ContractData>;
    mapError: DynamicallySourcedField<
      { error: Error | InvalidDataError; params: Params },
      MappedError,
      MapErrorSource
    >;
  } & SharedMutationFactoryConfig
): Mutation<Params, ContractData, MappedError>;

// -- Implementation --
export function createMutation(
  // Use any because of overloads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
): Mutation<any, any, any> {
  const mutation = createHeadlessMutation({
    name: config.name,
    enabled: config.enabled,
    contract: config.contract ?? unknownContract,
    mapData: ({ result }) => result,
    mapError: config.mapError,
  });

  mutation.__.executeFx.use(resolveExecuteEffect(config));

  return mutation;
}
