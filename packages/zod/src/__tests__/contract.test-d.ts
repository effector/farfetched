import { describe, test, expectTypeOf } from 'vitest';
import { z as zodV3 } from 'zod/v3';
import { z as zodV4 } from 'zod/v4';
import { z as zodV4mini } from 'zod/v4-mini';

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

describe('zodContract (zod v4)', () => {
  test('string', () => {
    const stringContract = zodContract(zodV4.string());

    const smth: unknown = null;

    if (stringContract.isData(smth)) {
      expectTypeOf(smth).toEqualTypeOf<string>();
      expectTypeOf(smth).not.toEqualTypeOf<number>();
    }
  });

  test('complex object', () => {
    const complexContract = zodContract(
      zodV4.tuple([
        zodV4.object({
          x: zodV4.number(),
          y: zodV4.literal(false),
          k: zodV4.set(zodV4.string()),
        }),
        zodV4.literal('literal'),
        zodV4.literal(42),
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
    const BrandedContainer = zodV4.object({
      branded: zodV4.string().brand<'Branded'>(),
    });
    const brandedContract = zodContract(BrandedContainer);

    const smth: unknown = { branded: 'branded' };

    if (brandedContract.isData(smth)) {
      expectTypeOf(smth).toEqualTypeOf<zodV4.infer<typeof BrandedContainer>>();
    }
  });
});

describe('zodContract (zod v4-mini)', () => {
  test('string', () => {
    const stringContract = zodContract(zodV4mini.string());

    const smth: unknown = null;

    if (stringContract.isData(smth)) {
      expectTypeOf(smth).toEqualTypeOf<string>();
      expectTypeOf(smth).not.toEqualTypeOf<number>();
    }
  });

  test('complex object', () => {
    const complexContract = zodContract(
      zodV4mini.tuple([
        zodV4mini.object({
          x: zodV4mini.number(),
          y: zodV4mini.literal(false),
          k: zodV4mini.set(zodV4mini.string()),
        }),
        zodV4mini.literal('literal'),
        zodV4mini.literal(42),
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
    const BrandedContainer = zodV4mini.object({
      branded: zodV4mini.string().brand<'Branded'>(),
    });
    const brandedContract = zodContract(BrandedContainer);

    const smth: unknown = { branded: 'branded' };

    if (brandedContract.isData(smth)) {
      expectTypeOf(smth).toEqualTypeOf<
        zodV4mini.infer<typeof BrandedContainer>
      >();
    }
  });
});
