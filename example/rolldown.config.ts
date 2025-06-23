import { defineConfig } from 'rolldown'
import spacetimedbPlugin from 'rolldown-plugin-spacetimedb'

export default defineConfig({
    input: "src/index.ts",
    output: {
        dir: "dist",
        format: "esm",
        sourcemap: true,
    },
    plugins: [
        spacetimedbPlugin()
    ],
}) 