module.exports = {
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|js|mjs|html)$': 'ts-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/app/$1',
    '@core/(.*)': '<rootDir>/src/app/core/$1',
    '@shared/(.*)': '<rootDir>/src/app/shared/$1',
    '@features/(.*)': '<rootDir>/src/app/features/$1',
    '@three/(.*)': '<rootDir>/src/app/three/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts']
};