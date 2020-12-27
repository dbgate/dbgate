import React from 'react';
import styled from 'styled-components';
import DesignerTable from './DesignerTable';
import uuidv1 from 'uuid/v1';
import useTheme from '../theme/useTheme';
import DesignerReference from './DesignerReference';

const Wrapper = styled.div`
  flex: 1;
  background-color: ${(props) => props.theme.designer_background};
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
      const newValue = {
        ...value,
        tables: (value.tables || []).map((x) => (x.designerId == table.designerId ? table : x)),
      };
      onChange(newValue);
    },
    [onChange, value]
  );

  const bringToFront = React.useCallback(
    (table) => {
      const newValue = {
        ...value,
        tables: [...(value.tables || []).filter((x) => x.designerId != table.designerId), table],
      };

      onChange(newValue);
    },
    [onChange, value]
  );

  const removeTable = React.useCallback(
    (table) => {
      const newValue = {
        ...value,
        tables: (value.tables || []).filter((x) => x.designerId != table.designerId),
      };

      onChange(newValue);
    },
    [onChange, value]
  );

  const changeReference = React.useCallback(
    (ref) => {
      const newValue = {
        ...value,
        references: (value.references || []).map((x) => (x.designerId == ref.designerId ? ref : x)),
      };
      onChange(newValue);
    },
    [onChange, value]
  );

  const removeReference = React.useCallback(
    (ref) => {
      const newValue = {
        ...value,
        references: (value.references || []).filter((x) => x.designerId != ref.designerId),
      };

      onChange(newValue);
    },
    [onChange, value]
  );

  const handleCreateReference = (source, target) => {
    const existingReference = (value.references || []).find(
      (x) =>
        (x.sourceId == source.designerId && x.targetId == target.designerId) ||
        (x.sourceId == target.designerId && x.targetId == source.designerId)
    );
    const newValue = {
      ...value,
      references: existingReference
        ? value.references.map((ref) =>
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
            ...(value.references || []),
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

    onChange(newValue);
  };

  //   React.useEffect(() => {
  //     setTimeout(() => setChangeToken((x) => x + 1), 100);
  //   }, [value]);

  return (
    <Wrapper onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} theme={theme} ref={wrapperRef}>
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
    </Wrapper>
  );
}
