import React from 'react';
import styled from 'styled-components';
import DesignerTable from './DesignerTable';
import uuidv1 from 'uuid/v1';
import _ from 'lodash';
import useTheme from '../theme/useTheme';
import DesignerReference from './DesignerReference';
import cleanupDesignColumns from './cleanupDesignColumns';
import { isConnectedByReference } from './designerTools';
import { getTableInfo } from '../utility/metadataLoaders';

const Wrapper = styled.div`
  flex: 1;
  background-color: ${(props) => props.theme.designer_background};
  overflow: scroll;
`;

const Canvas = styled.div`
  width: 3000px;
  height: 3000px;
  position: relative;
`;

const EmptyInfo = styled.div`
  margin: 50px;
  font-size: 20px;
`;

export default function Designer({ value, onChange, conid, database }) {
  const { tables, references } = value || {};
  const theme = useTheme();

  const [sourceDragColumn, setSourceDragColumn] = React.useState(null);
  const [targetDragColumn, setTargetDragColumn] = React.useState(null);
  const domTablesRef = React.useRef({});
  const wrapperRef = React.useRef();
  const [changeToken, setChangeToken] = React.useState(0);

  const handleDrop = (e) => {
    var data = e.dataTransfer.getData('app_object_drag_data');
    e.preventDefault();
    if (!data) return;
    const rect = e.target.getBoundingClientRect();
    var json = JSON.parse(data);
    const { objectTypeField } = json;
    if (objectTypeField != 'tables' && objectTypeField != 'views') return;
    json.designerId = uuidv1();
    json.left = e.clientX - rect.left;
    json.top = e.clientY - rect.top;

    onChange((current) => {
      const foreignKeys = _.compact([
        ...(json.foreignKeys || []).map((fk) => {
          const tables = ((current || {}).tables || []).filter(
            (tbl) => fk.refTableName == tbl.pureName && fk.refSchemaName == tbl.schemaName
          );
          if (tables.length == 1)
            return {
              ...fk,
              sourceId: json.designerId,
              targetId: tables[0].designerId,
            };
          return null;
        }),
        ..._.flatten(
          ((current || {}).tables || []).map((tbl) =>
            (tbl.foreignKeys || []).map((fk) => {
              if (fk.refTableName == json.pureName && fk.refSchemaName == json.schemaName) {
                return {
                  ...fk,
                  sourceId: tbl.designerId,
                  targetId: json.designerId,
                };
              }
              return null;
            })
          )
        ),
      ]);

      return {
        ...current,
        tables: [...((current || {}).tables || []), json],
        references:
          foreignKeys.length == 1
            ? [
                ...((current || {}).references || []),
                {
                  designerId: uuidv1(),
                  sourceId: foreignKeys[0].sourceId,
                  targetId: foreignKeys[0].targetId,
                  joinType: 'INNER JOIN',
                  columns: foreignKeys[0].columns.map((col) => ({
                    source: col.columnName,
                    target: col.refColumnName,
                  })),
                },
              ]
            : (current || {}).references,
      };
    });
  };

  const changeTable = React.useCallback(
    (table) => {
      onChange((current) => ({
        ...current,
        tables: (current.tables || []).map((x) => (x.designerId == table.designerId ? table : x)),
      }));
    },
    [onChange]
  );

  const bringToFront = React.useCallback(
    (table) => {
      onChange((current) => ({
        ...current,
        tables: [...(current.tables || []).filter((x) => x.designerId != table.designerId), table],
      }));
    },
    [onChange]
  );

  const removeTable = React.useCallback(
    (table) => {
      onChange((current) => ({
        ...current,
        tables: (current.tables || []).filter((x) => x.designerId != table.designerId),
        references: (current.references || []).filter(
          (x) => x.sourceId != table.designerId && x.targetId != table.designerId
        ),
        columns: (current.columns || []).filter((x) => x.designerId != table.designerId),
      }));
    },
    [onChange]
  );

  const changeReference = React.useCallback(
    (ref) => {
      onChange((current) => ({
        ...current,
        references: (current.references || []).map((x) => (x.designerId == ref.designerId ? ref : x)),
      }));
    },
    [onChange]
  );

  const removeReference = React.useCallback(
    (ref) => {
      onChange((current) => ({
        ...current,
        references: (current.references || []).filter((x) => x.designerId != ref.designerId),
      }));
    },
    [onChange]
  );

  const handleCreateReference = (source, target) => {
    onChange((current) => {
      const existingReference = (current.references || []).find(
        (x) =>
          (x.sourceId == source.designerId && x.targetId == target.designerId) ||
          (x.sourceId == target.designerId && x.targetId == source.designerId)
      );

      return {
        ...current,
        references: existingReference
          ? current.references.map((ref) =>
              ref == existingReference
                ? {
                    ...existingReference,
                    columns: [
                      ...existingReference.columns,
                      existingReference.sourceId == source.designerId
                        ? {
                            source: source.columnName,
                            target: target.columnName,
                          }
                        : {
                            source: target.columnName,
                            target: source.columnName,
                          },
                    ],
                  }
                : ref
            )
          : [
              ...(current.references || []),
              {
                designerId: uuidv1(),
                sourceId: source.designerId,
                targetId: target.designerId,
                joinType: isConnectedByReference(current, source, target, null) ? 'CROSS JOIN' : 'INNER JOIN',
                columns: [
                  {
                    source: source.columnName,
                    target: target.columnName,
                  },
                ],
              },
            ],
      };
    });
  };

  const handleAddReferenceByColumn = async (designerId, foreignKey) => {
    const toTable = await getTableInfo({
      conid,
      database,
      pureName: foreignKey.refTableName,
      schemaName: foreignKey.refSchemaName,
    });
    const newTableDesignerId = uuidv1();
    onChange((current) => {
      const fromTable = (current.tables || []).find((x) => x.designerId == designerId);
      if (!fromTable) return;
      return {
        ...current,
        tables: [
          ...(current.tables || []),
          {
            ...toTable,
            left: fromTable.left + 300,
            top: fromTable.top + 50,
            designerId: newTableDesignerId,
          },
        ],
        references: [
          ...(current.references || []),
          {
            designerId: uuidv1(),
            sourceId: fromTable.designerId,
            targetId: newTableDesignerId,
            joinType: 'INNER JOIN',
            columns: foreignKey.columns.map((col) => ({
              source: col.columnName,
              target: col.refColumnName,
            })),
          },
        ],
      };
    });
  };

  const handleSelectColumn = React.useCallback(
    (column) => {
      onChange((current) => ({
        ...current,
        columns: (current.columns || []).find(
          (x) => x.designerId == column.designerId && x.columnName == column.columnName
        )
          ? current.columns
          : [...cleanupDesignColumns(current.columns), _.pick(column, ['designerId', 'columnName'])],
      }));
    },
    [onChange]
  );

  const handleChangeColumn = React.useCallback(
    (column, changeFunc) => {
      onChange((current) => {
        const existing = (current.columns || []).find(
          (x) => x.designerId == column.designerId && x.columnName == column.columnName
        );
        if (existing) {
          return {
            ...current,
            columns: current.columns.map((x) => (x == existing ? changeFunc(existing) : x)),
          };
        } else {
          return {
            ...current,
            columns: [
              ...cleanupDesignColumns(current.columns),
              changeFunc(_.pick(column, ['designerId', 'columnName'])),
            ],
          };
        }
      });
    },
    [onChange]
  );

  //   React.useEffect(() => {
  //     setTimeout(() => setChangeToken((x) => x + 1), 100);
  //   }, [value]);

  return (
    <Wrapper theme={theme}>
      {(tables || []).length == 0 && <EmptyInfo>Drag &amp; drop tables or views from left panel list here</EmptyInfo>}
      <Canvas onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} ref={wrapperRef}>
        {(references || []).map((ref) => (
          <DesignerReference
            key={ref.designerId}
            changeToken={changeToken}
            domTablesRef={domTablesRef}
            reference={ref}
            onChangeReference={changeReference}
            onRemoveReference={removeReference}
            designer={value}
          />
        ))}
        {(tables || []).map((table) => (
          <DesignerTable
            key={table.designerId}
            sourceDragColumn={sourceDragColumn}
            setSourceDragColumn={setSourceDragColumn}
            targetDragColumn={targetDragColumn}
            setTargetDragColumn={setTargetDragColumn}
            onCreateReference={handleCreateReference}
            onSelectColumn={handleSelectColumn}
            onChangeColumn={handleChangeColumn}
            onAddReferenceByColumn={handleAddReferenceByColumn}
            table={table}
            onChangeTable={changeTable}
            onBringToFront={bringToFront}
            onRemoveTable={removeTable}
            setChangeToken={setChangeToken}
            wrapperRef={wrapperRef}
            onChangeDomTable={(table) => {
              domTablesRef.current[table.designerId] = table;
            }}
            designer={value}
          />
        ))}
      </Canvas>
    </Wrapper>
  );
}
