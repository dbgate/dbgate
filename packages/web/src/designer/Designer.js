import React from 'react';
import styled from 'styled-components';
import DesignerTable from './DesignerTable';
import uuidv1 from 'uuid/v1';
import useTheme from '../theme/useTheme';

const Wrapper = styled.div`
  flex: 1;
  background-color: ${(props) => props.theme.designer_background};
`;

export default function Designer({ value, onChange }) {
  const { tables } = value || {};
  const theme = useTheme();

  const [sourceDragColumn, setSourceDragColumn] = React.useState(null);
  const [targetDragColumn, setTargetDragColumn] = React.useState(null);

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

  return (
    <Wrapper onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} theme={theme}>
      {(tables || []).map((table) => (
        <DesignerTable
          key={table.designerId}
          sourceDragColumn={sourceDragColumn}
          setSourceDragColumn={setSourceDragColumn}
          targetDragColumn={targetDragColumn}
          setTargetDragColumn={setTargetDragColumn}
          table={table}
          onChangeTable={changeTable}
          onBringToFront={bringToFront}
          onRemoveTable={removeTable}
        />
      ))}
    </Wrapper>
  );
}
