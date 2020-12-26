import React from 'react';
import styled from 'styled-components';
import DesignerTable from './DesignerTable';

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
    (table, index) => {
      const newValue = {
        ...value,
        tables: (tables || []).map((t, i) => (i == index ? table : t)),
      };
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <Wrapper onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      {(tables || []).map((table, index) => (
        <DesignerTable key={index} {...table} index={index} onChangeTable={changeTable} />
      ))}
    </Wrapper>
  );
}
