module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js'],
  reporters: [
    'summary',        // nice overall summary
    'github-actions', // adds inline annotations in PRs
  ],
};
