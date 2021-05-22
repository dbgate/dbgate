const fs = require('fs');

const text = fs.readFileSync('package.json', { encoding: 'utf-8' });
const json = JSON.parse(text);

json.build.mac.target.arch = process.argv[2];

fs.writeFileSync('package.json', JSON.stringify(json, null, 2), { encoding: 'utf-8' });
