const fs = require('fs');

const packageJson = fs.readFileSync('app/package.json', { encoding: 'utf-8' });
const json = JSON.parse(packageJson);

json.build.linux.target = ['flatpak'];
json.build.appId = 'org.dbgate.DbGate';

fs.writeFileSync('app/package.json', JSON.stringify(json, undefined, 2));
