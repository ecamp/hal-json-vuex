# hal-json-vuex

[![npm version](https://img.shields.io/npm/v/hal-json-vuex.svg?style=flat)](https://www.npmjs.com/package/hal-json-vuex)
[![Downloads](http://img.shields.io/npm/dm/hal-json-vuex.svg?style=flat-square)](https://npmjs.org/package/hal-json-vuex)
[![Build Status](https://travis-ci.com/ecamp/hal-json-vuex.svg?branch=master)](https://travis-ci.com/ecamp/hal-json-vuex)
[![Coverage Status](https://coveralls.io/repos/github/ecamp/hal-json-vuex/badge.svg?branch=master)](https://coveralls.io/github/ecamp/hal-json-vuex?branch=master)

A package to access [HAL JSON](https://tools.ietf.org/html/draft-kelly-json-hal-08) data from an API, using a [Vuex](https://vuex.vuejs.org) store, restructured to make life easier.

With this plugin, you can use your HAL JSON API in a fluid way:
```js
// Reading data and traversing relationships
let singleBook = this.api.get('/books/1')
let firstBookName = this.api.get().books().items[0].name // visits the 'books' rel on the root API endpoint
let author = singleBook.author() // related entity
let bookChapters = this.api().books().items[0].chapters()
author = singleBook.author() // doesn't trigger another network call because we already fetched it
this.api.reload(author) // force re-fetching an entity or a URI

// Writing data
this.api.post('/books', { name: 'My first book', author: { _links: { self: '/users/433' } } })
this.api.patch(singleBook, { name: 'Single book - volume 2' })
this.api.del(author).then(() => { /* do something */ })
```

This library will only load data from the API when necessary (i.e. if the data is not yet in the Vuex store).
It also supports templated links and partially loaded data from the API.

# Installation

```bash
npm install hal-json-vuex
```

# Usage

```js
import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import HalJsonVuex from 'hal-json-vuex'

Vue.use(Vuex)

const store = new Vuex.Store({})

axios.defaults.baseURL = 'https://my-api.com/api'

Vue.use(HalJsonVuex(store, axios, { /* options */ }))
```

```js
// Use it in a computed or method or lifecycle hook of a Vue component
let someEntity = this.api.get('/some/endpoint')
this.api.reload(someEntity)
```

```html
<!-- Use it in the <template> part of a Vue component -->
<li v-for="book in api.get('/all/my/books').items" :key="book._meta.self">...</li>
```

### Nuxt.js (experimental support)
To install in a Nuxt.js application:
```js
// First, make sure the Nuxt.js app uses Vuex, by adding an index.js to your store/ directory.

// Then, create a file plugins/hal-json-vuex.js with the following content:
import Vue from 'vue'
import HalJsonVuex from 'hal-json-vuex'

export default function ({ store, $axios }, nuxtInject) {
  if (!Vue.$api) {
    Vue.use(HalJsonVuex(store, $axios, { nuxtInject }))
  }
}

// Add the plugin to nuxt.config.js:
export default {
  plugins: [
    { src: '~/plugins/hal-json-vuex.js' }
  ],
  // ...
}
```
Then, you can use `$api` on both the server side and the client side:
```js
// On the server
async asyncData({ $api }) {
  const books = await $api.get().books()._meta.load
  return { books }
}
```

```js
// On the client, in a computed or method or lifecycle hook of a Vue component
let someEntity = this.$api.get('/some/endpoint')
```

```html
<!-- On the client, in the <template> part of a Vue component -->
<li v-for="book in $api.get('/all/my/books').items" :key="book._meta.self">...</li>
```

**Known limitations:** The current implementation has so far only be tested to generate static HTML on server side (nuxt config `injectScripts` set to `false`) without client side SPA. Serialization of Vuex store data & hydration on client side will probably not work without errors.

# Available options

### apiName
This package will install a module into your Vuex store, as well as an accessor (`this.api`) into your Vue prototype.
These are by default called `api`, but in case you want to change that or need to support multiple APIs at the same time, you can use the `apiName` option:
```js
Vue.use(HalJsonVuex(store, axios, { apiName: 'backend' }))

// In a Vue component
let someEntity = this.backend.get('/some/endpoint')
```

### avoidNPlusOneRequests
When accessing the elements of an embedded collection, and some of the elements of the collection have not been loaded from the API before, this library will automatically try to avoid N+1 queries by eager fetching the whole collection.
In case you run into problems with this behaviour with your API, you can disable it by setting the `avoidNPlusOneRequests` option to false:
```js
Vue.use(HalJsonVuex(store, axios, { avoidNPlusOneRequests: false }))
```

### forceRequestedSelfLink
When requesting an entity, some HAL JSON APIs will not always return the same `self` link as it was in the request.
An example would be if the API added a `page=0` query parameter to the `self` link of a collection, even if the request was done without that parameter:
```
// request
GET /all/my/books

// response JSON from the API
{
  "_embedded": {
    "items": [ ... ]
  },
  "_links": {
    "self": {
      "href": "/all/my/books?page=0"
    }
  }
}
```
This can lead to problems, because in your component template you might be requesting `/all/my/books` but that URI never appears in your Vuex store, causing an infinite loop of re-fetching the same URI.

In case your API does this, you can set the `forceRequestedSelfLink` option to true, and the top-level `self` link in all responses will be overwritten to the link that was actually requested.
```js
Vue.use(HalJsonVuex(store, axios, { forceRequestedSelfLink: true }))
```
