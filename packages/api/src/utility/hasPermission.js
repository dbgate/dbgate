const { compilePermissions, testPermission } = require('dbgate-tools');

let compiled = undefined;

function hasPermission(tested) {
  if (compiled === undefined) {
    compiled = compilePermissions(process.env.PERMISSIONS);
  }
  return testPermission(tested, compiled);
}

module.exports = hasPermission;
