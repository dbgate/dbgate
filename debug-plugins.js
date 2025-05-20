const fs = require('fs');
const path = require('path');

function listPluginsInDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist`);
    return [];
  }

  const files = fs.readdirSync(dir);
  return files.filter(file => file.startsWith('dbgate-plugin-'));
}

function checkPluginStructure(pluginDir) {
  const results = {
    name: path.basename(pluginDir),
    exists: fs.existsSync(pluginDir),
    packageJson: false,
    distDir: false,
    frontendJs: false,
    backendJs: false,
    iconSvg: false,
  };

  if (!results.exists) return results;

  const packageJsonPath = path.join(pluginDir, 'package.json');
  results.packageJson = fs.existsSync(packageJsonPath);

  if (results.packageJson) {
    try {
      const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      results.packageData = {
        version: packageData.version,
        main: packageData.main,
        keywords: packageData.keywords || [],
      };
    } catch (err) {
      results.packageJsonError = err.message;
    }
  }

  const distDir = path.join(pluginDir, 'dist');
  results.distDir = fs.existsSync(distDir);
  
  if (results.distDir) {
    results.frontendJs = fs.existsSync(path.join(distDir, 'frontend.js'));
    results.backendJs = fs.existsSync(path.join(distDir, 'backend.js'));
  }

  results.iconSvg = fs.existsSync(path.join(pluginDir, 'icon.svg'));
  
  return results;
}

// Assume the two directories where plugins can be found
const homeDirPlugins = path.join(require('os').homedir(), '.dbgate', 'plugins');
const appPlugins = path.join(__dirname, 'plugins');
const packagedPlugins = path.join(__dirname, 'plugins', 'dist');

console.log('\n=== PLUGINS IN HOME DIRECTORY ===');
const homePlugins = listPluginsInDirectory(homeDirPlugins);
homePlugins.forEach(plugin => {
  const structure = checkPluginStructure(path.join(homeDirPlugins, plugin));
  console.log(JSON.stringify(structure, null, 2));
});

console.log('\n=== PLUGINS IN APP DIRECTORY ===');
const appDirPlugins = listPluginsInDirectory(appPlugins);
appDirPlugins.forEach(plugin => {
  const structure = checkPluginStructure(path.join(appPlugins, plugin));
  console.log(JSON.stringify(structure, null, 2));
});

console.log('\n=== PACKAGED PLUGINS ===');
if (fs.existsSync(packagedPlugins)) {
  const packPlugins = listPluginsInDirectory(packagedPlugins);
  packPlugins.forEach(plugin => {
    const structure = checkPluginStructure(path.join(packagedPlugins, plugin));
    console.log(JSON.stringify(structure, null, 2));
  });
} else {
  console.log('Packaged plugins directory does not exist');
}
