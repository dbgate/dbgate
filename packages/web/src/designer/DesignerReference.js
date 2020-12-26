import React from 'react';
import styled from 'styled-components';
import DomTableRef from './DomTableRef';

const StyledSvg = styled.svg`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

export default function DesignerReference({ domTables, designerId, source, target }) {
  console.log('domTables', domTables);
  /** @type {DomTableRef} */
  const sourceTable = domTables[source.designerId];
  /** @type {DomTableRef} */
  const targetTable = domTables[target.designerId];
  if (!sourceTable || !targetTable) return null;
  const sourceRect = sourceTable.getRect();
  const targetRect = targetTable.getRect();
  console.log('LINE', sourceRect.left, sourceRect.top, targetRect.left, targetRect.top);
  return (
    <StyledSvg>
      <line
        x1={sourceRect.left}
        y1={sourceRect.top}
        x2={targetRect.left}
        y2={targetRect.top}
        style={{ stroke: 'rgb(255,0,0)', strokeWidth: 2 }}
      />
    </StyledSvg>
  );
  // return <div>{source.columnName}</div>;
}
