module.exports = {
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  reporters: [
    'default',
    'jest-summary-reporter',
    'jest-github-actions-reporter',
  ],  
};
