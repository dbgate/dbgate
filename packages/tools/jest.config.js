module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*Test.js', '**/*.test.js'],
  reporters: ['default', 'github-actions'],
};
