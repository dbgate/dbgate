import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import ObjectListControl from '../utility/ObjectListControl';
import { TableColumn } from '../utility/TableControl';
import { useTableInfo, useDbCore } from '../utility/metadataLoaders';
import useTheme from '../theme/useTheme';
import ColumnLabel from '../datagrid/ColumnLabel';
import { FontIcon } from '../icons';
import useEditorData from '../utility/useEditorData';
import { generateTableGroupId } from 'dbgate-tools';
import TableEditor from '../tableeditor/TableEditor';

export default function TableStructureTab({
  conid,
  database,
  schemaName,
  pureName,
  tabid,
  objectTypeField = 'tables',
  toolbarPortalRef,
  tabVisible,
}) {
  const tableInfo = useDbCore({ conid, database, schemaName, pureName, objectTypeField });
  const { editorData, setEditorData } = useEditorData({ tabid });
  const tableInfoWithGroupId = React.useMemo(() => generateTableGroupId(tableInfo), [tableInfo]);

  const showTable = editorData && editorData.current ? editorData.current : tableInfoWithGroupId;

  const handleSetTableInfo = current => {
    setEditorData({
      base: editorData ? editorData.base : tableInfoWithGroupId,
      current,
    });
  };

  if (!showTable) return null;
  return (
    <TableEditor
      tableInfo={showTable}
      setTableInfo={handleSetTableInfo}
      toolbarPortalRef={toolbarPortalRef}
      tabVisible={tabVisible}
    />
  );
}
