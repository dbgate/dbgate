import { createGridCache, FreeTableGridDisplay } from 'dbgate-datalib';
import React from 'react';
import DataGridCore from '../datagrid/DataGridCore';
import keycodes from '../utility/keycodes';
import FreeTableGrider from './FreeTableGrider';
import MacroPreviewGrider from './MacroPreviewGrider';

export default function FreeTableGridCore(props) {
  const {
    modelState,
    dispatchModel,
    config,
    setConfig,
    macroPreview,
    macroValues,
    onSelectionChanged,
    setSelectedMacro,
  } = props;
  const [cache, setCache] = React.useState(createGridCache());
  const [selectedCells, setSelectedCells] = React.useState([]);
  const grider = React.useMemo(
    () =>
      macroPreview
        ? new MacroPreviewGrider(modelState.value, macroPreview, macroValues, selectedCells)
        : FreeTableGrider.factory(props),
    [
      ...FreeTableGrider.factoryDeps(props),
      macroPreview,
      macroPreview ? macroValues : null,
      macroPreview ? selectedCells : null,
    ]
  );
  const display = React.useMemo(() => new FreeTableGridDisplay(grider.model || modelState.value, config, setConfig, cache, setCache), [
    modelState.value,
    config,
    cache,
    grider,
  ]);

  const handleSelectionChanged = React.useCallback(
    (cells) => {
      if (onSelectionChanged) onSelectionChanged(cells);
      setSelectedCells(cells);
    },
    [setSelectedCells]
  );

  const handleKeyDown = React.useCallback((event) => {
    if (event.keyCode == keycodes.escape) {
      setSelectedMacro(null);
    }
  }, []);

  return (
    <DataGridCore
      {...props}
      grider={grider}
      display={display}
      onSelectionChanged={macroPreview ? handleSelectionChanged : null}
      frameSelection={!!macroPreview}
      onKeyDown={handleKeyDown}
    />
  );
}
