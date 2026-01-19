import {
  allSettled,
  createEvent,
  createStore,
  createWatch,
  fork,
} from 'effector';
import { setTimeout } from 'timers/promises';
import { describe, test, expect, vi } from 'vitest';

import { watchRemoteOperation } from '../../test_utils/watch_query';
import { unknownContract } from '../../contract/unknown_contract';
import { abortError } from '../../errors/create_error';
import { fetchFx } from '../../fetch/fetch';
import { createJsonMutation } from '../create_json_mutation';
import { isMutation } from '../type';
import { concurrency } from '../../concurrency/concurrency';
import { declareParams } from 'remote_operation/params';

describe('createJsonMutation', () => {
  test('isMutation', () => {
    const mutation = createJsonMutation({
      request: { url: 'https://api.salo.com', method: 'GET' },
      response: { contract: unknownContract },
    });

    expect(isMutation(mutation)).toBeTruthy();
  });

  test('start triggers executeFx', async () => {
    const mutation = createJsonMutation({
      request: { url: 'https://api.salo.com', method: 'GET' },
      response: { contract: unknownContract },
    });

    const mockFn = vi.fn();

    const scope = fork({ handlers: [[mutation.__.executeFx, mockFn]] });

    await allSettled(mutation.start, { scope });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith({
      body: null,
      headers: null,
      query: null,
      url: 'https://api.salo.com',
    });
  });

  test('pass custom headers to request', async () => {
    const mutation = createJsonMutation({
      request: {
        url: 'https://api.salo.com',
        method: 'GET',
        headers: { 'x-custom-header': 'custom' },
      },
      response: { contract: unknownContract },
    });

    const mockFn = vi.fn();

    const scope = fork({ handlers: [[mutation.__.executeFx, mockFn]] });

    await allSettled(mutation.start, { scope });

    expect(mockFn).toHaveBeenCalledWith({
      body: null,
      headers: { 'x-custom-header': 'custom' },
      query: null,
      url: 'https://api.salo.com',
    });
  });

  test('pass custom query to request', async () => {
    const mutation = createJsonMutation({
      request: {
        url: 'https://api.salo.com',
        method: 'GET',
        query: { custom: 'query' },
      },
      response: { contract: unknownContract },
    });

    const mockFn = vi.fn();

    const scope = fork({ handlers: [[mutation.__.executeFx, mockFn]] });

    await allSettled(mutation.start, { scope });

    expect(mockFn).toHaveBeenCalledWith({
      body: null,
      headers: null,
      query: { custom: 'query' },
      url: 'https://api.salo.com',
    });
  });

  test('fail mutation on invalid method', async () => {
    const mutation = createJsonMutation({
      request: {
        url: 'https://api.salo.com',
        method: 'GET' as const,
      },
      response: { contract: unknownContract, status: { expected: 201 } },
    });

    const scope = fork({
      handlers: [[fetchFx, () => new Response(null, { status: 200 })]],
    });

    const { listeners } = watchRemoteOperation(mutation, scope);

    await allSettled(mutation.start, { scope });

    expect(listeners.onFailure).toHaveBeenCalled();
    expect(listeners.onFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          errorType: 'INVALID_DATA',
          explanation:
            'Response was considered as invalid against a given contract',
          validationErrors: [
            'Expected response status has to be one of [201], got 200',
          ],
          response: null,
        },
        params: undefined,
      })
    );
  });

  test('allow empty response', async () => {
    const mutation = createJsonMutation({
      request: {
        url: 'https://api.salo.com',
        method: 'GET' as const,
      },
      response: { contract: unknownContract },
    });

    const scope = fork({
      handlers: [[fetchFx, () => new Response(null)]],
    });

    const { listeners } = watchRemoteOperation(mutation, scope);

    await allSettled(mutation.start, { scope });

    expect(listeners.onSuccess).toHaveBeenCalled();
    expect(listeners.onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        result: null,
        params: undefined,
      })
    );
  });

  test('handle 204 No Content response with DELETE method', async () => {
    const mutation = createJsonMutation({
      request: {
        url: 'https://api.salo.com/resource/123',
        method: 'DELETE' as const,
      },
      response: { contract: unknownContract },
    });

    const scope = fork({
      handlers: [[fetchFx, () => new Response(null, { status: 204 })]],
    });

    const { listeners } = watchRemoteOperation(mutation, scope);

    await allSettled(mutation.start, { scope });

    expect(listeners.onFailure).not.toHaveBeenCalled();
    expect(listeners.onSuccess).toHaveBeenCalled();
    expect(listeners.onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        result: null,
        params: undefined,
      })
    );
  });

  test('handle 204 No Content response with POST method', async () => {
    const mutation = createJsonMutation({
      request: {
        url: 'https://api.salo.com/resource',
        method: 'POST' as const,
        body: { data: 'test' },
      },
      response: { contract: unknownContract },
    });

    const scope = fork({
      handlers: [[fetchFx, () => new Response(null, { status: 204 })]],
    });

    const { listeners } = watchRemoteOperation(mutation, scope);

    await allSettled(mutation.start, { scope });

    expect(listeners.onFailure).not.toHaveBeenCalled();
    expect(listeners.onSuccess).toHaveBeenCalled();
    expect(listeners.onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        result: null,
        params: undefined,
      })
    );
  });

  test('cancel json mutation by external clock', async () => {
    const abort = createEvent();

    const mutation = createJsonMutation({
      request: { method: 'GET', url: 'https://api.salo.com' },
      response: { contract: unknownContract },
    });

    concurrency(mutation, { abortAll: abort });

    const scope = fork({
      handlers: [
        [
          // We have to mock fetchFx because executeFx contains cancellation logic
          fetchFx,
          vi.fn().mockImplementation(async () => {
            await setTimeout(100);
            throw new Error('cannot');
          }),
        ],
      ],
    });

    const { listeners } = watchRemoteOperation(mutation, scope);
    const onAbort = vi.fn();
    createWatch({ unit: mutation.aborted, fn: onAbort, scope });

    allSettled(mutation.start, { scope });
    await allSettled(abort, { scope });

    expect(listeners.onFailure).not.toBeCalled();
    expect(onAbort).toBeCalledTimes(1);
    expect(onAbort).toHaveBeenCalledWith(
      expect.objectContaining({ error: abortError() })
    );
  });

  test('pass credentials to fetch', async () => {
    const mutation = createJsonMutation({
      request: {
        method: 'GET',
        url: 'https://api.salo.com',
        credentials: 'omit',
      },
      response: { contract: unknownContract },
    });

    const fetchMock = vi.fn().mockImplementation(async () => {
      throw new Error('cannot');
    });

    const scope = fork({
      handlers: [[fetchFx, fetchMock]],
    });

    await allSettled(mutation.start, { scope });

    expect(fetchMock).toBeCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: 'omit' })
    );
  });

  describe('metaResponse', () => {
    test('simple callback', async () => {
      const mutation = createJsonMutation({
        request: {
          method: 'GET',
          url: 'https://api.salo.com',
        },
        response: {
          contract: unknownContract,
          mapData: ({ result, headers }) => {
            expect(headers?.get('X-Test')).toBe('42');

            return result;
          },
        },
      });

      // We need to mock it on transport level
      // because we can't pass meta to executeFx
      const scope = fork({
        handlers: [
          [
            fetchFx,
            () =>
              new Response(JSON.stringify({}), {
                headers: { 'X-Test': '42' },
              }),
          ],
        ],
      });

      await allSettled(mutation.start, { scope });

      expect(scope.getState(mutation.$status)).toEqual('done');
    });

    test('sourced callback', async () => {
      const mutation = createJsonMutation({
        request: {
          method: 'GET',
          url: 'https://api.salo.com',
        },
        response: {
          contract: unknownContract,
          mapData: {
            source: createStore(''),
            fn: ({ result, headers }, s) => {
              expect(headers?.get('X-Test')).toBe('42');

              return result;
            },
          },
        },
      });

      // We need to mock it on transport level
      // because we can't pass meta to executeFx
      const scope = fork({
        handlers: [
          [
            fetchFx,
            () =>
              new Response(JSON.stringify({}), {
                headers: { 'X-Test': '42' },
              }),
          ],
        ],
      });

      await allSettled(mutation.start, { scope });

      expect(scope.getState(mutation.$status)).toEqual('done');
    });

    test('do not mix meta between calls', async () => {
      const mutation = createJsonMutation({
        params: declareParams<string>(),
        request: {
          url: (params) => `http://api.salo.com/${params}`,
          method: 'GET' as const,
        },
        response: {
          contract: unknownContract,
          mapData: ({ result, params, headers }) => {
            expect(headers?.get('X-Test')).toBe(
              `http://api.salo.com/${params}`
            );

            return result;
          },
        },
      });

      // We need to mock it on transport level
      // because we can't pass meta to executeFx
      const scope = fork({
        handlers: [
          [
            fetchFx,
            (req: Request) =>
              setTimeout(1).then(
                () =>
                  new Response(JSON.stringify({}), {
                    headers: { 'X-Test': req.url },
                  })
              ),
          ],
        ],
      });

      await Promise.all([
        allSettled(mutation.start, { scope, params: '1' }),
        allSettled(mutation.start, { scope, params: '2' }),
      ]);

      expect(scope.getState(mutation.$status)).toEqual('done');
    });
  });
});
