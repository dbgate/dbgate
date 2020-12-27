import React from 'react';
import styled from 'styled-components';
import DomTableRef from './DomTableRef';
import _ from 'lodash';
import useTheme from '../theme/useTheme';

const StyledSvg = styled.svg`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

export default function DesignerReference({ domTablesRef, designerId, sourceId, targetId, columns, changeToken }) {
  const theme = useTheme();
  const domTables = domTablesRef.current;
  /** @type {DomTableRef} */
  const sourceTable = domTables[sourceId];
  /** @type {DomTableRef} */
  const targetTable = domTables[targetId];
  if (!sourceTable || !targetTable) return null;
  const sourceRect = sourceTable.getRect();
  const targetRect = targetTable.getRect();
  if (!sourceRect || !targetRect) return null;
  const sourceY = sourceTable.getColumnY(columns[0].source);
  const targetY = targetTable.getColumnY(columns[0].target);
  if (sourceY == null || targetY == null) return null;

  const buswi = 10;
  const extwi = 25;

  const possibilities = [];
  possibilities.push({ xsrc: sourceRect.left - buswi, dirsrc: -1, xdst: targetRect.left - buswi, dirdst: -1 });
  possibilities.push({ xsrc: sourceRect.left - buswi, dirsrc: -1, xdst: targetRect.right + buswi, dirdst: 1 });
  possibilities.push({ xsrc: sourceRect.right + buswi, dirsrc: 1, xdst: targetRect.left - buswi, dirdst: -1 });
  possibilities.push({ xsrc: sourceRect.right + buswi, dirsrc: 1, xdst: targetRect.right + buswi, dirdst: 1 });

  let minpos = _.minBy(possibilities, (p) => Math.abs(p.xsrc - p.xdst));

  let srcY = _.mean(columns.map((x) => sourceTable.getColumnY(x.source)));
  let dstY = _.mean(columns.map((x) => targetTable.getColumnY(x.target)));

  //   let srcY = _.mean(sourceTable.table.columns.map((x) => sourceTable.getColumnY(source.columnName)));
  //   let dstY = _.mean(ref.columns.map((x) => table2.getColumnY(x.column2.name)));

  if (columns.length == 0) {
    srcY = sourceTable.getColumnY('');
    dstY = targetTable.getColumnY('');
  }

  const src = { x: minpos.xsrc, y: srcY };
  const dst = { x: minpos.xdst, y: dstY };

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
  const lineStyle = { fill: 'none', stroke: theme.designer_line, strokeWidth: 2 };

  return (
    <StyledSvg>
      {/* <line
        x1={sourceRect.left}
        y1={sourceY}
        x2={targetRect.left}
        y2={targetY}
        style={{ stroke: 'rgb(255,0,0)', strokeWidth: 2 }}
      /> */}
      <polyline
        points={`
            ${src.x},${src.y}
            ${src.x + extwi * minpos.dirsrc},${src.y}
            ${dst.x + extwi * minpos.dirdst},${dst.y}
            ${dst.x},${dst.y}
        `}
        style={lineStyle}
      />
      {columns.map((col, colIndex) => {
        let y1 = sourceTable.getColumnY(col.source);
        let y2 = targetTable.getColumnY(col.target);
        return (
          <React.Fragment key={colIndex}>
            <polyline
              points={`
                ${src.x},${src.y}
                ${src.x},${y1}
                ${src.x - buswi * minpos.dirsrc},${y1}
              `}
              style={lineStyle}
            />
            <polyline
              points={`
                ${dst.x},${dst.y}
                ${dst.x},${y2}
                ${dst.x - buswi * minpos.dirdst},${y2}
              `}
              style={lineStyle}
            />
          </React.Fragment>
        );
      })}
    </StyledSvg>
  );
  // return <div>{source.columnName}</div>;
}
