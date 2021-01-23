import React from 'react';
import styled from 'styled-components';
import DomTableRef from './DomTableRef';
import _ from 'lodash';
import useTheme from '../theme/useTheme';
import { useShowMenu } from '../modals/showMenu';
import { DropDownMenuDivider, DropDownMenuItem } from '../modals/DropDownMenu';
import { isConnectedByReference } from './designerTools';

const StyledSvg = styled.svg`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

const ReferenceWrapper = styled.div`
  position: absolute;
  border: 1px solid ${props => props.theme.designer_line};
  background-color: ${props => props.theme.designer_background};
  z-index: 900;
  border-radius: 10px;
  width: 32px;
  height: 32px;
`;

const ReferenceText = styled.span`
  position: relative;
  float: left;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 900;
  white-space: nowrap;
  background-color: ${props => props.theme.designer_background};
`;

function ReferenceContextMenu({ remove, setJoinType, isConnected }) {
  return (
    <>
      <DropDownMenuItem onClick={remove}>Remove</DropDownMenuItem>
      {!isConnected && (
        <>
          <DropDownMenuDivider />
          <DropDownMenuItem onClick={() => setJoinType('INNER JOIN')}>Set INNER JOIN</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setJoinType('LEFT JOIN')}>Set LEFT JOIN</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setJoinType('RIGHT JOIN')}>Set RIGHT JOIN</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setJoinType('FULL OUTER JOIN')}>Set FULL OUTER JOIN</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setJoinType('CROSS JOIN')}>Set CROSS JOIN</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setJoinType('WHERE EXISTS')}>Set WHERE EXISTS</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setJoinType('WHERE NOT EXISTS')}>Set WHERE NOT EXISTS</DropDownMenuItem>
        </>
      )}
    </>
  );
}

export default function DesignerReference({
  domTablesRef,
  reference,
  changeToken,
  onRemoveReference,
  onChangeReference,
  designer,
}) {
  const { designerId, sourceId, targetId, columns, joinType } = reference;
  const theme = useTheme();
  const showMenu = useShowMenu();
  const domTables = domTablesRef.current;
  /** @type {DomTableRef} */
  const sourceTable = domTables[sourceId];
  /** @type {DomTableRef} */
  const targetTable = domTables[targetId];
  if (!sourceTable || !targetTable) return null;
  const sourceRect = sourceTable.getRect();
  const targetRect = targetTable.getRect();
  if (!sourceRect || !targetRect) return null;

  const buswi = 10;
  const extwi = 25;

  const possibilities = [];
  possibilities.push({ xsrc: sourceRect.left - buswi, dirsrc: -1, xdst: targetRect.left - buswi, dirdst: -1 });
  possibilities.push({ xsrc: sourceRect.left - buswi, dirsrc: -1, xdst: targetRect.right + buswi, dirdst: 1 });
  possibilities.push({ xsrc: sourceRect.right + buswi, dirsrc: 1, xdst: targetRect.left - buswi, dirdst: -1 });
  possibilities.push({ xsrc: sourceRect.right + buswi, dirsrc: 1, xdst: targetRect.right + buswi, dirdst: 1 });

  let minpos = _.minBy(possibilities, p => Math.abs(p.xsrc - p.xdst));

  let srcY = _.mean(columns.map(x => sourceTable.getColumnY(x.source)));
  let dstY = _.mean(columns.map(x => targetTable.getColumnY(x.target)));

  if (columns.length == 0) {
    srcY = sourceTable.getColumnY('');
    dstY = targetTable.getColumnY('');
  }

  const src = { x: minpos.xsrc, y: srcY };
  const dst = { x: minpos.xdst, y: dstY };

  const lineStyle = { fill: 'none', stroke: theme.designer_line, strokeWidth: 2 };

  const handleContextMenu = event => {
    event.preventDefault();
    showMenu(
      event.pageX,
      event.pageY,
      <ReferenceContextMenu
        remove={() => onRemoveReference({ designerId })}
        isConnected={isConnectedByReference(designer, { designerId: sourceId }, { designerId: targetId }, reference)}
        setJoinType={joinType => {
          onChangeReference({
            ...reference,
            joinType,
          });
        }}
      />
    );
  };

  return (
    <>
      <StyledSvg>
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
      <ReferenceWrapper
        theme={theme}
        style={{
          left: (src.x + extwi * minpos.dirsrc + dst.x + extwi * minpos.dirdst) / 2 - 16,
          top: (src.y + dst.y) / 2 - 16,
        }}
        onContextMenu={handleContextMenu}
      >
        <ReferenceText theme={theme}>
          {_.snakeCase(joinType || 'CROSS JOIN')
            .replace('_', '\xa0')
            .replace('_', '\xa0')}
        </ReferenceText>
      </ReferenceWrapper>
    </>
  );
}
