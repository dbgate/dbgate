module.exports = {
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  reporters: [
    'summary',        // nice overall summary
    'github-actions', // adds inline annotations in PRs
  ],  
};
