const fs = require('fs');

fs.writeFileSync('packages/api/src/packagedPluginsContent.js', `module.exports = () => null;`);
