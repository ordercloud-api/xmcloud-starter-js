import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Outside of Next's RSC build step, the real "server-only" package throws on import.
      // Tests run under plain Node, so this stub keeps `import 'server-only'` a no-op.
      'server-only': path.resolve(import.meta.dirname, 'src/__tests__/stubs/server-only.ts'),
    },
  },
});
