import { type ZodType as ZodTypeV3, type TypeOf as TypeOfV3 } from 'zod/v3';
import {
  type $ZodType as ZodTypeV4,
  type output as TypeOfV4,
  safeParse,
} from 'zod/v4/core';
import { type Contract } from '@farfetched/core';

type ZodAnyType = ZodTypeV3 | ZodTypeV4;
type Output<T extends ZodAnyType> = T extends ZodTypeV4
  ? TypeOfV4<T>
  : T extends ZodTypeV3
    ? TypeOfV3<T>
    : never;

/**
 * Transforms Zod contracts for `data` to internal Contract.
 * Any response which does not conform to `data` will be treated as error.
 *
 * @param {ZodTypeV3 | ZodTypeV4} data Zod Contract for valid data
 */
function zodContract<T extends ZodAnyType>(
  data: T
): Contract<unknown, Output<T>> {
  function isData(prepared: unknown): prepared is Output<T> {
    if ('_zod' in data) return safeParse(data, prepared).success;
    return data.safeParse(prepared).success;
  }

  return {
    isData,
    getErrorMessages(raw) {
      const validation =
        '_zod' in data ? safeParse(data, raw) : data.safeParse(raw);
      if (validation.success) {
        return [];
      }

      return validation.error.issues.map((e) => {
        const path = e.path.join('.');
        return path !== '' ? `${e.message}, path: ${path}` : e.message;
      });
    },
  };
}

export { zodContract };
