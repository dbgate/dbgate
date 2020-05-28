import React from 'react';
import ModalBase from './ModalBase';
import { FormButtonRow } from '../utility/forms';
import FormStyledButton from '../widgets/FormStyledButton';
import SqlEditor from '../sqleditor/SqlEditor';
import styled from 'styled-components';
import keycodes from '../utility/keycodes';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import analyseQuerySources from '../sqleditor/analyseQuerySources';
import TableControl, { TableColumn } from '../utility/TableControl';
import { TextField } from '../utility/inputs';

const FlexLine = styled.div`
  display: flex;
  margin-bottom: 15px;
`;

const FlexColumn = styled.div`
  margin: 5px;
`;

const Label = styled.div`
  margin: 5px;
`;

const SqlWrapper = styled.div`
  position: relative;
  height: 80px;
  width: 40vw;
`;

const JOIN_TYPES = ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'];

export default function InsertJoinModal({ sql, modalState, engine, dbinfo, onInsert }) {
  const sources = React.useMemo(
    () => analyseQuerySources(sql, [...dbinfo.tables.map((x) => x.pureName), ...dbinfo.views.map((x) => x.pureName)]),
    [sql, dbinfo]
  );

  const [sourceIndex, setSourceIndex] = React.useState(0);
  const [targetIndex, setTargetIndex] = React.useState(0);
  const [joinIndex, setJoinIndex] = React.useState(0);
  const [alias, setAlias] = React.useState('');
  const sourceRef = React.useRef(null);
  const targetRef = React.useRef(null);
  const aliasRef = React.useRef(null);
  const joinRef = React.useRef(null);

  const targets = React.useMemo(() => {
    const source = sources[sourceIndex];
    if (!source) return [];
    /** @type {import('@dbgate/types').TableInfo} */
    const table = dbinfo.tables.find((x) => x.pureName == sources[sourceIndex].name);
    if (!table) return [];
    return [
      ...table.foreignKeys.map((fk) => ({
        baseColumns: fk.columns.map((x) => x.columnName).join(', '),
        refTable: fk.refTableName,
        refColumns: fk.columns.map((x) => x.refColumnName).join(', '),
        constraintName: fk.constraintName,
        columnMap: fk.columns,
      })),
      ...table.dependencies.map((fk) => ({
        baseColumns: fk.columns.map((x) => x.refColumnName).join(', '),
        refTable: fk.pureName,
        refColumns: fk.columns.map((x) => x.columnName).join(', '),
        constraintName: fk.constraintName,
        columnMap: fk.columns.map((x) => ({
          columnName: x.refColumnName,
          refColumnName: x.columnName,
        })),
      })),
    ];
  }, [sourceIndex, sources]);

  const sqlPreview = React.useMemo(() => {
    const source = sources[sourceIndex];
    const target = targets[targetIndex];
    if (source && target) {
      return `${JOIN_TYPES[joinIndex]} ${target.refTable}${alias ? ` ${alias}` : ''} ON ${target.columnMap
        .map((col) => `${source.name}.${col.columnName} = ${alias || target.refTable}.${col.refColumnName}`)
        .join(' AND ')}`;
    }
    return '';
  }, [joinIndex, sources, targets, sourceIndex, targetIndex, alias]);

  const sourceKeyDown = React.useCallback((event) => {
    if (event.keyCode == keycodes.enter || event.keyCode == keycodes.rightArrow) {
      targetRef.current.focus();
    }
  }, []);
  const targetKeyDown = React.useCallback((event) => {
    if (event.keyCode == keycodes.leftArrow) {
      sourceRef.current.focus();
    }
    if (event.keyCode == keycodes.enter || event.keyCode == keycodes.rightArrow) {
      joinRef.current.focus();
    }
  }, []);
  const joinKeyDown = React.useCallback((event) => {
    if (event.keyCode == keycodes.leftArrow) {
      targetRef.current.focus();
    }
    if (event.keyCode == keycodes.enter) {
      aliasRef.current.focus();
    }
  }, []);
  const aliasKeyDown = React.useCallback(
    (event) => {
      if (event.keyCode == keycodes.enter) {
        event.preventDefault();
        modalState.close();
        onInsert(sqlPreview);
      }
    },
    [onInsert, sqlPreview]
  );

  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Insert join</ModalHeader>
      <ModalContent>
        <FlexLine>
          <FlexColumn>
            <Label>Existing table</Label>
            <TableControl
              rows={sources}
              focusOnCreate
              selectedIndex={sourceIndex}
              setSelectedIndex={setSourceIndex}
              onKeyDown={sourceKeyDown}
              tableRef={sourceRef}
            >
              <TableColumn fieldName="alias" header="Alias" />
              <TableColumn fieldName="name" header="Name" />
            </TableControl>
          </FlexColumn>
          <FlexColumn>
            <Label>New table</Label>
            <TableControl
              rows={targets}
              selectedIndex={targetIndex}
              setSelectedIndex={setTargetIndex}
              tableRef={targetRef}
              onKeyDown={targetKeyDown}
            >
              <TableColumn fieldName="baseColumns" header="Column from" />
              <TableColumn fieldName="refTable" header="Table to" />
              <TableColumn fieldName="refColumns" header="Column to" />
              {/* <TableColumn fieldName="constraintName" header="Foreign key" /> */}
            </TableControl>
          </FlexColumn>
          <FlexColumn>
            <Label>Join</Label>
            <TableControl
              rows={JOIN_TYPES.map((name) => ({ name }))}
              selectedIndex={joinIndex}
              setSelectedIndex={setJoinIndex}
              tableRef={joinRef}
              onKeyDown={joinKeyDown}
            >
              <TableColumn fieldName="name" header="Join type" />
            </TableControl>
            <Label>Alias</Label>
            <TextField
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              editorRef={aliasRef}
              onKeyDown={aliasKeyDown}
            />
          </FlexColumn>
        </FlexLine>
        <SqlWrapper>
          <SqlEditor value={sqlPreview} engine={engine} readOnly />
        </SqlWrapper>
      </ModalContent>

      <ModalFooter>
        <FormStyledButton
          value="OK"
          onClick={() => {
            modalState.close();
            onInsert(sqlPreview);
          }}
        />
        <FormStyledButton type="button" value="Close" onClick={modalState.close} />
      </ModalFooter>
    </ModalBase>
  );
}
