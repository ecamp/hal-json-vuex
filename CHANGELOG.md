### Unreleased

### 2.0.0-alpha.4
- `$href` can now be used directly on entities, just like `$post`, `$patch` etc.

### 2.0.0-alpha.2
- When deleting an entity, cascade-deleted entities are now cleaned correctly from the store as well

### 2.0.0-alpha.1
- Dependency updates

### 2.0.0-alpha.0
- Convert to TypeScript
- `$loadItems` now returns a Promise that resolves to the collection again, instead of the items array

### 1.2.2
- Fix embedded standalone collections that wouldn't work before

### 1.2.1
- Avoid sending a reload request as long as an equal reload request is still ongoing
- Added source maps to the exported bundle

### 1.2.0
- Fixed a bug involving the load promise of embedded collections
- Added a new method `isUnknown` which can be used to determine whether an URI has never been requested from the API before (except if it was purged in the meantime)
- Automatically avoid n+1 queries when accessing embedded collections (#7)

### 1.1.0
- Add experimental support for using the plugin in Nuxt.js applications

### 1.0.0
- Created the library by extracting code from https://github.com/ecamp/ecamp3
