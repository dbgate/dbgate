import React from 'react';
import useFetch from '../utility/useFetch';
import { scryRenderedComponentsWithType } from 'react-dom/test-utils';

export default function TableDataTab({ conid, database, schemaName, pureName }) {
  // return pureName;
  const data = useFetch({
    url: 'tables/table-data',
    params: {
      conid,
      database,
      schemaName,
      pureName,
    },
  });
  const { rows, columns } = data || {};
  if (!columns || !rows) return null;
  return (
    <table>
      <tr>
        {columns.map(col => (
          <th key={col.name}>{col.name}</th>
        ))}
      </tr>
      {rows.map((row, index) => (
        <tr key={index}>
          {columns.map(col => (
            <td key={col.name}>{row[col.name]}</td>
          ))}
        </tr>
      ))}
    </table>
  );
}
