import { describe, test, expectTypeOf } from 'vitest';
import { z as zodV3 } from 'zod/v3';

import { zodContract } from '../zod_contract';

describe('zodContract (zod v3)', () => {
  test('string', () => {
    const stringContract = zodContract(zodV3.string());

    const smth: unknown = null;

    if (stringContract.isData(smth)) {
      expectTypeOf(smth).toEqualTypeOf<string>();
      expectTypeOf(smth).not.toEqualTypeOf<number>();
    }
  });

  test('complex object', () => {
    const complexContract = zodContract(
      zodV3.tuple([
        zodV3.object({
          x: zodV3.number(),
          y: zodV3.literal(false),
          k: zodV3.set(zodV3.string()),
        }),
        zodV3.literal('literal'),
        zodV3.literal(42),
      ])
    );

    const smth: unknown = null;

    if (complexContract.isData(smth)) {
      expectTypeOf(smth).toEqualTypeOf<
        [
          {
            x: number;
            y: false;
            k: Set<string>;
          },
          'literal',
          42,
        ]
      >();

      expectTypeOf(smth).not.toEqualTypeOf<number>();

      expectTypeOf(smth).not.toEqualTypeOf<
        [
          {
            x: string;
            y: false;
            k: Set<string>;
          },
          'literal',
          42,
        ]
      >();
    }
  });

  test('branded type', () => {
    const BrandedContainer = zodV3.object({
      branded: zodV3.string().brand<'Branded'>(),
    });
    const brandedContract = zodContract(BrandedContainer);

    const smth: unknown = { branded: 'branded' };

    if (brandedContract.isData(smth)) {
      expectTypeOf(smth).toEqualTypeOf<zodV3.infer<typeof BrandedContainer>>();
    }
  });
});
