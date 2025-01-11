import { defineConfig } from 'vite';
import viteTscPlugin from 'vite-plugin-tsc-transpile';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export default defineConfig({
    build: {
        target: 'esnext',
        outDir: 'dist',
        rollupOptions: {
            input: path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                'src/index.ts'
            ),
            output: {
                entryFileNames: 'index.mjs'
            },
            external: ['node:fs', 'picocolors', 'pacote', 'semver', 'table']
        },
        sourcemap: true,
        minify: false
    },
    plugins: [viteTscPlugin()]
});
