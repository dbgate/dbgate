import _ from 'lodash';

export interface WidgetBarStoredProps {
  contentHeight: number;
  collapsed: boolean;
}

export interface WidgetBarStoredPropsResult {
  [name: string]: WidgetBarStoredProps;
}

export interface WidgetBarComputedProps {
  contentHeight: number;
  storedHeight?: number;
  visibleItemsCount: number;
  splitterVisible: boolean;
  collapsed: boolean;
  clickableTitle: boolean;
}

export interface WidgetBarComputedResult {
  [name: string]: WidgetBarComputedProps;
}

export interface WidgetBarItemDefinition {
  name: string;
  height?: string; // e.g. '200px' or '30%'
  collapsed: boolean; // initial value of collapsing status
  skip: boolean;
  minimalContentHeight: number;
  storeHeight: boolean;
}

export type PushWidgetBarItemDefinitionFunction = (def: WidgetBarItemDefinition) => void;
export type UpdateWidgetBarItemDefinitionFunction = (name: string, def: Partial<WidgetBarItemDefinition>) => void;
export type ResizeWidgetItemFunction = (name: string, deltaY: number) => void;
export type ToggleCollapseWidgetItemFunction = (name: string) => void;

export interface WidgetBarContainerProps {
  clientHeight: number;
  titleHeight: number;
  splitterHeight: number;
}

// accordeon mode - only one item can be expanded at a time
export function widgetShouldBeInAccordeonMode(
  container: WidgetBarContainerProps,
  definitions: WidgetBarItemDefinition[]
): boolean {
  const visibleItems = definitions.filter(def => !def.skip);

  const availableContentHeight =
    container.clientHeight -
    visibleItems.length * container.titleHeight -
    Math.max(0, visibleItems.length - 1) * container.splitterHeight;

  const minimalRequiredContentHeight = _.sum(visibleItems.map(def => def.minimalContentHeight));
  return availableContentHeight < minimalRequiredContentHeight;
}

export function computeInitialWidgetBarProps(
  container: WidgetBarContainerProps,
  definitions: WidgetBarItemDefinition[],
  currentProps: WidgetBarComputedResult
): WidgetBarComputedResult {
  if (!container.clientHeight) {
    return currentProps;
  }
  const visibleItems = definitions.filter(def => !def.skip);
  const expandedItems = visibleItems.filter(def => !(currentProps[def.name]?.collapsed ?? def.collapsed));
  const res: WidgetBarComputedResult = {};

  const availableContentHeight =
    container.clientHeight -
    visibleItems.length * container.titleHeight -
    Math.max(0, expandedItems.length - 1) * container.splitterHeight;

  if (widgetShouldBeInAccordeonMode(container, definitions)) {
    // In accordeon mode, only the first expanded item is shown, others are collapsed
    const expandedItem = visibleItems.find(def => !def.collapsed);
    for (const def of visibleItems) {
      const isExpanded = def.name === expandedItem?.name;
      res[def.name] = {
        contentHeight: isExpanded ? availableContentHeight : 0,
        storedHeight: currentProps[def.name]?.contentHeight,
        visibleItemsCount: visibleItems.length,
        splitterVisible: false,
        collapsed: !isExpanded,
        clickableTitle: !isExpanded,
      };
    }
    return res;
  }

  // First pass: calculate base heights
  let totalContentHeight = 0;
  const itemHeights = {};

  const flexibleItems = [];
  for (const def of expandedItems) {
    if (def.storeHeight && currentProps[def.name]?.storedHeight > 0) {
      const storedHeight = currentProps[def.name].storedHeight;
      itemHeights[def.name] = storedHeight;
      totalContentHeight += storedHeight;
    } else if (def.height) {
      let height = 0;
      if (_.isString(def.height) && def.height.endsWith('px')) {
        height = parseInt(def.height.slice(0, -2));
      } else if (_.isString(def.height) && def.height.endsWith('%'))
        height = (availableContentHeight * parseFloat(def.height.slice(0, -1))) / 100;
      else {
        height = parseInt(def.height);
      }
      if (height < def.minimalContentHeight) {
        height = def.minimalContentHeight;
      }
      totalContentHeight += height;
      itemHeights[def.name] = height;
    } else {
      flexibleItems.push(def);
    }
  }

  // Second pass - distribute remaining height
  if (flexibleItems.length > 0) {
    let remainingHeight = availableContentHeight - totalContentHeight;
    for (const def of flexibleItems) {
      let height = remainingHeight / flexibleItems.length;
      if (height < def.minimalContentHeight) height = def.minimalContentHeight;
      itemHeights[def.name] = height;
    }
  }

  // Third pass - update heights to match available height
  totalContentHeight = _.sum(Object.values(itemHeights));
  if (totalContentHeight > 0 && totalContentHeight != availableContentHeight) {
    const scale = availableContentHeight / totalContentHeight;
    for (const def of expandedItems) {
      itemHeights[def.name] = itemHeights[def.name] * scale;
    }
  }
  
  // Fourth pass - ensure minimal heights are respected and redistribute if needed
  totalContentHeight = 0;
  for (const def of expandedItems) {
    if (itemHeights[def.name] < def.minimalContentHeight) {
      itemHeights[def.name] = def.minimalContentHeight;
    }
    totalContentHeight += itemHeights[def.name];
  }
  
  // Fifth pass - if we're below available height, distribute extra to flexible items
  if (totalContentHeight < availableContentHeight && flexibleItems.length > 0) {
    const extraHeight = availableContentHeight - totalContentHeight;
    for (const def of flexibleItems) {
      itemHeights[def.name] += extraHeight / flexibleItems.length;
    }
  }

  // Final assembly of results
  let visibleIndex = 0;
  for (const def of visibleItems) {
    const isExpanded = expandedItems.includes(def);
    const expandedIndex = expandedItems.indexOf(def);
    res[def.name] = {
      contentHeight: Math.round(itemHeights[def.name] || 0),
      visibleItemsCount: visibleItems.length,
      splitterVisible: isExpanded && expandedItems.length > 1 && expandedIndex < expandedItems.length - 1,
      collapsed: !isExpanded,
      storedHeight: currentProps[def.name]?.storedHeight,
      clickableTitle: true,
    };
    visibleIndex += 1;
  }

  return res;
}

