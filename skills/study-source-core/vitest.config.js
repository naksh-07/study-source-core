const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['scripts/test_*.js'],
    exclude: ['**/node_modules/**', '**/scratch/**'],
    testTimeout: 60000,
    hookTimeout: 30000,
    isolate: true,
    fileParallelism: true,
    maxWorkers: 4,
    minWorkers: 1,
    passWithNoTests: true,
    setupFiles: ['./vitest.setup.js'],
  },
});
