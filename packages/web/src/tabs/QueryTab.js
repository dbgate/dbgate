import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import engines from '@dbgate/engines';
import useTableInfo from '../utility/useTableInfo';
import useConnectionInfo from '../utility/useConnectionInfo';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUpdateDatabaseForTab } from '../utility/globalState';
import QueryToolbar from '../query/QueryToolbar';

export default function QueryTab({ tabid, conid, database, tabVisible, toolbarPortalRef }) {
  const localStorageKey = `sql_${tabid}`;
  const [queryText, setQueryText] = React.useState(() => localStorage.getItem(localStorageKey) || '');
  const queryTextRef = React.useRef(queryText);

  const saveToStorage = React.useCallback(() => localStorage.setItem(localStorageKey, queryTextRef.current), [
    localStorageKey,
    queryTextRef,
  ]);
  const saveToStorageDebounced = React.useMemo(() => _.debounce(saveToStorage, 5000), [saveToStorage]);

  React.useEffect(() => {
    window.addEventListener('beforeunload', saveToStorage);
    return () => {
      window.removeEventListener('beforeunload', saveToStorage);
    };
  }, []);

  useUpdateDatabaseForTab(tabVisible, conid, database);

  const handleChange = text => {
    if (text != null) queryTextRef.current = text;
    setQueryText(text);
    saveToStorageDebounced();
  };

  return (
    <>
      <SqlEditor value={queryText} onChange={handleChange} tabVisible={tabVisible} />

      {toolbarPortalRef &&
        toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(<QueryToolbar />, toolbarPortalRef.current)}
    </>
  );
}
