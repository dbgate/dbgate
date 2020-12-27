import React from 'react';
import styled from 'styled-components';
import DomTableRef from './DomTableRef';
import _ from 'lodash';

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

//   const buswi = 10;
//   const extwi = 25;

//   const possibilities = [];
//   possibilities.push({ xsrc: sourceRect.left - buswi, dirsrc: -1, xdst: targetRect.left - buswi, dirdst: -1 });
//   possibilities.push({ xsrc: sourceRect.left - buswi, dirsrc: -1, xdst: targetRect.right + buswi, dirdst: 1 });
//   possibilities.push({ xsrc: sourceRect.right + buswi, dirsrc: 1, xdst: targetRect.left - buswi, dirdst: -1 });
//   possibilities.push({ xsrc: sourceRect.right + buswi, dirsrc: 1, xdst: targetRect.right + buswi, dirdst: 1 });

//   let minpos = _.minBy(possibilities, (p) => Math.abs(p.xsrc - p.xdst));

//   let srcY = _.mean(sourceTable.table.columns.map((x) => sourceTable.getColumnY(source.columnName)));
//   let dstY = _.mean(ref.columns.map((x) => table2.getColumnY(x.column2.name)));

//   if (ref.columns.length == 0) {
//     srcY = table1.getColumnY('');
//     dstY = table2.getColumnY('');
//   }

//   let src = { x: minpos.xsrc - canvasOffset.left, y: srcY - canvasOffset.top };
//   let dst = { x: minpos.xdst - canvasOffset.left, y: dstY - canvasOffset.top };

//   ctx.moveTo(src.x, src.y);
//   ctx.lineTo(src.x + extwi * minpos.dirsrc, src.y);
//   ctx.lineTo(dst.x + extwi * minpos.dirdst, dst.y);
//   ctx.lineTo(dst.x, dst.y);
//   ctx.stroke();

//   for (let col of ref.columns) {
//     let y1 = table1.getColumnY(col.column1.name);
//     let y2 = table2.getColumnY(col.column2.name);

//     ctx.moveTo(src.x, src.y);
//     ctx.lineTo(src.x, y1 - canvasOffset.top);
//     ctx.lineTo(src.x - buswi * minpos.dirsrc, y1 - canvasOffset.top);
//     ctx.stroke();

//     ctx.moveTo(dst.x, dst.y);
//     ctx.lineTo(dst.x, y2 - canvasOffset.top);
//     ctx.lineTo(dst.x - buswi * minpos.dirdst, y2 - canvasOffset.top);
//     ctx.stroke();
//   }

//   this.referencePositions[ref.uniqueName] = {
//     x: (src.x + extwi * minpos.dirsrc + dst.x + extwi * minpos.dirdst) / 2,
//     y: (src.y + dst.y) / 2,
//   };

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
