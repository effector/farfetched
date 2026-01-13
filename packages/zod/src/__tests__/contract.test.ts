import { z as zod_v3 } from 'zod/v3';
import { z as zod_v4 } from 'zod/v4';
import { z as zod_v4mini } from 'zod/v4-mini';
import { describe, test, expect } from 'vitest';

import { zodContract } from '../zod_contract';

describe('zod/zodContract short (zod v3)', () => {
  const zod = zod_v3;

  test('interprets invalid response as error', () => {
    const contract = zodContract(zod.string());

    expect(contract.getErrorMessages(2)).toMatchInlineSnapshot(`
      [
        "Expected string, received number",
      ]
    `);
  });

  test('passes valid data', () => {
    const contract = zodContract(zod.string());

    expect(contract.getErrorMessages('foo')).toEqual([]);
  });

  test('isData passes for valid data', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.string(),
      })
    );

    expect(
      contract.isData({
        x: 42,
        y: 'answer',
      })
    ).toEqual(true);
  });

  test('isData does not pass for invalid data', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.string(),
      })
    );

    expect(
      contract.isData({
        42: 'x',
        answer: 'y',
      })
    ).toEqual(false);
  });

  test('interprets complex invalid response as error', () => {
    const contract = zodContract(
      zod.tuple([
        zod.object({
          x: zod.number(),
          y: zod.literal(true),
          k: zod
            .set(zod.string())
            .nonempty('Invalid set, expected set of strings'),
        }),
        zod.literal('Uhm?'),
        zod.literal(42),
      ])
    );

    expect(
      contract.getErrorMessages([
        {
          x: 456,
          y: false,
          k: new Set(),
        },
        'Answer is:',
        '42',
      ])
    ).toMatchInlineSnapshot(`
      [
        "Invalid literal value, expected true, path: 0.y",
        "Invalid set, expected set of strings, path: 0.k",
        "Invalid literal value, expected "Uhm?", path: 1",
        "Invalid literal value, expected 42, path: 2",
      ]
    `);
  });

  test('path from original zod error included in final message', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.object({
          z: zod.string(),
          k: zod.object({
            j: zod.boolean(),
          }),
        }),
      })
    );

    expect(
      contract.getErrorMessages({
        x: '42',
        y: {
          z: 123,
          k: {
            j: new Map(),
          },
        },
      })
    ).toMatchInlineSnapshot(`
      [
        "Expected number, received string, path: x",
        "Expected string, received number, path: y.z",
        "Expected boolean, received map, path: y.k.j",
      ]
    `);
  });
});

describe('zod/zodContract short (zod v4)', () => {
  const zod = zod_v4;

  test('interprets invalid response as error', () => {
    const contract = zodContract(zod.string());

    expect(contract.getErrorMessages(2)).toMatchInlineSnapshot(`
      [
        "Invalid input: expected string, received number",
      ]
    `);
  });

  test('passes valid data', () => {
    const contract = zodContract(zod.string());

    expect(contract.getErrorMessages('foo')).toEqual([]);
  });

  test('isData passes for valid data', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.string(),
      })
    );

    expect(
      contract.isData({
        x: 42,
        y: 'answer',
      })
    ).toEqual(true);
  });

  test('isData does not pass for invalid data', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.string(),
      })
    );

    expect(
      contract.isData({
        42: 'x',
        answer: 'y',
      })
    ).toEqual(false);
  });

  test('interprets complex invalid response as error', () => {
    const contract = zodContract(
      zod.tuple([
        zod.object({
          x: zod.number(),
          y: zod.literal(true),
          k: zod
            .set(zod.string())
            .nonempty('Invalid input: expected set of strings'),
        }),
        zod.literal('Uhm?'),
        zod.literal(42),
      ])
    );

    expect(
      contract.getErrorMessages([
        {
          x: 456,
          y: false,
          k: new Set(),
        },
        'Answer is:',
        '42',
      ])
    ).toMatchInlineSnapshot(`
      [
        "Invalid input: expected true, path: 0.y",
        "Invalid input: expected set of strings, path: 0.k",
        "Invalid input: expected "Uhm?", path: 1",
        "Invalid input: expected 42, path: 2",
      ]
    `);
  });

  test('path from original zod error included in final message', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.object({
          z: zod.string(),
          k: zod.object({
            j: zod.boolean(),
          }),
        }),
      })
    );

    expect(
      contract.getErrorMessages({
        x: '42',
        y: {
          z: 123,
          k: {
            j: new Map(),
          },
        },
      })
    ).toMatchInlineSnapshot(`
      [
        "Invalid input: expected number, received string, path: x",
        "Invalid input: expected string, received number, path: y.z",
        "Invalid input: expected boolean, received Map, path: y.k.j",
      ]
    `);
  });
});

describe('zod/zodContract short (zod v4-mini)', () => {
  const zod = zod_v4mini;

  test('interprets invalid response as error', () => {
    const contract = zodContract(zod.string());

    expect(contract.getErrorMessages(2)).toMatchInlineSnapshot(`
      [
        "Invalid input: expected string, received number",
      ]
    `);
  });

  test('passes valid data', () => {
    const contract = zodContract(zod.string());

    expect(contract.getErrorMessages('foo')).toEqual([]);
  });

  test('isData passes for valid data', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.string(),
      })
    );

    expect(
      contract.isData({
        x: 42,
        y: 'answer',
      })
    ).toEqual(true);
  });

  test('isData does not pass for invalid data', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.string(),
      })
    );

    expect(
      contract.isData({
        42: 'x',
        answer: 'y',
      })
    ).toEqual(false);
  });

  test('interprets complex invalid response as error', () => {
    const contract = zodContract(
      zod.tuple([
        zod.object({
          x: zod.number(),
          y: zod.literal(true),
          k: zod.set(zod.string(), {
            error: 'Invalid input: expected set of strings',
          }),
        }),
        zod.literal('Uhm?'),
        zod.literal(42),
      ])
    );

    expect(
      contract.getErrorMessages([
        {
          x: 456,
          y: false,
          k: new Map(),
        },
        'Answer is:',
        '42',
      ])
    ).toMatchInlineSnapshot(`
      [
        "Invalid input: expected true, path: 0.y",
        "Invalid input: expected set of strings, path: 0.k",
        "Invalid input: expected "Uhm?", path: 1",
        "Invalid input: expected 42, path: 2",
      ]
    `);
  });

  test('path from original zod error included in final message', () => {
    const contract = zodContract(
      zod.object({
        x: zod.number(),
        y: zod.object({
          z: zod.string(),
          k: zod.object({
            j: zod.boolean(),
          }),
        }),
      })
    );

    expect(
      contract.getErrorMessages({
        x: '42',
        y: {
          z: 123,
          k: {
            j: new Map(),
          },
        },
      })
    ).toMatchInlineSnapshot(`
      [
        "Invalid input: expected number, received string, path: x",
        "Invalid input: expected string, received number, path: y.z",
        "Invalid input: expected boolean, received Map, path: y.k.j",
      ]
    `);
  });
});
