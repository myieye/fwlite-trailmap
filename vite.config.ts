import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { parse } from 'yaml'

const yaml: Plugin = {
  name: 'yaml',
  transform(code, id) {
    if (id.endsWith('.yaml')) return { code: `export default ${JSON.stringify(parse(code))}`, map: null }
  },
}

// Starts the hero's fonts downloading with the HTML instead of after the JS and CSS, so the first paint rarely swaps fonts.
const preloadFonts: Plugin = {
  name: 'preload-fonts',
  transformIndexHtml(_html, ctx) {
    const files = Object.keys(ctx.bundle ?? {}).filter((f) => /(fraunces-latin-full|figtree-latin-wght)-normal.*\.woff2$/.test(f))
    return files.map((f) => ({
      tag: 'link',
      attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${f}`, crossorigin: '' },
      injectTo: 'head',
    }))
  },
}

// SINGLE_FILE=1 inlines everything into one index.html, for hosts that only take one file.
export default defineConfig({
  base: './',
  plugins: [svelte(), yaml, preloadFonts, ...(process.env.SINGLE_FILE ? [viteSingleFile()] : [])],
  resolve: {
    alias: process.env.SINGLE_FILE
      ? [{ find: /^\.\/fonts$/, replacement: fileURLToPath(new URL('./src/fonts.single.css', import.meta.url)) }]
      : [],
  },
})
