import React from 'react';
import styled from 'styled-components';

const StyledInput = styled.textarea`
  flex: 1;
`;

export default function TextCellView({ value, grider, selection }) {
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
