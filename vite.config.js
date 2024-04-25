// vite.config.js

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      // the entry file that is loaded whenever someone imports
      // your plugin in their app
      entry: 'src/index.ts',

      // the exposed global variable
      // is required when formats includes 'umd' or 'iife'
      name: 'HalJsonVuex',

      // the proper extensions will be added, ie:
      // name.js (es module)
      // name.umd.cjs) (common js module)
      // default fileName is the name option of package.json
      fileName: 'hal-json-vuex'
    },
    rollupOptions: {
      // externalize outputs if we have these modules as dependencies
      external: ['hal-json-normalizer', 'url-template', 'vue-demi'],
      output: {
        exports: 'named',
        globals: {
          'url-template': 'parseTemplate',
          'hal-json-normalizer': 'normalize',
          'vue-demi': 'VueDemi'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['vue-demi']
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html']
    }
  }
})
