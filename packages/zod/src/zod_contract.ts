import { type ZodType as ZodTypeV3, type TypeOf as TypeOfV3 } from 'zod/v3';
import { type Contract } from '@farfetched/core';

/**
 * Transforms Zod contracts for `data` to internal Contract.
 * Any response which does not conform to `data` will be treated as error.
 *
 * @param {ZodTypeV3} data Zod Contract for valid data
 */
function zodContract<T extends ZodTypeV3<any, any, any>>(
  data: T
): Contract<unknown, TypeOfV3<T>> {
  function isData(prepared: unknown): prepared is T {
    return data.safeParse(prepared).success;
  }

  return {
    isData,
    getErrorMessages(raw) {
      const validation = data.safeParse(raw);
      if (validation.success) {
        return [];
      }

      return validation.error.errors.map((e) => {
        const path = e.path.join('.');
        return path !== '' ? `${e.message}, path: ${path}` : e.message;
      });
    },
  };
}

export { zodContract };
