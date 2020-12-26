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

export default function DesignerReference({ domTablesRef, designerId, source, target, changeToken }) {
  const domTables = domTablesRef.current;
  /** @type {DomTableRef} */
  const sourceTable = domTables[source.designerId];
  /** @type {DomTableRef} */
  const targetTable = domTables[target.designerId];
  if (!sourceTable || !targetTable) return null;
  const sourceRect = sourceTable.getRect();
  const targetRect = targetTable.getRect();
  if (!sourceRect || !targetRect) return null;
  const sourceY = sourceTable.getColumnY(source.columnName);
  const targetY = targetTable.getColumnY(target.columnName);
  if (sourceY == null || targetY == null) return null;
  return (
    <StyledSvg>
      <line
        x1={sourceRect.left}
        y1={sourceY}
        x2={targetRect.left}
        y2={targetY}
        style={{ stroke: 'rgb(255,0,0)', strokeWidth: 2 }}
      />
    </StyledSvg>
  );
  // return <div>{source.columnName}</div>;
}
