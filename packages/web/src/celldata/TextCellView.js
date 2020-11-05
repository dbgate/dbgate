import React from 'react';
import styled from 'styled-components';

const StyledInput = styled.textarea`
  flex: 1;
`;

export function TextCellViewWrap({ value, grider, selection }) {
  return <StyledInput value={value} wrap="hard" readOnly />;
}

export function TextCellViewNoWrap({ value, grider, selection }) {
  return (
    <StyledInput
      value={value}
      wrap="off"
      readOnly
      //   readOnly={grider ? !grider.editable : true}
      //   onChange={(e) => grider.setCellValue(selection[0].row, selection[0].column, e.target.value)}
    />
  );
}
