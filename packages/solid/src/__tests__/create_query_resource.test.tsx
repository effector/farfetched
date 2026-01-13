/**
 * @vitest-environment jsdom
 */

import { allSettled, fork, sample, scopeBind } from 'effector';
import { describe, expect, test, afterEach, vi } from 'vitest';
import { ErrorBoundary, For, Suspense } from 'solid-js/web';
import { render, cleanup, screen } from '@solidjs/testing-library';
import { Provider } from 'effector-solid';
import {
  createMutation,
  createQuery,
  httpError,
  update,
} from '@farfetched/core';
import { setTimeout } from 'timers/promises';

import { createDefer } from '../defer';
import { createQueryResource } from '../create_query_resource';

describe('createQueryResource', () => {
  afterEach(cleanup);

  test('show fallback while pending', async () => {
    const defer = createDefer<any, unknown>();
    const controlledQuery = createQuery({ handler: () => defer.promise });

    const scope = fork();

    const boundStart = scopeBind(controlledQuery.start, { scope });

    function App() {
      const [data] = createQueryResource(controlledQuery);

      return (
        <Suspense fallback="Loading">
          <p>{data()}</p>
        </Suspense>
      );
    }

    render(() => (
      <Provider value={scope}>
        <App />
      </Provider>
    ));

    boundStart();

    const loadingText = await screen.findByText('Loading');
    expect(loadingText).toBeInTheDocument();

    defer.resolve('Hello');
    await allSettled(scope);

    const helloText = await screen.findByText('Hello');
    expect(helloText).toBeInTheDocument();
  });

  test('show fallback while second pending', async () => {
    const controlledQuery = createQuery({
      handler: () => setTimeout(100).then(() => 'Hello'),
    });

    const scope = fork();

    const boundStart = scopeBind(controlledQuery.start, { scope });

    function App() {
      const [data] = createQueryResource(controlledQuery);

      return (
        <Suspense fallback="Loading">
          <p>{data()}</p>
        </Suspense>
      );
    }

    render(() => (
      <Provider value={scope}>
        <App />
      </Provider>
    ));

    boundStart();

    const loadingText = await screen.findByText('Loading');
    expect(loadingText).toBeInTheDocument();

    await allSettled(scope);

    const helloText = await screen.findByText('Hello');
    expect(helloText).toBeInTheDocument();

    boundStart();
    expect(loadingText).toBeInTheDocument();

    await allSettled(scope);
    expect(helloText).toBeInTheDocument();
  });

  test('show error boundry when query failed', async () => {
    const defer = createDefer<any, unknown>();
    const controlledQuery = createQuery({ handler: () => defer.promise });

    const scope = fork();

    const boundStart = scopeBind(controlledQuery.start, { scope });

    function App() {
      const [data] = createQueryResource(controlledQuery);

      return (
        <Suspense fallback="Loading">
          <ErrorBoundary fallback={(error) => `Error: ${error}`}>
            <p>{data()}</p>
          </ErrorBoundary>
        </Suspense>
      );
    }

    render(() => (
      <Provider value={scope}>
        <App />
      </Provider>
    ));

    boundStart();

    defer.reject('WOW');
    await allSettled(scope);

    const errorText = await screen.findByText('Error: WOW');
    expect(errorText).toBeInTheDocument();
  });

  test('DO NOT show loading when query skipped', async () => {
    const controlledQuery = createQuery({
      enabled: false,
      handler: async () => 'Hello',
    });

    const scope = fork();

    function App() {
      const [data] = createQueryResource(controlledQuery);

      return (
        <Suspense fallback="Loading">
          <ErrorBoundary fallback={(error) => `Error: ${error}`}>
            <p>Weird situation</p>
            <p>{data()}</p>
          </ErrorBoundary>
        </Suspense>
      );
    }

    render(() => (
      <Provider value={scope}>
        <App />
      </Provider>
    ));

    await allSettled(controlledQuery.start, { scope });

    const insideText = await screen.findByText('Weird situation');
    expect(insideText).toBeInTheDocument();
  });

  test('show Suspense-fallback while pending and nested data', async () => {
    const defer = createDefer<{ name: string }, unknown>();
    const controlledQuery = createQuery({
      handler: () => defer.promise,
    });

    const scope = fork();

    const boundStart = scopeBind(controlledQuery.start, { scope });

    function App() {
      const [user] = createQueryResource(controlledQuery);

      return (
        <Suspense fallback="Loading">
          <p>{user()?.name}</p>
        </Suspense>
      );
    }

    render(() => (
      <Provider value={scope}>
        <App />
      </Provider>
    ));

    boundStart();

    const loadingText = await screen.findByText('Loading');
    expect(loadingText).toBeInTheDocument();
  });

  test('should work with two scopes', async () => {
    const controlledQuery = createQuery({
      handler: async ({ timeout, text }: { timeout: number; text: string }) =>
        setTimeout(timeout).then(() => text),
    });

    const correctScope = fork();
    const wrongScope = fork();

    function App() {
      const [data] = createQueryResource(controlledQuery);

      return (
        <Suspense fallback="Loading">
          <p>{data()}</p>
        </Suspense>
      );
    }

    render(() => (
      <Provider value={correctScope}>
        <App />
      </Provider>
    ));

    // Start long Query in correct scope
    allSettled(controlledQuery.start, {
      scope: correctScope,
      params: { timeout: 1000, text: 'Corrent' },
    });

    // Start short Query in wrong scope
    allSettled(controlledQuery.start, {
      scope: wrongScope,
      params: { timeout: 0, text: 'Wrong' },
    });

    // Wait for shortQuery done
    await setTimeout(10);

    // Query finished in wrong scope, correct scoped query still in progress
    expect(correctScope.getState(controlledQuery.$pending)).toBeTruthy();
    expect(wrongScope.getState(controlledQuery.$pending)).toBeFalsy();

    // Conponent bound to the correct scope
    const loadingText = await screen.findByText('Loading');
    expect(loadingText).toBeInTheDocument();

    await allSettled(correctScope);
    await allSettled(wrongScope);
  });

  test('should update when query restarted', async () => {
    const items = [1];

    const query = createQuery({
      handler: async (x: void) => [...items],
    });

    const mutation = createMutation({
      handler: async (x: void) => items.push(2),
    });

    sample({
      clock: mutation.finished.success,
      target: query.start,
    });

    const scope = fork();

    const App = () => {
      const [resource] = createQueryResource(query);

      return <For each={resource()}>{(item) => <span>{item}</span>}</For>;
    };

    render(() => (
      <Provider value={scope}>
        <App />
      </Provider>
    ));

    await allSettled(query.start, {
      scope,
    });

    expect(await screen.findByText(1)).toBeInTheDocument();

    await allSettled(mutation.start, {
      scope,
    });

    expect(await screen.findByText(2)).toBeInTheDocument();
  });

  test('query update should trigger resource', async () => {
    const defer = createDefer<any, unknown>();
    const controlledQuery = createQuery({ handler: () => defer.promise });

    const mutation = createMutation({
      handler: async () => 'Mutation success',
    });

    update(controlledQuery, {
      on: mutation,
      by: {
        success: ({ mutation: { result } }) => ({ result }),
      },
    });

    const scope = fork();

    const boundStart = scopeBind(controlledQuery.start, { scope });

    function App() {
      const [data] = createQueryResource(controlledQuery);

      return <p>{data()}</p>;
    }

    render(() => (
      <Provider value={scope}>
        <App />
      </Provider>
    ));

    boundStart();

    defer.resolve('Hello');
    await allSettled(scope);

    const helloText = await screen.findByText('Hello');
    expect(helloText).toBeInTheDocument();

    await allSettled(mutation.start, { scope, params: {} });

    const mutationText = await screen.findByText('Mutation success');
    expect(mutationText).toBeInTheDocument();
  });

  test('passes original FarfetchedError to ErrorBoundary', async () => {
    const query = createQuery({
      handler: vi.fn().mockImplementation(() => {
        throw httpError({
          status: 500,
          statusText: 'Sorry',
          response: 'Cannot',
        });
      }),
    });

    const scope = fork();

    function App() {
      const [data, { start }] = createQueryResource(query);

      return (
        <>
          <button onClick={start}>Start</button>
          <ErrorBoundary
            fallback={(error) => (
              <section>
                <div>Status: {error.status}</div>
                <div>Status Text: {error.statusText}</div>
                <div>Response: {error.response}</div>
              </section>
            )}
          >
            <p>{JSON.stringify(data(), null, 2)}</p>
          </ErrorBoundary>
        </>
      );
    }

    render(() => (
      <Provider value={scope}>
        <App />
      </Provider>
    ));

    const startButton = await screen.findByText('Start');
    startButton.click();

    await allSettled(scope);

    const statusText = await screen.findByText('Status: 500');
    expect(statusText).toBeInTheDocument();

    const statusTextText = await screen.findByText('Status Text: Sorry');
    expect(statusTextText).toBeInTheDocument();

    const responseText = await screen.findByText('Response: Cannot');
    expect(responseText).toBeInTheDocument();
  });
});
