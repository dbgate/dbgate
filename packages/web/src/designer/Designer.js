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
    var json = JSON.parse(data);
    json.designerId = uuidv1();
    json.left = e.clientX;
    json.top = e.clientY;
    onChange({
      ...value,
      tables: [...(tables || []), json],
    });
    // var objs = AppObject.createAppObjectInstances(json);
    // let targetOffset = $(ev.target).offset();
    // for (let obj of objs) {
    //     await this.props.model.addTable(obj, ev.clientX - targetOffset.left, ev.clientY - targetOffset.top);
    // }
    // this.changedModel();
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
