import { readFile, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const rootPath = fileURLToPath(new URL('.', import.meta.url))
const libPath = resolve(rootPath, 'lib')

await build({
  configFile: false,
  logLevel: 'info',
  build: {
    lib: {
      entry: resolve(rootPath, 'src/client/index.js'),
      formats: ['cjs'],
      fileName: () => 'client.raw.js',
    },
    outDir: libPath,
    emptyOutDir: false,
    minify: false,
    codeSplitting: false,
    rollupOptions: {
      output: { exports: 'named' },
    },
  },
})

const bundled = await readFile(resolve(libPath, 'client.raw.js'), 'utf8')
await unlink(resolve(libPath, 'client.raw.js'))
const id = 'dsh-effort-slider'
const clientModule = [
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
  '  var module = { exports: {} }',
  '  var exports = module.exports',
  bundled,
  '  return module.exports',
  '} })',
  '',
].join('\n')

await writeFile(resolve(libPath, 'client.js'), clientModule)
console.log(`Built ${resolve(libPath, 'client.js')}`)
