import { type Json } from 'effector';

export type FarfetchedError<T extends string> = {
  errorType: T;
  explanation: string;
};

export const INVALID_DATA = 'INVALID_DATA';
export interface InvalidDataError extends FarfetchedError<typeof INVALID_DATA> {
  validationErrors: string[];
  response: unknown;
}

export const TIMEOUT = 'TIMEOUT';
export interface TimeoutError extends FarfetchedError<typeof TIMEOUT> {
  timeout: number;
}

export const ABORT = 'ABORT';
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AbortError extends FarfetchedError<typeof ABORT> {}

export const PREPARATION = 'PREPARATION';
export interface PreparationError extends FarfetchedError<typeof PREPARATION> {
  response: string;
  reason: string | null;
}

export const HTTP = 'HTTP';
export interface HttpError<
  Status extends number = number,
> extends FarfetchedError<typeof HTTP> {
  status: Status;
  statusText: string;
  response: string | Json | null;
}

export const NETWORK = 'NETWORK';
export interface NetworkError extends FarfetchedError<typeof NETWORK> {
  reason: string | null;
  cause?: unknown;
}

export const CONFIGURATION = 'CONFIGURATION';
export interface ConfigurationError extends FarfetchedError<
  typeof CONFIGURATION
> {
  validationErrors: string[];
}
