import { allSettled, createStore, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { createJsonQuery } from '../create_json_query';
import { unknownContract } from '../../contract/unknown_contract';
import { fetchFx } from '../../fetch/fetch';
import { type FetchOptions } from '../../fetch/api';

describe('remote_data/query/json.request.fetch', () => {
  test('pass static fetch to request', async () => {
    const query = createJsonQuery({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'GET' as const,
        fetch: {
          mode: 'cors',
          cache: 'no-cache',
          referrerPolicy: 'no-referrer',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(query.start, { scope });

    expect(fetchMock).toBeCalledTimes(1);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.mode).toEqual('cors');
    expect(request.cache).toEqual('no-cache');
    expect(request.referrerPolicy).toEqual('no-referrer');
  });

  test('pass reactive fetch to request', async () => {
    const $fetch = createStore<FetchOptions>({
      mode: 'cors',
      cache: 'no-cache',
    });

    const query = createJsonQuery({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'GET' as const,
        fetch: $fetch,
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    // with original value
    await allSettled(query.start, { scope });
    let request = fetchMock.mock.calls[0][0] as Request;
    expect(request.mode).toEqual('cors');
    expect(request.cache).toEqual('no-cache');

    // with new value
    await allSettled($fetch, {
      scope,
      params: { mode: 'no-cors', cache: 'force-cache' },
    });
    await allSettled(query.start, { scope });
    request = fetchMock.mock.calls[1][0] as Request;
    expect(request.mode).toEqual('no-cors');
    expect(request.cache).toEqual('force-cache');
  });

  test('top-level credentials takes precedence over fetch.credentials', async () => {
    const query = createJsonQuery({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'GET' as const,
        credentials: 'include',
        fetch: {
          credentials: 'omit',
          cache: 'no-cache',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(query.start, { scope });

    const request = fetchMock.mock.calls[0][0] as Request;
    // top-level credentials should win
    expect(request.credentials).toEqual('include');
    // other fetch should still apply
    expect(request.cache).toEqual('no-cache');
  });

  test('fetch.credentials is used when top-level credentials is not set', async () => {
    const query = createJsonQuery({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'GET' as const,
        fetch: {
          credentials: 'include',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(query.start, { scope });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.credentials).toEqual('include');
  });

  test('pass fetch with keepalive option', async () => {
    const query = createJsonQuery({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'GET' as const,
        fetch: {
          keepalive: true,
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(query.start, { scope });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.keepalive).toEqual(true);
  });

  test('pass fetch with redirect option', async () => {
    const query = createJsonQuery({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'GET' as const,
        fetch: {
          redirect: 'manual',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(query.start, { scope });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.redirect).toEqual('manual');
  });
});
