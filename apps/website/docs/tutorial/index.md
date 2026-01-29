# Farfetched

:::tip

Farfetched 1.0 is scheduled for release in the end of 2024. All future releases before it would be focused on API clean up and stability improvements. Please, read [Releases policy](/statements/releases) and [Roadmap](/roadmap) to get more details.

:::

Farfetched is a **missing data-fetching library for frontend**, in more technical terms, it makes fetching, caching, synchronizing and updating server state in your web applications a breeze.

## Why Farfetched?

Let's imagine that you can a pretty simple task: fetch a list of items from the server. And we have to add some extras — validate responses because server can be unreliable, retries in case of network errors, and so on. It's not a big deal, but it's a lot of boilerplate code that you have to write every time you need to fetch something.

::: details Here is how you can do it without Farfetched

```js
async function fetchItems() {
  const response = await fetch('/api/items', {
    method: 'GET',
  });
  if (!reponse.ok) {
    throw new Error('Failed to fetch');
  }
  const parsed = await response.json(); // Can be failed
  const valid = validateAgainsContract(parsed, ItemsResponseContract);
  if (!valid) {
    throw new Error('Invalid response');
  }
  return parsed;
}

let attempt = 0;

async function start(ids) {
  try {
    const items = await fetchItemsByIds(ids);
    return items;
  } catch (error) {
    if (attemptForItems < 3 && error.message === 'Failed to fetch') {
      attemptForItems += 1;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return start(ids);
    } else {
      throw error;
    }
  }
}

start()
  .then((items) => {
    console.log('YEAH', items);
  })
  .catch((error) => {
    console.error('OH NO', error);
  });
```

:::

Let's see how it looks with Farfetched:

::: details Same code with Farfetched

```js
import { createJsonQuery, isNetworkError, retry } from '@farfetched/core';

const itemsQuery = createJsonQuery({
  request: { url: '/api/items', method: 'GET' },
  response: { contract: ItemsResponseContract },
});

retry(itemsQuery, {
  times: 3,
  delay: 1000,
  filter: isNetworkError,
});

itemsQuery.finished.success.watch((items) => {
  console.log('YEAH', items);
});
itemsQuery.finished.error.watch((error) => {
  console.error('OH NO', error);
});

itemsQuery.refresh();
```

:::

Pretty cool, right? We love it, and we hope you will too. Read on to learn more about Farfetched.

## What's next?

- Learn Farfetched at your own pace with our amazingly [Thorough Tutorial](/tutorial/install)
- Read framework-specific recommendations for [Solid](/tutorial/solid/) and [React](/tutorial/react/)
- Learn about step-by-step adoption of Farfetched for existing applications which uses different tools for data fetching:
  - [Effector's _Effects_](/tutorial/migrate/effector/)
- See the whole picture in [API reference](/api/)
- Check out Farfetched's [roadmap](/roadmap) to stay in the same wavelength with us
