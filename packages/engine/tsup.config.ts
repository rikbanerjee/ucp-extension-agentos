import { defineConfig } from 'tsup';
import { resolve } from 'node:path';

// Bundles the re-export barrel (packages/engine/src/index.ts) by following every
// `@/lib/...` import into the repo's src/ tree and inlining it, producing a
// self-contained, alias-free artifact that an EXTERNAL repo (e.g. thecustomhub)
// can install and import. The in-repo app and tests keep importing the raw source
// via tsconfig's `@/*` alias; only external consumers load dist/.
const REPO_SRC = resolve(__dirname, '../../src');

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: false,
  // tsconfig.build.json remaps `@/*` -> ../../src/* so the .d.ts rollup resolves too.
  tsconfig: 'tsconfig.build.json',
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  },
  esbuildOptions(options) {
    // Belt-and-suspenders for the JS bundle: resolve `@/...` to the repo src.
    options.alias = { ...(options.alias ?? {}), '@': REPO_SRC };
  },
});
