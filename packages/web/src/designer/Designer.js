import React from 'react';
import styled from 'styled-components';
import DesignerTable from './DesignerTable';
import uuidv1 from 'uuid/v1';

const Wrapper = styled.div`
  flex: 1;
`;

export default function Designer({ value, onChange }) {
  const { tables } = value || {};
  const handleDrop = (e) => {
    var data = e.dataTransfer.getData('app_object_drag_data');
    e.preventDefault();
    if (!data) return;
    var json = JSON.parse(data);
    json.designerId = uuidv1();
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

  return (
    <Wrapper onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      {(tables || []).map((table) => (
        <DesignerTable key={table.designerId} {...table} onChangeTable={changeTable} onBringToFront={bringToFront} />
      ))}
    </Wrapper>
  );
}
