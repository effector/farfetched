import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import solid from 'vite-plugin-solid';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    solid({
      /*
       * @farfetched/dev-tools is better when effector/babel-plugin is used
       * Note: Only .tsx/.jsx files are processed by default.
       * Pure .ts files with generics should NOT be included here
       * as the JSX parser misinterprets TypeScript generics <T> as JSX tags.
       */
      babel: {
        plugins: [
          [
            'effector/babel-plugin',
            {
              /* register all factories to improve DX */
              factories: [
                'src/entities/location',
                'src/entities/character',
                'src/entities/episode',
              ],
            },
          ],
        ],
      },
    }),
    /*
     * @farfetched/dev-tools in dev mode does not built,
     * so we use them as sources and have to build it.
     */
    vue(),
  ],
  resolve: {
    conditions: ['browser'],
  },
});
