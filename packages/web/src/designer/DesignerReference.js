import React from 'react';
import styled from 'styled-components';

const StyledSvg = styled.svg`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

export default function DesignerReference({ tables, designerId, source, target }) {
  const sourceTable = tables.find((x) => x.designerId == source.designerId);
  const targetTable = tables.find((x) => x.designerId == target.designerId);
  if (!sourceTable || !targetTable) return null;
  console.log('LINE', sourceTable.left, sourceTable.top, targetTable.left, targetTable.top);
  return (
    <StyledSvg>
      <line
        x1={sourceTable.left}
        y1={sourceTable.top}
        x2={targetTable.left}
        y2={targetTable.top}
        style={{ stroke: 'rgb(255,0,0)', strokeWidth: 2 }}
      />
    </StyledSvg>
  );
  // return <div>{source.columnName}</div>;
}
