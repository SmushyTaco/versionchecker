import { build } from 'esbuild';

async function buildFile() {
    try {
        await build({
            platform: 'node',
            entryPoints: ['./src/index.ts'],
            format: 'esm',
            define: {
                'process.env.NODE_ENV': '"production"'
            },
            minify: true,
            outfile: './dist/index.mjs'
        });

        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

await buildFile();
