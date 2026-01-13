import { type Store, type EventCallable } from 'effector';
import { type RemoteOperation } from '../remote_operation/type';

export const MutationSymbol = Symbol('Mutation');

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Mutation<Params, Data, Error> extends RemoteOperation<
  Params,
  Data,
  Error,
  {}
> {
  '@@unitShape': () => {
    start: EventCallable<Params>;
    pending: Store<boolean>;
  };
}

export function isMutation(value: any): value is Mutation<any, any, any> {
  return value?.__?.kind === MutationSymbol;
}
