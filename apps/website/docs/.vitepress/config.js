import { withMermaid } from 'vitepress-plugin-mermaid';
import { defineConfig } from 'vitepress';

export default withMermaid(
  defineConfig({
    lang: 'en-US',
    title: 'Farfetched',
    description: 'The advanced data fetching tool for web applications.',
    lastUpdated: true,
    head: [
      ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
      ['link', { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' }],
      ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
      ['link', { rel: 'manifest', href: '/manifest.webmanifest' }],
    ],
    themeConfig: {
      siteTitle: 'Farfetched',
      logo: '/logo.svg',
      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2022-present Igor Kamyşev',
      },
      socialLinks: [
        { icon: 'github', link: 'https://github.com/igorkamyshev/farfetched' },
        { icon: 'twitter', link: 'https://twitter.com/farfetched_dev' },
        { icon: 'discord', link: 'https://discord.gg/t8SFqZjyET' },
      ],
      algolia: {
        appId: 'E2VDGRUQY3',
        apiKey: '8dfd0f1aa677d735b609cb1d7eca1b25',
        indexName: 'farfetched',
      },
      editLink: {
        pattern:
          'https://github.com/igorkamyshev/farfetched/edit/master/apps/website/docs/:path',
      },
      nav: [
        {
          text: 'Tutorial',
          link: '/tutorial/',
          activeMatch: '^/tutorial/',
        },
        {
          text: 'Recipes',
          link: '/recipes/',
          activeMatch: '/recipes',
        },
        {
          text: 'API',
          link: '/api/',
          activeMatch: '^/(api|integrations)/',
        },
        {
          text: 'More',
          items: [
            {
              text: 'Roadmap',
              link: '/roadmap',
            },
            {
              text: 'Statements',
              link: '/statements/',
            },
            {
              text: 'Releases',
              link: '/releases/',
            },
            {
              text: 'ADRs',
              link: '/adr/',
            },
            { text: 'Effector', link: 'https://effector.dev' },
          ],
        },
      ],
      sidebar: {
        '/tutorial': [
          {
            text: 'Thorough Tutorial',
            collapsed: false,
            items: [
              { text: 'Get started', link: '/tutorial/' },
              { text: 'Installation', link: '/tutorial/install' },
              {
                text: 'Intro',
                items: [
                  { text: 'Queries', link: '/tutorial/basic_query' },
                  {
                    text: 'Mutations',
                    link: '/tutorial/basic_mutation',
                  },
                  {
                    text: 'Contracts',
                    link: '/tutorial/contracts',
                  },
                  {
                    text: 'Validators',
                    link: '/tutorial/validators',
                  },
                ],
              },
              {
                text: 'Operators',
                items: [
                  {
                    text: 'Dependent Queries',
                    link: '/tutorial/dependent_queries',
                  },
                  {
                    text: 'Update Query on Mutation',
                    link: '/tutorial/update_query',
                  },
                  { text: 'Retries', link: '/tutorial/retries' },
                  { text: 'Concurrency', link: '/tutorial/concurrency' },
                  { text: 'Caching', link: '/tutorial/caching' },
                ],
              },
              {
                text: 'Developer experience',
                link: '/tutorial/devtools',
              },
              {
                text: 'Factories',
                items: [
                  {
                    text: 'Built-in factories for Query',
                    link: '/tutorial/built_in_query_factories',
                  },
                  {
                    text: 'Built-in factories for Mutation',
                    link: '/tutorial/built_in_mutation_factories',
                  },
                ],
              },
              {
                text: 'Trigger API',
                link: '/tutorial/trigger_api',
              },
              {
                text: 'Barrier API',
                link: '/tutorial/barrier_api',
              },
            ],
          },
          {
            text: 'Solid',
            collapsed: true,
            items: [
              { text: 'Get started', link: '/tutorial/solid/' },
              { text: 'Suspense', link: '/tutorial/solid/suspense' },
              { text: 'SSR and Testing', link: '/tutorial/solid/scope' },
            ],
          },
          {
            text: 'React',
            collapsed: true,
            items: [
              { text: 'Get started', link: '/tutorial/react/' },
              { text: 'Suspense', link: '/tutorial/react/suspense' },
              { text: 'SSR and Testing', link: '/tutorial/react/scope' },
            ],
          },
        ],
        '/api': [
          {
            text: 'Factories',
            items: [
              {
                text: 'Query',
                items: [
                  { text: 'createQuery', link: '/api/factories/create_query' },
                  {
                    text: 'createJsonQuery',
                    link: '/api/factories/create_json_query',
                  },
                ],
              },
              {
                text: 'Mutation',
                items: [
                  {
                    text: 'createMutation',
                    link: '/api/factories/create_mutation',
                  },
                  {
                    text: 'createJsonMutation',
                    link: '/api/factories/create_json_mutation',
                  },
                ],
              },
              {
                text: 'Barrier',
                items: [
                  {
                    text: 'createBarrier',
                    link: '/api/factories/create_barrier',
                  },
                ],
              },
            ],
          },
          {
            text: 'Operators',
            items: [
              { text: 'keepFresh', link: '/api/operators/keep_fresh' },
              { text: 'retry', link: '/api/operators/retry' },
              { text: 'timeout', link: '/api/operators/timeout' },
              { text: 'cache', link: '/api/operators/cache' },
              { text: 'concurrency', link: '/api/operators/concurrency' },
              { text: 'applyBarrier', link: '/api/operators/apply_barrier' },
              { text: 'update', link: '/api/operators/update' },
              { text: 'connectQuery', link: '/api/operators/connect_query' },
            ],
          },
          {
            text: 'Primitives',
            collapsed: true,
            items: [
              { text: 'Query', link: '/api/primitives/query' },
              { text: 'Mutation', link: '/api/primitives/mutation' },
              { text: 'Barrier', link: '/api/primitives/barrier' },
              { text: 'Contract', link: '/api/primitives/contract' },
              { text: 'Validator', link: '/api/primitives/validator' },
            ],
          },
          {
            text: 'Utils',
            collapsed: true,
            items: [
              { text: 'Error creators', link: '/api/utils/error_creators' },
              { text: 'Error guards', link: '/api/utils/error_guards' },
              { text: 'onAbort', link: '/api/utils/on_abort' },
            ],
          },
          {
            text: 'Integrations',
            collapsed: true,
            items: [
              {
                text: 'UI libraries',
                items: [
                  {
                    text: 'Solid',
                    link: '/api/ui/solid',
                  },
                ],
              },
              {
                text: 'Contract libraries',
                items: [
                  {
                    text: 'Runtypes',
                    link: '/api/contracts/runtypes',
                  },
                  {
                    text: 'Zod',
                    link: '/api/contracts/zod',
                  },
                  {
                    text: 'io-ts',
                    link: '/api/contracts/io-ts',
                  },
                  {
                    text: 'superstruct',
                    link: '/api/contracts/superstruct',
                  },
                  {
                    text: 'typed-contracts',
                    link: '/api/contracts/typed-contracts',
                  },
                  {
                    text: 'Valibot',
                    link: '/api/contracts/valibot',
                  },
                  {
                    text: 'JSON Schema',
                    link: '/api/contracts/json-schema',
                  },
                ],
              },
              {
                text: 'Routers',
                items: [
                  { text: 'Atomic Router', link: '/api/routers/atomic-router' },
                ],
              },
            ],
          },
        ],
        '/recipes': [
          {
            text: 'How to',
            items: [
              { text: 'Server Side Rendering', link: '/recipes/ssr' },
              { text: 'Testing', link: '/recipes/testing' },
              {
                text: 'Vite',
                link: '/recipes/vite',
              },
              {
                text: 'Base URL for all operations',
                link: '/recipes/base_url',
              },
              {
                text: 'Barrier Circuit Breaker',
                link: '/recipes/barrier_circuit_breaker',
              },
            ],
          },
          {
            text: 'Case studies',
            items: [
              {
                text: 'Auth token for operations',
                link: '/recipes/auth_token',
              },
              { text: 'Feature flags service', link: '/recipes/feature_flags' },
              {
                text: 'Pause world until user action',
                link: '/recipes/terms_of_use',
              },
              { text: 'Server side caching', link: '/recipes/server_cache' },
            ],
          },
          {
            text: 'Deep dive',
            collapsed: false,
            items: [
              {
                text: 'Data flow in Remote Operation',
                link: '/recipes/data_flow',
              },
              { text: 'Automated cache', link: '/recipes/cache' },
            ],
          },
          {
            text: 'Customization',
            items: [
              {
                text: 'How not to use Fetch API',
                link: '/recipes/no_fetch',
              },
              {
                text: 'Custom Query creation',
                link: '/recipes/custom_query',
              },
              {
                text: 'Custom Mutation creation',
                link: '/recipes/custom_mutation',
              },
              {
                text: 'Your own GraphQL Query',
                link: '/recipes/graphql_query',
              },
              { text: 'FormData in Mutation', link: '/recipes/form_data' },
            ],
          },
          {
            text: 'Showcases',
            collapsed: true,
            items: [
              {
                text: 'SolidJS',
                link: 'https://github.com/igorkamyshev/farfetched/tree/master/apps/showcase-solid-real-world-rick-morty',
              },
              {
                text: 'React and React Router',
                link: 'https://github.com/igorkamyshev/farfetched/tree/master/apps/showcase-react-real-world-pokemons',
              },
              {
                text: 'Next.js',
                link: 'https://github.com/effector/next/tree/main/apps/playground-app',
              },
              {
                text: 'Forest',
                link: 'https://github.com/igorkamyshev/farfetched/tree/master/apps/showcase-forest-real-world-breaking-bad',
              },
            ],
          },
        ],
        '/statements': [
          {
            text: 'Statements',
            items: [
              { text: 'Releases policy', link: '/statements/releases' },
              {
                text: 'Do not trust remote data',
                link: '/statements/never_trust',
              },
              {
                text: 'Render as you fetch',
                link: '/statements/render_as_you_fetch',
              },
              { text: 'No globals', link: '/statements/no_globals' },
              { text: 'Testing', link: '/statements/tests' },
              { text: 'Effector', link: '/statements/effector' },
              { text: 'TypeScript', link: '/statements/typescript' },
              { text: 'Compile target', link: '/statements/compile_target' },
            ],
          },
        ],
        '/releases': [
          {
            text: 'Releases',
            items: [
              { text: 'v0.14 Rawai', link: '/releases/0-14' },
              { text: 'v0.13 Naiharn', link: '/releases/0-13' },
              { text: 'v0.12 Talat Noi', link: '/releases/0-12' },
              { text: 'v0.11 Namtok Ngao', link: '/releases/0-11' },
              { text: 'v0.10 Namtok Than Sadet', link: '/releases/0-10' },
              { text: 'v0.9', link: '/releases/0-9' },
              { text: 'v0.8 Saphan Hin', link: '/releases/0-8' },
              { text: 'v0.7 Nam Phu Chet Si', link: '/releases/0-7' },
              { text: 'v0.6 Huai Nam Dang', link: '/releases/0-6' },
              { text: 'v0.5 Chew Lan', link: '/releases/0-5' },
              { text: 'v0.4', link: '/releases/0-4' },
              { text: 'v0.3 Sirinat', link: '/releases/0-3' },
              { text: 'v0.2 Laem Promthep', link: '/releases/0-2' },
              { text: 'v0.1 Samet Nangshe', link: '/releases/0-1' },
            ],
          },
        ],
      },
    },
  })
);
