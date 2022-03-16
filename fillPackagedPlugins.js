const fs = require('fs');
const path = require('path');

function load() {
  const plugins = {};

  for (const packageName of fs.readdirSync('plugins')) {
    if (!packageName.startsWith('dbgate-plugin-')) continue;
    // TODO skip redis when creating output bundle
    if (packageName == 'dbgate-plugin-redis') continue;
    const dir = path.join('plugins', packageName);
    const frontend = fs.readFileSync(path.join(dir, 'dist', 'frontend.js'), 'utf-8');
    const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf-8');
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
    plugins[packageName] = {
      manifest,
      frontend,
      readme,
    };
  }

  return plugins;
}

fs.writeFileSync('packages/api/src/packagedPluginsContent.js', `module.exports = () => (${JSON.stringify(load())});`);
