import { compilePermissions, testPermission } from 'dbgate-tools';
import { useConfig } from './metadataLoaders';

let compiled = null;

const config = useConfig();
config.subscribe(value => {
  if (!value) return;
  const { permissions } = value;
  compiled = compilePermissions(permissions);
});

export default function hasPermission(tested) {
  return testPermission(tested, compiled);
}
