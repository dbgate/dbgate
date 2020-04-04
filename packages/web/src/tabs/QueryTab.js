import React from 'react';
import engines from '@dbgate/engines';
import useTableInfo from '../utility/useTableInfo';
import useConnectionInfo from '../utility/useConnectionInfo';
import SqlEditor from '../sqleditor/SqlEditor';

export default function QueryTab({ conid, database, schemaName, pureName, tabVisible }) {
  const [queryText, setQueryText] = React.useState('');
  //   const tableInfo = useTableInfo({ conid, database, schemaName, pureName });
  //   const connnection = useConnectionInfo(conid);
  //   if (!connnection || !tableInfo) return null;
  //   // console.log(tableInfo);

  //   const driver = engines(connnection.engine);
  //   const dmp = driver.createDumper();
  //   if (tableInfo) dmp.createTable(tableInfo);

  const handleChange = text => {
    setQueryText(text);
  };

  return <SqlEditor value={queryText} onChange={handleChange} tabVisible={tabVisible} />;
}
