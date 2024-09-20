import _ from 'lodash';
import { getContext, setContext } from 'svelte';
import invalidateCommands from '../commands/invalidateCommands';
import { runGroupCommand } from '../commands/runCommand';
import { currentDropDownMenu, visibleCommandPalette } from '../stores';
import getAsArray from './getAsArray';

export function registerMenu(...items) {
  const parentMenu = getContext('componentContextMenu');
  setContext('componentContextMenu', [parentMenu, ...items]);
}

export default function contextMenu(node, items: any = []) {
  const handleContextMenu = async e => {
    e.preventDefault();
    e.stopPropagation();

    await invalidateCommands();

    if (items) {
      const left = e.pageX;
      const top = e.pageY;
      currentDropDownMenu.set({ left, top, items, targetElement: e.target });
    }
  };

  if (items == '__no_menu') return;

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

function doExtractMenuItems(menu, res, options) {
  if (_.isFunction(menu)) {
    doExtractMenuItems(menu(options), res, options);
  } else if (_.isArray(menu)) {
    for (const item of menu) {
      doExtractMenuItems(item, res, options);
    }
  } else if (_.isPlainObject(menu) && !menu._skip) {
    res.push(menu);
  }
}

function processTags(items) {
  const res = [];
  const tagged = [];

  for (const menu of items.filter(x => x.tag)) {
    tagged.push({
      ...menu,
      tags: getAsArray(menu.tag),
    });
  }

  for (const menu of items.filter(x => !x.tag)) {
    if (menu.placeTag) {
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

  // append tagged, which were not appended by placeTag
  res.push(...tagged);

  return res;
}

function extractMenuItems(menu, options = null) {
  let res = [];
  doExtractMenuItems(menu, res, options);
  // console.log('BEFORE PROCESS TAGS', res);
  res = processTags(res);
  return res;
}

function mapItem(item, commands) {
  if (item.command) {
    const command = commands[item.command];
    if (command) {
      return {
        text: item.text || command.menuName || command.toolbarName || command.name,
        keyText: command.keyText || command.keyTextFromGroup || command.disableHandleKeyText,
        onClick: () => {
          if (command.isGroupCommand) {
            runGroupCommand(command.group);
          } else {
            if (command.getSubCommands) visibleCommandPalette.set(command);
            else if (command.onClick) command.onClick();
          }
        },
        disabled: !command.enabled,
        hideDisabled: item.hideDisabled,
      };
    }
    return null;
  }
  return item;
}

function filterMenuItems(items) {
  const res = [];
  let wasDivider = false;
  let wasItem = false;
  for (const item of items.filter(x => !x.disabled || !x.hideDisabled)) {
    if (item.divider) {
      if (wasItem) {
        wasDivider = true;
      }
    } else {
      if (wasDivider) {
        res.push({ divider: true });
      }
      wasDivider = false;
      wasItem = true;
      res.push(item);
    }
  }
  return res;
}

export function getContextMenu(): any {
  return getContext('componentContextMenu');
}

export function prepareMenuItems(items, options, commandsCustomized) {
  const extracted = extractMenuItems(items, options);
  // console.log('EXTRACTED', extracted);
  const compacted = _.compact(extracted.map(x => mapItem(x, commandsCustomized)));
  // console.log('COMPACTED', compacted);
  const filtered = filterMenuItems(compacted);
  // console.log('FILTERED', filtered);
  return filtered;
}
