import { attach, createEffect, Effect, Event, sample } from 'effector';

import { parseTime, type Time } from '../libs/date-nfs';
import { type Query } from '../query/type';
import { inMemoryCache } from './adapters/in_memory';
import { type CacheAdapter, type CacheAdapterInstance } from './adapters/type';
import { createHumanReadbleKey, createKey, queryUniqId } from './key/key';
import { createSourcedReader } from '../libs/patronus';

interface CacheParameters {
  adapter?: CacheAdapter;
  staleAfter?: Time;
  purge?: Event<void>;
  humanReadableKeys?: boolean;
  modifyKey?: Effect<string, string>;
}

interface CacheParametersDefaulted {
  adapter: CacheAdapter;
  staleAfter?: Time;
  purge?: Event<void>;
  humanReadableKeys: boolean;
  modifyKey?: Effect<string, string>;
}

export function cache<Q extends Query<any, any, any, any>>(
  query: Q,
  rawParams?: CacheParameters
): void {
  const {
    adapter,
    staleAfter,
    purge,
    humanReadableKeys,
    modifyKey,
  }: CacheParametersDefaulted = {
    adapter: rawParams?.adapter ?? inMemoryCache(),
    humanReadableKeys: false,
    ...rawParams,
  };

  const keyCreator = humanReadableKeys ? createHumanReadbleKey : createKey;

  const id = queryUniqId(query);

  const sourcedReaders = query.__.lowLevelAPI.sourced.map(createSourcedReader);
  const readAllSourcedFx = createEffect(async (params: unknown) => {
    return Promise.all(sourcedReaders.map((readerFx) => readerFx(params)));
  });

  const modifyKeyFx = createEffect<string, string>(modifyKey ?? ((key) => key));

  const unsetFx = createEffect<
    {
      params: unknown;
      instance: CacheAdapterInstance;
    },
    void,
    any
  >(async ({ instance, params }) => {
    const sources = await readAllSourcedFx(params);
    const key = keyCreator({
      sid: id,
      params: query.__.lowLevelAPI.paramsAreMeaningless ? null : params,
      sources,
    });

    if (!key) {
      return;
    }

    const modifiedKey = await modifyKeyFx(key);

    await instance.unset({ key: modifiedKey });
  });

  const setFx = createEffect<
    {
      params: unknown;
      result: unknown;
      instance: CacheAdapterInstance;
    },
    void,
    any
  >(async ({ instance, params, result }) => {
    const sources = await readAllSourcedFx(params);

    const key = keyCreator({
      sid: id,
      params: query.__.lowLevelAPI.paramsAreMeaningless ? null : params,
      sources,
    });

    if (!key) {
      return;
    }

    const modifiedKey = await modifyKeyFx(key);

    await instance.set({ key: modifiedKey, value: result });
  });

  const getFx = createEffect<
    { params: unknown; instance: CacheAdapterInstance },
    { result: unknown; stale: boolean } | null,
    any
  >(async ({ params, instance }) => {
    const sources = await readAllSourcedFx(params);

    const key = keyCreator({
      sid: id,
      params: query.__.lowLevelAPI.paramsAreMeaningless ? null : params,
      sources,
    });

    if (!key) {
      return null;
    }
    const modifiedKey = await modifyKeyFx(key);

    const result = await instance.get({ key: modifiedKey });

    if (!result) {
      return null;
    }

    const stale = staleAfter
      ? result.cachedAt + parseTime(staleAfter!) <= Date.now()
      : true;

    return { result: result.value, stale };
  });

  const cacheDatSource = {
    name: 'cache',
    get: attach({
      source: {
        instance: adapter.__.$instance,
      },
      mapParams: ({ params }: { params: unknown }, { instance }) => ({
        params,
        instance,
      }),
      effect: getFx,
    }),
    set: attach({
      source: {
        instance: adapter.__.$instance,
      },
      mapParams: (
        { params, result }: { params: unknown; result: unknown },
        { instance }
      ) => ({
        params,
        result,
        instance,
      }),
      effect: setFx,
    }),
    unset: attach({
      source: {
        instance: adapter.__.$instance,
      },
      mapParams: ({ params }: { params: unknown }, { instance }) => ({
        instance,
        params,
      }),
      effect: unsetFx,
    }),
  };

  query.__.lowLevelAPI.dataSources.unshift(cacheDatSource);

  if (purge) {
    sample({
      clock: purge,
      source: { instance: adapter.__.$instance },
      target: createEffect(({ instance }: { instance: CacheAdapterInstance }) =>
        instance.purge()
      ),
    });
  }
}
