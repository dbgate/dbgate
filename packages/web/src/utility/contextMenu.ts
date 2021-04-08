import _ from 'lodash';
import { getContext, setContext } from 'svelte';
import { currentDropDownMenu } from '../stores';
import getAsArray from './getAsArray';

export function registerMenu(...items) {
  const parentMenu = getContext('componentContextMenu');
  setContext('componentContextMenu', [parentMenu, ...items]);
}

export default function contextMenu(node, items = []) {
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

function doExtractMenuItems(menu, res, tagged) {
  if (_.isFunction(menu)) {
    doExtractMenuItems(menu(), res, tagged);
  } else if (_.isArray(menu)) {
    for (const item of menu) {
      doExtractMenuItems(item, res, tagged);
    }
  } else if (_.isPlainObject(menu)) {
    if (menu.tag) {
      tagged.push({
        ...menu,
        tags: getAsArray(menu.tag),
      });
    } else if (menu.placeTag) {
      const placeTags = getAsArray(menu.placeTag);
      for (let index = 0; index < tagged.length; ) {
        const current = tagged[index];
        if (_.intersection(placeTags, current.tags).length > 0) {
          tagged.splice(index, 1);
          res.push(current);
        } else {
          index++;
        }
      }
    } else {
      res.push(menu);
    }
  }
}

export function extractMenuItems(menu) {
  const res = [];
  const tagged = [];
  doExtractMenuItems(menu, res, tagged);

  // append tagged, which were not appended by placeTag
  res.push(...tagged);
  return res;
}

export function getContextMenu(): any {
  return getContext('componentContextMenu');
}