export function handleResizeWidgetBar(
  container: WidgetBarContainerProps,
  definitions: WidgetBarItemDefinition[],
  currentProps: WidgetBarComputedResult,
  resizedItemName: string,
  deltaY: number
): WidgetBarComputedResult {
  const res = _.cloneDeep(currentProps);
  const visibleItems = definitions.filter(def => !def.skip);
  const currentItemDef = definitions.find(def => def.name === resizedItemName);
  if (!currentItemDef || currentItemDef.collapsed) return res;
  const currentItemProps = res[resizedItemName];
  let itemIndex = visibleItems.findIndex(def => def.name === resizedItemName);
  const itemProps = res[currentItemDef.name];
  
  // Find next expanded item to resize
  let nextItemDef = null;
  let nextItemProps = null;
  for (let i = itemIndex + 1; i < visibleItems.length; i++) {
    const def = visibleItems[i];
    if (!res[def.name].collapsed) {
      nextItemDef = def;
      nextItemProps = res[def.name];
      break;
    }
  }
  const currentHeight = itemProps.contentHeight;
  if (!nextItemDef) return res;

  if (deltaY < 0) {
    let newHeight = currentHeight + deltaY;
    if (newHeight < currentItemDef.minimalContentHeight) {
      newHeight = currentItemDef.minimalContentHeight;
    }
    const actualDeltaY = newHeight - currentHeight;
    nextItemProps.contentHeight -= actualDeltaY;
    currentItemProps.contentHeight += actualDeltaY;

    // // moving up - reduce height of resized item, if too small, reduce height of previous items
    // let remainingDeltaY = -deltaY;
    // let itemIndex = visibleItems.findIndex(def => def.name === resizedItemName);
    // while (remainingDeltaY > 0 && itemIndex >= 0) {
    //   const itemDef = visibleItems[itemIndex];
    //   const itemProps = res[itemDef.name];
    //   const currentHeight = itemProps.contentHeight;
    //   const minimalHeight = itemDef.minimalContentHeight;
    //   const reducibleHeight = currentHeight - minimalHeight;
    //   if (reducibleHeight > 0) {
    //     const reduction = Math.min(reducibleHeight, remainingDeltaY);
    //     itemProps.contentHeight -= reduction;
    //     remainingDeltaY -= reduction;
    //   }
    //   itemIndex -= 1;
    // }
  } else {
    let newHeight = nextItemProps.contentHeight - deltaY;
    if (newHeight < nextItemDef.minimalContentHeight) {
      newHeight = nextItemDef.minimalContentHeight;
    }
    const actualDeltaY = nextItemProps.contentHeight - newHeight;
    nextItemProps.contentHeight -= actualDeltaY;
    currentItemProps.contentHeight += actualDeltaY;

    // moving down - increase height of resized item, reduce size of next item, if too small, reduce size of further items
    // if all items below are at minimal height, stop
    // let remainingDeltaY = deltaY;
    // let itemIndex = visibleItems.findIndex(def => def.name === resizedItemName);
    // while (remainingDeltaY > 0 && itemIndex < visibleItems.length) {
    //   const itemDef = visibleItems[itemIndex];
    //   const itemProps = res[itemDef.name];
    //   const currentHeight = itemProps.contentHeight;
    //   const minimalHeight = itemDef.minimalContentHeight;
    //   const reducibleHeight = currentHeight - minimalHeight;
    //   if (reducibleHeight > 0) {
    //     const reduction = Math.min(reducibleHeight, remainingDeltaY);
    //     itemProps.contentHeight -= reduction;
    //     resizedItemProps.contentHeight += reduction;
    //     remainingDeltaY -= reduction;
    //   }
    //   itemIndex += 1;
    // }
  }

  if (currentItemDef.storeHeight) {
    currentItemProps.storedHeight = currentItemProps.contentHeight;
  }

  if (nextItemDef.storeHeight) {
    nextItemProps.storedHeight = nextItemProps.contentHeight;
  }

  // Auto-collapse widgets that are too small
  let hasCollapsedItems = false;
  for (const def of visibleItems) {
    const itemProps = res[def.name];
    if (!itemProps.collapsed && itemProps.contentHeight <= def.minimalContentHeight) {
      itemProps.collapsed = true;
      hasCollapsedItems = true;
    }
  }

  // If we auto-collapsed items, recalculate heights to redistribute space
  if (hasCollapsedItems) {
    return computeInitialWidgetBarProps(container, definitions, res);
  }

  return res;
}

