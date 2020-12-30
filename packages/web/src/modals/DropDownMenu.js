import React from 'react';
import styled from 'styled-components';
import { sleep } from '../utility/common';
import useDocumentClick from '../utility/useDocumentClick';
import { useHideMenu } from './showMenu';

const ContextMenuStyled = styled.ul`
  position: absolute;
  list-style: none;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
  padding: 5px 0;
  margin: 2px 0 0;
  font-size: 14px;
  text-align: left;
  min-width: 160px;
  z-index: 1050;
  cursor: default;
`;

const KeyTextSpan = styled.span`
  font-style: italic;
  font-weight: bold;
  text-align: right;
  margin-left: 16px;
`;

const StyledLink = styled.a`
  padding: 3px 20px;
  line-height: 1.42;
  display: block;
  white-space: nop-wrap;
  color: #262626;

  &:hover {
    background-color: #f5f5f5;
    text-decoration: none;
    color: #262626;
  }
`;

export const DropDownMenuDivider = styled.li`
  margin: 9px 0px 9px 0px;
  border-top: 1px solid #f2f2f2;
  border-bottom: 1px solid #fff;
`;

export function DropDownMenuItem({ children, keyText = undefined, onClick }) {
  const handleMouseEnter = () => {
    // if (this.context.parentMenu) this.context.parentMenu.closeSubmenu();
  };

  return (
    <li onMouseEnter={handleMouseEnter}>
      <StyledLink onClick={onClick}>
        {children}
        {keyText && <KeyTextSpan>{keyText}</KeyTextSpan>}
      </StyledLink>
    </li>
  );
}

export function ContextMenu({ left, top, children }) {
  const hideMenu = useHideMenu();
  useDocumentClick(async () => {
    await sleep(0);
    hideMenu();
  });
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (menuRef.current) fixPopupPlacement(menuRef.current);
  }, [menuRef.current]);
  return (
    <ContextMenuStyled ref={menuRef} style={{ left: `${left}px`, top: `${top}px` }}>
      {children}
    </ContextMenuStyled>
  );
}

function getElementOffset(element) {
  var de = document.documentElement;
  var box = element.getBoundingClientRect();
  var top = box.top + window.pageYOffset - de.clientTop;
  var left = box.left + window.pageXOffset - de.clientLeft;
  return { top: top, left: left };
}

function fixPopupPlacement(element) {
  const { width, height } = element.getBoundingClientRect();
  let offset = getElementOffset(element);

  let newLeft = null;
  let newTop = null;

  if (offset.left + width > window.innerWidth) {
    newLeft = offset.left - width;
  }
  if (offset.top + height > window.innerHeight) {
    newTop = offset.top - height;
  }

  if (newLeft != null) element.style.left = `${newLeft}px`;
  if (newTop != null) element.style.top = `${newTop}px`;
}
