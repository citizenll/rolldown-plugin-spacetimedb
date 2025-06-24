import { defineConfig } from 'rolldown';
import spacetimeDbReducerPlugin from 'rolldown-plugin-spacetimedb';

export default defineConfig({
    input: 'src/index.ts',
    plugins: [spacetimeDbReducerPlugin()],
    output: {
        dir: 'dist',
        format: 'es',
        entryFileNames: '[name].ts',
    },
    // Treat all 'spacetimedb' imports as external
    external: ['spacetimedb', 'spacetimedb/composable'],
});