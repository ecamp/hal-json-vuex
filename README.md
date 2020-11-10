# hal-json-vuex

A package to access [HAL JSON](https://tools.ietf.org/html/draft-kelly-json-hal-08) data from an API, using a [Vuex](https://vuex.vuejs.org) store, restructured to make life easier.

With this plugin, you can use your HAL JSON API in a fluid way:
```js
// Reading data and traversing relationships
let singleBook = this.api.get('/books/1')
let bookName = this.api.get().books().items[0].name // visits the 'books' rel on the root API endpoint
let author = singleBook.author() // related entity
let bookChapters = this.api().books().items[0].chapters()
this.api.reload(author)

// Writing data
this.api.post('/books', { name: 'My first book', author: { _links: { self: '/users/433' } } })
this.api.patch(singleBook, { name: 'Single book - volume 2' })
this.api.del(author).then(() => { /* do something */ })
```

This library will only load data from the API when necessary (i.e. if the data is not yet in the Vuex store).
It also supports templated links and partially loaded data from the API.

# Install

```shell
$ npm install ecamp/hal-json-vuex#master
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

Vue.use(HalJsonVuex(store, axios))
```

```
// Use it in a computed or method or lifecycle hook of a Vue component
let someEntity = this.api.get('/some/endpoint')
this.api.reload(someEntity)
```

```html
<!-- Use it in the <template> part of a Vue component -->
<li v-for="book in api.get('/all/my/books').items" :key="book._meta.self">...</li>
```
