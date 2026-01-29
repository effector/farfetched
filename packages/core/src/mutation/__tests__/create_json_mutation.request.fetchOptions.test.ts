import { allSettled, createStore, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { createJsonMutation } from '../create_json_mutation';
import { unknownContract } from '../../contract/unknown_contract';
import { fetchFx } from '../../fetch/fetch';
import { type FetchOptions } from '../../fetch/api';

describe('remote_data/mutation/json.request.fetchOptions', () => {
  test('pass static fetchOptions to request', async () => {
    const mutation = createJsonMutation({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'POST' as const,
        fetchOptions: {
          mode: 'cors',
          cache: 'no-cache',
          referrerPolicy: 'no-referrer',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(mutation.start, { scope });

    expect(fetchMock).toBeCalledTimes(1);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.mode).toEqual('cors');
    expect(request.cache).toEqual('no-cache');
    expect(request.referrerPolicy).toEqual('no-referrer');
  });

  test('pass reactive fetchOptions to request', async () => {
    const $fetchOptions = createStore<FetchOptions>({
      mode: 'cors',
      cache: 'no-cache',
    });

    const mutation = createJsonMutation({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'POST' as const,
        fetchOptions: $fetchOptions,
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    // with original value
    await allSettled(mutation.start, { scope });
    let request = fetchMock.mock.calls[0][0] as Request;
    expect(request.mode).toEqual('cors');
    expect(request.cache).toEqual('no-cache');

    // with new value
    await allSettled($fetchOptions, {
      scope,
      params: { mode: 'no-cors', cache: 'force-cache' },
    });
    await allSettled(mutation.start, { scope });
    request = fetchMock.mock.calls[1][0] as Request;
    expect(request.mode).toEqual('no-cors');
    expect(request.cache).toEqual('force-cache');
  });

  test('top-level credentials takes precedence over fetchOptions.credentials', async () => {
    const mutation = createJsonMutation({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'POST' as const,
        credentials: 'include',
        fetchOptions: {
          credentials: 'omit',
          cache: 'no-cache',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(mutation.start, { scope });

    const request = fetchMock.mock.calls[0][0] as Request;
    // top-level credentials should win
    expect(request.credentials).toEqual('include');
    // other fetchOptions should still apply
    expect(request.cache).toEqual('no-cache');
  });

  test('fetchOptions.credentials is used when top-level credentials is not set', async () => {
    const mutation = createJsonMutation({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'POST' as const,
        fetchOptions: {
          credentials: 'include',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(mutation.start, { scope });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.credentials).toEqual('include');
  });

  test('pass fetchOptions with keepalive option', async () => {
    const mutation = createJsonMutation({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'POST' as const,
        fetchOptions: {
          keepalive: true,
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(mutation.start, { scope });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.keepalive).toEqual(true);
  });

  test('pass fetchOptions with redirect option', async () => {
    const mutation = createJsonMutation({
      response: { contract: unknownContract },
      request: {
        url: 'http://api.salo.com',
        method: 'POST' as const,
        fetchOptions: {
          redirect: 'manual',
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(mutation.start, { scope });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.redirect).toEqual('manual');
  });
});
