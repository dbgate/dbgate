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

  const handleCreateReference = (source, target) => {
    const newValue = {
      ...value,
      references: [
        ...(value.references || []),
        {
          designerId: uuidv1(),
          source,
          target,
        },
      ],
    };

    onChange(newValue);
  };

  return (
    <Wrapper onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} theme={theme} ref={wrapperRef}>
      {(references || []).map((ref) => (
        <DesignerReference key={ref.designerId} domTables={domTablesRef.current} {...ref} />
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
          wrapperRef={wrapperRef}
          onChangeDomTable={(table) => {
            domTablesRef.current[table.designerId] = table;
          }}
        />
      ))}
    </Wrapper>
  );
}
