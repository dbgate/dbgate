import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { LoadingToken, sleep } from '../utility/common';

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

// (DropDownMenuItem as any).contextTypes = {
//     parentMenu: PropTypes.any
// };

// interface IDropDownMenuLinkProps {
//     href: string;
//     keyText?: string;
// }

// export class DropDownMenuLink extends React.Component<IDropDownMenuLinkProps> {
//     render() {
//         return <li onMouseEnter={this.handleMouseEnter.bind(this)}><Link forceSimpleLink href={this.props.href}>{this.props.children}{this.props.keyText && <span className='context_menu_key_text'>{this.props.keyText}</span>}</Link></li>;
//     }

//     handleMouseEnter() {
//         if (this.context.parentMenu) this.context.parentMenu.closeSubmenu();
//     }
// }

// (DropDownMenuLink as any).contextTypes = {
//     parentMenu: PropTypes.any
// };

// // export function DropDownMenu(props: { children?: any }) {
// //     return <div className="btn-group">
// //         <button type="button" className="btn btn-default dropdown-toggle btn-xs" data-toggle="dropdown"
// //             aria-haspopup="true" aria-expanded="false" tabIndex={-1}>
// //             <span className="caret"></span>
// //         </button>
// //         <ul className="dropdown-menu">
// //             {props.children}
// //         </ul>
// //     </div>
// // }

// export function DropDownMenuDivider(props: {}) {
//   return <li className="dropdown-divider"></li>;
// }

// export class DropDownSubmenuItem extends React.Component<IDropDownSubmenuItemProps> {
//     menuInstance: ContextMenu;
//     domObject: Element;

//     render() {
//         return <li onMouseEnter={this.handleMouseEnter.bind(this)} ref={x => this.domObject = x}><Link onClick={() => null}>{this.props.title} <IconSpan icon='fa-caret-right' /></Link></li>;
//     }

//     closeSubmenu() {
//         if (this.menuInstance != null) {
//             this.menuInstance.close();
//             this.menuInstance = null;
//         }

//         if (this.context.parentMenu) this.context.parentMenu.submenu = null;
//     }

//     closeOtherSubmenu() {
//         if (this.context.parentMenu) this.context.parentMenu.closeSubmenu();
//     }

//     handleMouseEnter() {
//         this.closeOtherSubmenu();

//         let offset = $(this.domObject).offset();
//         let width = $(this.domObject).width();

//         this.menuInstance = showMenuCore(offset.left + width, offset.top, this);
//         if (this.context.parentMenu) this.context.parentMenu.submenu = this;
//     }
// }

// (DropDownSubmenuItem as any).contextTypes = {
//     parentMenu: PropTypes.any
// };

// export class DropDownMenu extends React.Component<IDropDownMenuProps, IDropDownMenuState> {
//     domButton: Element;

//     constructor(props) {
//         super(props);
//         this.state = {
//             isExpanded: false,
//         };
//     }

//     render() {
//         let className = this.props.classOverride || ('btn btn-xs btn-default drop_down_menu_button ' + (this.props.className || ''));
//         return <button id={this.props.buttonElementId} type="button" className={className} tabIndex={-1} onClick={this.menuButtonClick} ref={x => this.domButton = x}>
//             { this.props.title  }
//             { this.props.iconSpan || <span className="caret"></span>}
//         </button>
//     }

//     @autobind
//     menuButtonClick() {
//         if (this.state.isExpanded) {
//             hideMenu();
//             return;
//         }
//         let offset = $(this.domButton).offset();
//         let height = $(this.domButton).height();
//         this.setState({ isExpanded: true })
//         showMenu(offset.left, offset.top + height + 5, this, () => this.setState({ isExpanded: false }));
//     }
// }

export function ContextMenu({ left, top, children }) {
  return <ContextMenuStyled style={{ left: `${left}px`, top: `${top}px` }}>{children}</ContextMenuStyled>;
}

// export class ContextMenu extends React.Component<IContextMenuProps> {
//     domObject: Element;
//     submenu: DropDownSubmenuItem;

//     render() {
//         return <ul className='context_menu' style={{ left: `${this.props.left}px`, top: `${this.props.top}px` }} ref={x => this.domObject = x} onContextMenu={e => e.preventDefault()}>
//             {this.props.children}
//         </ul>;
//     }

//     componentDidMount() {
//         fixPopupPlacement(this.domObject);
//     }

//     getChildContext() {
//         return { parentMenu: this };
//     }

//     closeSubmenu() {
//         if (this.submenu) {
//             this.submenu.closeSubmenu();
//         }
//     }

//     close() {
//         this.props.container.remove();
//         this.closeSubmenu();
//     }
// }

// (ContextMenu as any).childContextTypes = {
//     parentMenu: PropTypes.any
// };

let menuHandle = null;
let hideToken = null;

function showMenuCore(left, top, contentHolder, closeCallback = null) {
  let container = document.createElement('div');
  let handle = {
    container,
    closeCallback,
    close() {
      this.container.remove();
    },
  };
  document.body.appendChild(container);
  ReactDOM.render(
    <ContextMenu left={left} top={top}>
      {contentHolder}
    </ContextMenu>,
    container
  );
  return handle;
}

export function showMenu(left, top, contentHolder, closeCallback = null) {
  hideMenu();
  if (hideToken) hideToken.cancel();
  menuHandle = showMenuCore(left, top, contentHolder, closeCallback);
  captureMouseDownEvents();
}

function captureMouseDownEvents() {
  document.addEventListener('mousedown', mouseDownListener, true);
}

function releaseMouseDownEvents() {
  document.removeEventListener('mousedown', mouseDownListener, true);
}

function captureMouseUpEvents() {
  document.addEventListener('mouseup', mouseUpListener, true);
}

function releaseMouseUpEvents() {
  document.removeEventListener('mouseup', mouseUpListener, true);
}

async function mouseDownListener(e) {
  captureMouseUpEvents();
}

async function mouseUpListener(e) {
  let token = new LoadingToken();
  hideToken = token;
  await sleep(0);
  if (token.isCanceled) return;
  hideMenu();
}

function hideMenu() {
  if (menuHandle == null) return;
  menuHandle.close();
  if (menuHandle.closeCallback) menuHandle.closeCallback();
  menuHandle = null;
  releaseMouseDownEvents();
  releaseMouseUpEvents();
}

function getElementOffset(element) {
  var de = document.documentElement;
  var box = element.getBoundingClientRect();
  var top = box.top + window.pageYOffset - de.clientTop;
  var left = box.left + window.pageXOffset - de.clientLeft;
  return { top: top, left: left };
}

export function fixPopupPlacement(element) {
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
