// vite.config.js

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      // the entry file that is loaded whenever someone imports
      // your plugin in their app
      entry: "src/index.ts",

      // the exposed global variable
      // is required when formats includes 'umd' or 'iife'
      name: "HalJsonVuex",

      // the proper extensions will be added, ie:
      // name.js (es module)
      // name.umd.cjs) (common js module)
      // default fileName is the name option of package.json
      fileName: "hal-json-vuex",
    }
  },
});
