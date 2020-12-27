import React from 'react';
import styled from 'styled-components';
import DesignerTable from './DesignerTable';
import uuidv1 from 'uuid/v1';
import useTheme from '../theme/useTheme';
import DesignerReference from './DesignerReference';

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

export default function Designer({ value, onChange }) {
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
    json.designerId = uuidv1();
    json.left = e.clientX - rect.left;
    json.top = e.clientY - rect.top;
    onChange({
      ...value,
      tables: [...(tables || []), json],
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

  const handleSelectColumn = React.useCallback(
    (column) => {
      onChange((current) => ({
        ...current,
        columns: (current.columns || []).find(
          (x) => x.designerId == column.designerId && x.columnName == column.columnName
        )
          ? current.columns
          : [...(current.columns || []), column],
      }));
    },
    [onChange]
  );

  //   React.useEffect(() => {
  //     setTimeout(() => setChangeToken((x) => x + 1), 100);
  //   }, [value]);

  return (
    <Wrapper theme={theme}>
      <Canvas onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} ref={wrapperRef}>
        {(references || []).map((ref) => (
          <DesignerReference
            key={ref.designerId}
            changeToken={changeToken}
            domTablesRef={domTablesRef}
            reference={ref}
            onChangeReference={changeReference}
            onRemoveReference={removeReference}
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
            table={table}
            onChangeTable={changeTable}
            onBringToFront={bringToFront}
            onRemoveTable={removeTable}
            setChangeToken={setChangeToken}
            wrapperRef={wrapperRef}
            onChangeDomTable={(table) => {
              domTablesRef.current[table.designerId] = table;
            }}
          />
        ))}
      </Canvas>
    </Wrapper>
  );
}
