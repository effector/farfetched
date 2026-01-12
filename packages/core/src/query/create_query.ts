import { Effect } from 'effector';

import {
  createHeadlessQuery,
  SharedQueryFactoryConfig,
} from './create_headless_query';
import { Query } from './type';
import { Contract } from '../contract/type';
import { unknownContract } from '../contract/unknown_contract';
import { type DynamicallySourcedField } from '../libs/patronus';
import { InvalidDataError } from '../errors/type';
import { Validator } from '../validation/type';
import { resolveExecuteEffect } from '../remote_operation/resolve_execute_effect';

/**
 * Copy-paste from Effector's sources
 */
type OptionalParams<Args extends any[]> = Args['length'] extends 0 // does handler accept 0 arguments?
  ? void // works since TS v3.3.3
  : 0 | 1 extends Args['length'] // is the first argument optional?
    ? /**
       * Applying `infer` to a variadic arguments here we'll get `Args` of
       * shape `[T]` or `[T?]`, where T(?) is a type of handler `params`.
       * In case T is optional we get `T | undefined` back from `Args[0]`.
       * We lose information about argument's optionality, but we can make it
       * optional again by appending `void` type, so the result type will be
       * `T | undefined | void`.
       *
       * The disadvantage of this method is that we can't restore optonality
       * in case of `params?: any` because in a union `any` type absorbs any
       * other type (`any | undefined | void` becomes just `any`). And we
       * have similar situation also with the `unknown` type.
       */
      Args[0] | void
    : Args[0];

// Overload: Only handler
export function createQuery<Params extends any[], Response>(
  config: {
    handler: (...p: Params) => Promise<Response>;
  } & SharedQueryFactoryConfig<Response>
): Query<OptionalParams<Params>, Response, unknown>;

export function createQuery<Params extends any[], Response>(
  config: {
    initialData: Response;
    handler: (...p: Params) => Promise<Response>;
  } & SharedQueryFactoryConfig<Response>
): Query<OptionalParams<Params>, Response, unknown, Response>;

// Overload: Effect and MapData
export function createQuery<
  Params,
  Response,
  Error,
  MappedData,
  MapDataSource = void,
  ValidationSource = void,
>(
  config: {
    effect: Effect<Params, Response, Error>;
    mapData: DynamicallySourcedField<
      { result: Response; params: Params },
      MappedData,
      MapDataSource
    >;
    validate?: Validator<MappedData, Params, ValidationSource>;
  } & SharedQueryFactoryConfig<MappedData>
): Query<Params, MappedData, Error>;

// Overload: Only effect
export function createQuery<Params, Response, Error>(
  config: {
    effect: Effect<Params, Response, Error>;
  } & SharedQueryFactoryConfig<Response>
): Query<Params, Response, Error>;

export function createQuery<Params, Response, Error>(
  config: {
    initialData: Response;
    effect: Effect<Params, Response, Error>;
  } & SharedQueryFactoryConfig<Response>
): Query<Params, Response, Error, Response>;

// Overload: Effect and Contract
export function createQuery<
  Params,
  Response,
  Error,
  ContractData extends Response,
  ValidationSource = void,
>(
  config: {
    effect: Effect<Params, Response, Error>;
    contract: Contract<Response, ContractData>;
    validate?: Validator<ContractData, Params, ValidationSource>;
  } & SharedQueryFactoryConfig<ContractData>
): Query<Params, ContractData, Error | InvalidDataError>;

export function createQuery<
  Params,
  Response,
  Error,
  ContractData extends Response,
  ValidationSource = void,
>(
  config: {
    initialData: ContractData;
    effect: Effect<Params, Response, Error>;
    contract: Contract<Response, ContractData>;
    validate?: Validator<ContractData, Params, ValidationSource>;
  } & SharedQueryFactoryConfig<ContractData>
): Query<Params, ContractData, Error | InvalidDataError, ContractData>;

export function createQuery<
  Params,
  Response,
  Error,
  MappedData,
  MapDataSource = void,
  ValidationSource = void,
>(
  config: {
    initialData: MappedData;
    effect: Effect<Params, Response, Error>;
    mapData: DynamicallySourcedField<
      { result: Response; params: Params },
      MappedData,
      MapDataSource
    >;
    validate?: Validator<MappedData, Params, ValidationSource>;
  } & SharedQueryFactoryConfig<MappedData>
): Query<Params, MappedData, Error, MappedData>;

// Overload: Effect, Contract and MapData
export function createQuery<
  Params,
  Response,
  Error,
  ContractData extends Response,
  MappedData,
  MapDataSource = void,
  ValidationSource = void,
>(
  config: {
    effect: Effect<Params, Response, Error>;
    contract: Contract<Response, ContractData>;
    mapData: DynamicallySourcedField<
      { result: ContractData; params: Params },
      MappedData,
      MapDataSource
    >;
    validate?: Validator<ContractData, Params, ValidationSource>;
  } & SharedQueryFactoryConfig<MappedData>
): Query<Params, MappedData, Error | InvalidDataError>;

export function createQuery<
  Params,
  Response,
  Error,
  ContractData extends Response,
  MappedData,
  MapDataSource = void,
  ValidationSource = void,
>(
  config: {
    initialData: MappedData;
    effect: Effect<Params, Response, Error>;
    contract: Contract<Response, ContractData>;
    mapData: DynamicallySourcedField<
      { result: ContractData; params: Params },
      MappedData,
      MapDataSource
    >;
    validate?: Validator<ContractData, Params, ValidationSource>;
  } & SharedQueryFactoryConfig<MappedData>
): Query<Params, MappedData, Error | InvalidDataError, MappedData>;

// -- Implementation --
export function createQuery<
  Params,
  Response,
  Error,
  ContractData extends Response = Response,
  MappedData = ContractData,
  MapDataSource = void,
  ValidationSource = void,
>(
  // Use any because of overloads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
): Query<Params, MappedData, Error | InvalidDataError, MappedData> {
  const query = createHeadlessQuery<
    Params,
    Response,
    Error,
    ContractData,
    MappedData,
    any,
    MapDataSource,
    any,
    ValidationSource,
    MappedData
  >({
    initialData: config.initialData ?? null,
    contract: config.contract ?? unknownContract,
    mapData: config.mapData ?? (({ result }) => result),
    mapError: config.mapError,
    enabled: config.enabled,
    validate: config.validate,
    name: config.name,
    serialize: config.serialize,
  });

  query.__.executeFx.use(resolveExecuteEffect(config));

  return query;
}