export function toggleCollapseWidgetBar(
  container: WidgetBarContainerProps,
  definitions: WidgetBarItemDefinition[],
  currentProps: WidgetBarComputedResult,
  toggledItemName: string
): WidgetBarComputedResult {
  const visibleItems = definitions.filter(def => !def.skip);

  if (widgetShouldBeInAccordeonMode(container, definitions)) {
    // In accordeon mode, only the first expanded item is shown, others are collapsed
    const res: WidgetBarComputedResult = {};
    for (const def of visibleItems) {
      const isExpanded = def.name === toggledItemName;
      res[def.name] = {
        contentHeight: undefined,
        visibleItemsCount: visibleItems.length,
        splitterVisible: false,
        collapsed: !isExpanded,
        clickableTitle: !isExpanded,
      };
    }
    return res;
  }

  const res = _.cloneDeep(currentProps);
  res[toggledItemName].collapsed = !res[toggledItemName].collapsed;
  return computeInitialWidgetBarProps(container, definitions, res);
}

export function extractStoredWidgetBarProps(
  definitions: WidgetBarItemDefinition[],
  currentProps: WidgetBarComputedResult
): WidgetBarStoredPropsResult {
  const res: WidgetBarStoredPropsResult = {};
  for (const key in currentProps) {
    const def = definitions.find(d => d.name === key);
    if (!def) continue;
    res[key] = {
      contentHeight: def.storeHeight ? currentProps[key]?.storedHeight : undefined,
      collapsed: currentProps[key]?.collapsed,
    };
  }

  return res;
}

export function createWidgetBarComputedResultFromStored(stored: WidgetBarStoredPropsResult): WidgetBarComputedResult {
  const res: WidgetBarComputedResult = {};
  if (!stored) return res;
  let visibleIndex = 0;
  const visibleCount = Object.keys(stored).length;
  for (const key in stored) {
    res[key] = {
      storedHeight: stored[key]?.contentHeight,
      contentHeight: 0,
      collapsed: stored[key]?.collapsed,
      clickableTitle: false,
      splitterVisible: visibleCount > 1 && visibleIndex < visibleCount - 1,
      visibleItemsCount: 0,
    };
    visibleIndex += 1;
  }
  return res;
}
