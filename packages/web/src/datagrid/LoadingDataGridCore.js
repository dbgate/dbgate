import React from 'react';
import DataGridCore from './DataGridCore';

export default function LoadingDataGridCore(props) {
  const {
    display,
    loadDataPage,
    dataPageAvailable,
    loadRowCount,
    loadNextDataToken,
    onReload,
    exportGrid,
    openQuery,
    griderFactory,
    griderFactoryDeps,
    onChangeGrider,
    rowCountLoaded,
  } = props;

  const [loadProps, setLoadProps] = React.useState({
    isLoading: false,
    loadedRows: [],
    isLoadedAll: false,
    loadedTime: new Date().getTime(),
    allRowCount: null,
    errorMessage: null,
    loadNextDataToken: 0,
  });
  const { isLoading, loadedRows, isLoadedAll, loadedTime, allRowCount, errorMessage } = loadProps;

  const loadedTimeRef = React.useRef(0);

  const handleLoadRowCount = async () => {
    const rowCount = await loadRowCount(props);
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      allRowCount: rowCount,
    }));
  };

  const reload = () => {
    setLoadProps({
      allRowCount: null,
      isLoading: false,
      loadedRows: [],
      isLoadedAll: false,
      loadedTime: new Date().getTime(),
      errorMessage: null,
      loadNextDataToken: 0,
    });
    if (onReload) onReload();
  };

  React.useEffect(() => {
    if (props.masterLoadedTime && props.masterLoadedTime > loadedTime) {
      display.reload();
    }
    if (display.cache.refreshTime > loadedTime) {
      reload();
    }
  });

  const loadNextData = async () => {
    if (isLoading) return;
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      isLoading: true,
    }));
    const loadStart = new Date().getTime();
    loadedTimeRef.current = loadStart;

    const nextRows = await loadDataPage(props, loadedRows.length, 100);
    if (loadedTimeRef.current !== loadStart) {
      // new load was dispatched
      return;
    }
    // if (!_.isArray(nextRows)) {
    //   console.log('Error loading data from server', nextRows);
    //   nextRows = [];
    // }
    // console.log('nextRows', nextRows);
    if (nextRows.errorMessage) {
      setLoadProps((oldLoadProps) => ({
        ...oldLoadProps,
        isLoading: false,
        errorMessage: nextRows.errorMessage,
      }));
    } else {
      if (allRowCount == null) handleLoadRowCount();
      const loadedInfo = {
        loadedRows: [...loadedRows, ...nextRows],
        loadedTime,
      };
      setLoadProps((oldLoadProps) => ({
        ...oldLoadProps,
        isLoading: false,
        isLoadedAll: oldLoadProps.loadNextDataToken == loadNextDataToken && nextRows.length === 0,
        loadNextDataToken,
        ...loadedInfo,
      }));
    }
  };

  React.useEffect(() => {
    setLoadProps((oldProps) => ({
      ...oldProps,
      isLoadedAll: false,
    }));
  }, [loadNextDataToken]);

  const griderProps = { ...props, sourceRows: loadedRows };
  const grider = React.useMemo(() => griderFactory(griderProps), griderFactoryDeps(griderProps));

  React.useEffect(() => {
    if (onChangeGrider) onChangeGrider(grider);
  }, [grider]);

  const handleLoadNextData = () => {
    if (!isLoadedAll && !errorMessage && !grider.disableLoadNextPage) {
      if (dataPageAvailable(props)) {
        // If not, callbacks to load missing metadata are dispatched
        loadNextData();
      }
    }
  };

  return (
    <DataGridCore
      {...props}
      loadNextData={handleLoadNextData}
      errorMessage={errorMessage}
      isLoadedAll={isLoadedAll}
      loadedTime={loadedTime}
      exportGrid={exportGrid}
      allRowCount={rowCountLoaded || allRowCount}
      openQuery={openQuery}
      isLoading={isLoading}
      grider={grider}
    />
  );
}
