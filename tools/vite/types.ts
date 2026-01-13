import dts from 'vite-plugin-dts';
import { readdir, copyFile } from 'node:fs/promises';
import * as path from 'node:path';

export default function typesPlugin() {
  return dts({
    entryRoot: 'src',
    tsconfigPath: 'tsconfig.json',
    rollupTypes: true,
    // Exclude workspace packages from alias resolution to keep them as external imports
    aliasesExclude: [/^@farfetched\//],
    async afterBuild() {
      const files = await readdir('dist');
      const dtsFiles = files.filter((file) => file.endsWith('.d.ts'));
      await Promise.all(
        dtsFiles.map((file) =>
          copyFile(
            path.join('dist', file),
            path.join('dist', file.replace('.d.ts', '.d.cts'))
          )
        )
      );
    },
  });
}
