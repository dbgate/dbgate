import { createGridConfig } from '@dbgate/datalib';
import React from 'react';

const loadGridConfigFunc = (tabid) => () => {
  const existing = localStorage.getItem(`grid_${tabid}`);
  if (existing) return JSON.parse(existing);
  return createGridConfig();
};

export default function useGridConfig(tabid) {
  const [config, setConfig] = React.useState(loadGridConfigFunc(tabid));

  React.useEffect(() => {
    localStorage.setItem(`grid_${tabid}`, JSON.stringify(config));
  }, [config]);

  return [config, setConfig];
}
