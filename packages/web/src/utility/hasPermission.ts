import { compilePermissions, testPermission } from 'dbgate-tools';
import { useConfig } from './metadataLoaders';

let compiled = null;

export default function hasPermission(tested) {
  return testPermission(tested, compiled);
}

export function subscribePermissionCompiler() {
  useConfig().subscribe(value => {
    if (!value) return;
    const { permissions } = value;
    compiled = compilePermissions(permissions);
  });
}
