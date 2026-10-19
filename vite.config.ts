import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { parse } from 'yaml'

const yaml: Plugin = {
  name: 'yaml',
  transform(code, id) {
    if (id.endsWith('.yaml')) return { code: `export default ${JSON.stringify(parse(code))}`, map: null }
  },
}

// SINGLE_FILE=1 inlines everything into one index.html, for hosts that only take one file.
export default defineConfig({
  base: './',
  plugins: [svelte(), yaml, ...(process.env.SINGLE_FILE ? [viteSingleFile()] : [])],
})
