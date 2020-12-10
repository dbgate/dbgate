const fs = require('fs');
const packageJson = fs.readFileSync('app/package.json', { encoding: 'utf-8' });
const json = JSON.parse(packageJson);

const text = `
module.exports = { 
  version: '${json.version}',
  buildTime: '${new Date().toISOString()}'
};
`;

fs.writeFileSync('packages/api/src/currentVersion.js', text);
