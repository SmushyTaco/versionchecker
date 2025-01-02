import { defineConfig } from 'vite';
import viteTscPlugin from 'vite-plugin-tsc-transpile';
import { fileURLToPath } from 'url';
import path from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                'src/index.ts'
            ),
            output: {
                entryFileNames: 'index.mjs'
            },
            external: ['fs', 'picocolors', 'pacote', 'semver', 'table']
        },
        sourcemap: true,
        minify: false
    },
    plugins: [viteTscPlugin()]
});
