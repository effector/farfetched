import tsconfigPaths from 'vite-tsconfig-paths';
import solidPlugin from 'vite-plugin-solid';

import dts from '../../tools/vite/types';

export default {
  plugins: [tsconfigPaths(), solidPlugin(), dts()],
  test: {
    globals: true,
    setupFiles: './test.setup.ts',
  },
  resolve: {
    conditions: ['browser'],
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: '@farfetched/solid',
      fileName: 'solid',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['solid-js', 'effector-solid', '@farfetched/core'],
    },
  },
};
