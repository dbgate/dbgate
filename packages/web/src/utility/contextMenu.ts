import _ from 'lodash';
import { getContext, setContext } from 'svelte';
import { currentDropDownMenu } from '../stores';

export function registerMenu(items) {
  const parentMenu = getContext('componentContextMenu');
  setContext('componentContextMenu', parentMenu ? [parentMenu, items] : items);
}

export default function contextMenu(node, items) {
  const handleContextMenu = e => {
    e.preventDefault();
    e.stopPropagation();
    if (items) {
      const left = e.pageX;
      const top = e.pageY;
      currentDropDownMenu.set({ left, top, items });
    }
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

function doExtractMenuItems(menu, res) {
  if (_.isFunction(menu)) {
    doExtractMenuItems(menu(), res);
  } else if (_.isArray(menu)) {
    for (const item of menu) {
      doExtractMenuItems(item, res);
    }
  } else if (_.isPlainObject(menu)) {
    res.push(menu);
  }
}

export function extractMenuItems(menu) {
  const res = [];
  doExtractMenuItems(menu, res);
  return res;
}
