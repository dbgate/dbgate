const fs = require('fs');

let fillContent = '';

if (process.platform == 'win32') {
  fillContent += `content.msnodesqlv8 = () => require('msnodesqlv8');`;
}
fillContent += `content['better-sqlite3'] = () => require('better-sqlite3');`;

const getContent = empty => `
// this file is generated automatically by script fillNativeModules.js, do not edit it manually
const content = {};

${empty ? '' : fillContent}

module.exports = content;
`;

fs.writeFileSync(
  'packages/api/src/nativeModulesContent.js',
  getContent(process.argv.includes('--electron') ? true : false)
);
fs.writeFileSync('app/src/nativeModulesContent.js', getContent(false));
