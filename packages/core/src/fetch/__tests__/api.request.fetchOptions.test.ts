import { allSettled, createStore, fork } from 'effector';
import { describe, test, expect, vi } from 'vitest';

import { createApiRequest, type FetchOptions } from '../api';
import { fetchFx } from '../fetch';

describe('fetch/api.request.fetchOptions', () => {
  // Does not matter
  const mapBody = () => 'any body';
  const url = 'https://api.salo.com';
  const method = 'GET';

  // Does not matter
  const response = {
    extract: async <T>(v: T) => v,
  };

  test('pass static fetchOptions on creation to request', async () => {
    const callApiFx = createApiRequest({
      request: {
        mapBody,
        method,
        url,
        fetchOptions: {
          mode: 'cors',
          cache: 'no-cache',
          referrerPolicy: 'no-referrer',
        },
      },
      response,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('test'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(callApiFx, { scope, params: {} });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.mode).toEqual('cors');
    expect(request.cache).toEqual('no-cache');
    expect(request.referrerPolicy).toEqual('no-referrer');
  });

  test('pass reactive fetchOptions on creation to request', async () => {
    const $fetchOptions = createStore<FetchOptions>({
      mode: 'cors',
      cache: 'no-cache',
    });

    const callApiFx = createApiRequest({
      request: { mapBody, method, url, fetchOptions: $fetchOptions },
      response,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('test'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    // with original value
    await allSettled(callApiFx, { scope, params: {} });
    let request = fetchMock.mock.calls[0][0] as Request;
    expect(request.mode).toEqual('cors');
    expect(request.cache).toEqual('no-cache');

    // with new value
    await allSettled($fetchOptions, {
      scope,
      params: { mode: 'no-cors', cache: 'force-cache' },
    });
    await allSettled(callApiFx, { scope, params: {} });
    request = fetchMock.mock.calls[1][0] as Request;
    expect(request.mode).toEqual('no-cors');
    expect(request.cache).toEqual('force-cache');
  });

  test('top-level credentials takes precedence over fetchOptions.credentials', async () => {
    const callApiFx = createApiRequest({
      request: {
        mapBody,
        method,
        url,
        credentials: 'include',
        fetchOptions: {
          credentials: 'omit',
          cache: 'no-cache',
        },
      },
      response,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('test'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(callApiFx, { scope, params: {} });

    const request = fetchMock.mock.calls[0][0] as Request;
    // top-level credentials should win
    expect(request.credentials).toEqual('include');
    // other fetchOptions should still apply
    expect(request.cache).toEqual('no-cache');
  });

  test('fetchOptions.credentials is used when top-level credentials is not set', async () => {
    const callApiFx = createApiRequest({
      request: {
        mapBody,
        method,
        url,
        fetchOptions: {
          credentials: 'include',
        },
      },
      response,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('test'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(callApiFx, { scope, params: {} });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.credentials).toEqual('include');
  });

  test('pass fetchOptions with keepalive option', async () => {
    const callApiFx = createApiRequest({
      request: {
        mapBody,
        method,
        url,
        fetchOptions: {
          keepalive: true,
        },
      },
      response,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('test'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(callApiFx, { scope, params: {} });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.keepalive).toEqual(true);
  });

  test('pass fetchOptions with redirect option', async () => {
    const callApiFx = createApiRequest({
      request: {
        mapBody,
        method,
        url,
        fetchOptions: {
          redirect: 'manual',
        },
      },
      response,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('test'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(callApiFx, { scope, params: {} });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.redirect).toEqual('manual');
  });

  test('pass fetchOptions with integrity option', async () => {
    const integrityValue =
      'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC';

    const callApiFx = createApiRequest({
      request: {
        mapBody,
        method,
        url,
        fetchOptions: {
          integrity: integrityValue,
        },
      },
      response,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('test'));

    const scope = fork({ handlers: [[fetchFx, fetchMock]] });

    await allSettled(callApiFx, { scope, params: {} });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.integrity).toEqual(integrityValue);
  });
});
