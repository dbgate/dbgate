module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js'],
  reporters: [
    'default',
    'jest-summary-reporter',
    'jest-github-actions-reporter',
  ],
};
