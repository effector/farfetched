import { type ZodType as ZodTypeV3 } from 'zod/v3';
import { type $ZodType as ZodTypeV4, safeParse } from 'zod/v4/core';
import { type Contract } from '@farfetched/core';

/**
 * Transforms Zod contracts for `data` to internal Contract.
 * Any response which does not conform to `data` will be treated as error.
 *
 * @param {ZodTypeV3} data Zod Contract for valid data
 */
function zodContract<T>(
  data: ZodTypeV3<T> | ZodTypeV4<T>
): Contract<unknown, T> {
  function isData(prepared: unknown): prepared is T {
    if ("_zod" in data) return safeParse(data, prepared).success;
    return data.safeParse(prepared).success;
  }

  return {
    isData,
    getErrorMessages(raw) {
      const validation = ("_zod" in data)
        ? safeParse(data, raw)
        : data.safeParse(raw);
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
