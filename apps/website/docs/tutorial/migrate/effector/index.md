# Migration to Farfetched from plain _Effects_

This tutorial describes how to add Farfetched to an existing application uses [_Effects_](https://effector.dev/docs/api/effector/effect) for data fetching step by step without rewriting big parts of the codebase.

::: tip
This tutorial is not a replacement for the [Thorough Tutorial](/tutorial/install) which is a better starting point for learning Farfetched. Furthermore, it is assumed that you have read [Thorough Tutorial](/tutorial/install) and know the basics of Farfetched.
:::

Farfetched is built with continues adoption in mind, so there are straightforward steps to add it to an existing application and embrace its benefits:

1. [Wrap existing data fetching _Effects_](/tutorial/migrate/effector/wrap) to _Queries_ and _Mutations_
2. [Replace existing add-ons with Farfetched](/tutorial/migrate/effector/addons) operators like `retry`, `cache` or `connectQuery`
3. [Add strict _Contracts_](/tutorial/migrate/effector/contracts) to server responses
4. [Migrate to specific factories](/tutorial/migrate/effector/specific_factories) like `createJsonQuery` and `createJsonMutation`
5. [Apply declarative approach](/tutorial/migrate/effector/trigger_api) with Trigger API and `keepFresh` operator
6. [Continue migrating application step-by-step](/tutorial/migrate/effector/next)
