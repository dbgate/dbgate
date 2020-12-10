import React from 'react';
import { useConfig } from './metadataLoaders';
import { compilePermissions, testPermission } from 'dbgate-tools';

export default function useHasPermission() {
  const config = useConfig();
  const compiled = React.useMemo(() => compilePermissions(config.permissions), [config]);
  const hasPermission = (tested) => testPermission(tested, compiled);
  return hasPermission;
}
