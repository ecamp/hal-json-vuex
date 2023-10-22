export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
    '^.+\\.js?$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(mock-xmlhttprequest))'
  ]
}
