module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/modules/**/*.js', '!src/modules/**/*.routes.js'],
  coverageDirectory: 'coverage',
  setupFiles: ['./tests/setup.js'],
  setupFilesAfterEnv: ['./tests/afterEach.js'],
  globalSetup: './tests/globalSetup.js',
  globalTeardown: './tests/globalTeardown.js',
};
