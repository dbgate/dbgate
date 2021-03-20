import _ from 'lodash';
import { currentDropDownMenu } from '../stores';

export default function contextMenu(node, items) {
  const handleContextMenu = e => {
    e.preventDefault();
    e.stopPropagation();
    const left = e.pageX;
    const top = e.pageY;
    currentDropDownMenu.set({ left, top, items: _.isFunction(items) ? items() : items });
  };

  node.addEventListener('contextmenu', handleContextMenu);

  return {
    destroy() {
      node.removeEventListener('contextmenu', handleContextMenu);
    },
    update(value) {
      items = value;
    },
  };
}
