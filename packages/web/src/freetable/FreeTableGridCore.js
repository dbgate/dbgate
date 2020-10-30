import { createGridCache, FreeTableGridDisplay } from '@dbgate/datalib';
import React from 'react';
import DataGridCore from '../datagrid/DataGridCore';
import FreeTableGrider from './FreeTableGrider';

export default function FreeTableGridCore(props) {
  const { modelState, dispatchModel, config, setConfig, macroPreview, macroValues } = props;
  const grider = React.useMemo(() => FreeTableGrider.factory(props), FreeTableGrider.factoryDeps(props));
  const [cache, setCache] = React.useState(createGridCache());
  const display = React.useMemo(() => new FreeTableGridDisplay(modelState.value, config, setConfig, cache, setCache), [
    modelState.value,
    config,
    cache,
  ]);

  return <DataGridCore {...props} grider={grider} display={display} />;
}
