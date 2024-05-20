module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Find all import declarations
  root.find(j.ImportDeclaration).forEach(path => {
    const importPath = path.node.source.value;

    // If the import path doesn't end with .js, add it
    if (!importPath.endsWith('.js') && importPath.startsWith('.')) {
      path.node.source = j.literal(importPath + '.js');
    }
  });

  return root.toSource();
};
