import { createGridConfig } from 'dbgate-datalib';
import React from 'react';

const loadGridConfigFunc = tabid => () => {
  const existing = localStorage.getItem(`tabdata_grid_${tabid}`);
  if (existing) {
    return {
      ...createGridConfig(),
      ...JSON.parse(existing),
    };
  }
  return createGridConfig();
};

export default function useGridConfig(tabid) {
  const [config, setConfig] = React.useState(loadGridConfigFunc(tabid));

  React.useEffect(() => {
    localStorage.setItem(`tabdata_grid_${tabid}`, JSON.stringify(config));
  }, [config]);

  return [config, setConfig];
}
