import React from 'react';
import { ContextMenu } from './DropDownMenu';
import uuidv1 from 'uuid/v1';

const Context = React.createContext(null);

export function MenuLayerProvider({ children }) {
  const [menu, setMenu] = React.useState(null);
  return <Context.Provider value={[menu, setMenu]}>{children}</Context.Provider>;
}

export function MenuLayer() {
  const [menu] = React.useContext(Context);
  return (
    <div>
      {menu != null && (
        <ContextMenu key={menu.menuid} left={menu.left} top={menu.top}>
          {menu.menu}
        </ContextMenu>
      )}
    </div>
  );
}

export function useHideMenu() {
  const [, setMenu] = React.useContext(Context);
  return () => setMenu(null);
}

export function useShowMenu() {
  const [, setMenu] = React.useContext(Context);
  const showMenu = (left, top, menu) => {
    const menuid = uuidv1();
    setMenu({ menuid, left, top, menu });
  };
  return showMenu;
  // const container = document.createElement('div');
  // document.body.appendChild(container);
  // ReactDOM.render(<ShowModalComponent renderModal={renderModal} container={container} />, container);
}
