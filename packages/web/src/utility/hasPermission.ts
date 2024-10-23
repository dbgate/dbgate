import { compilePermissions, testPermission } from 'dbgate-tools';
import { useConfig } from './metadataLoaders';

let compiled = null;

export default function hasPermission(tested) {
  // console.log('TESTING PERM', tested, compiled, testPermission(tested, compiled));
  return testPermission(tested, compiled);
}

export function subscribePermissionCompiler() {
  // console.log('subscribePermissionCompiler', compiled);

  useConfig().subscribe(value => {
    if (!value) return;
    const { permissions } = value;
    compiled = compilePermissions(permissions);
    // console.log('COMPILED PERMS', compiled);
  });
}

export function setConfigForPermissions(config) {
  compiled = compilePermissions(config?.permissions || []);
}
