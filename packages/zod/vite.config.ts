import tsconfigPaths from 'vite-tsconfig-paths';

import dts from '../../tools/vite/types';

export default {
  plugins: [tsconfigPaths(), dts()],
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        useAtomics: true,
      },
    },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: '@farfetched/zod',
      fileName: 'zod',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['zod', 'zod/v3', 'zod/v4/core'],
    },
  },
};
