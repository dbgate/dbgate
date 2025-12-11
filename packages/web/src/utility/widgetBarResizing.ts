import _ from 'lodash';
import is from 'zod/v4/locales/is.cjs';

export interface WidgetBarStoredProps {
  contentHeight: number;
  collapsed: boolean;
}

export interface WidgetBarComputedProps {
  contentHeight: number;
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
  let totalFlexibleItems = 0;
  const itemHeights = {};

  for (const def of expandedItems) {
    if (def.height) {
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
      totalFlexibleItems += 1;
    }
  }

  // Second pass - distribute remaining height
  if (totalFlexibleItems > 0) {
    let remainingHeight = availableContentHeight - totalContentHeight;
    for (const def of expandedItems) {
      if (!def.height) {
        let height = remainingHeight / totalFlexibleItems;
        if (height < def.minimalContentHeight) height = def.minimalContentHeight;
        itemHeights[def.name] = height;
      }
    }
  }

  // Third pass - update heights to match available height
  totalContentHeight = _.sum(Object.values(itemHeights));
  if (totalContentHeight != availableContentHeight) {
    const scale = availableContentHeight / totalContentHeight;
    for (const def of expandedItems) {
      itemHeights[def.name] = itemHeights[def.name] * scale;
    }
  }

  // Final assembly of results
  let visibleIndex = 0;
  for (const def of visibleItems) {
    res[def.name] = {
      contentHeight: Math.round(itemHeights[def.name] || 0),
      visibleItemsCount: visibleItems.length,
      splitterVisible: visibleItems.length > 1 && visibleIndex < visibleItems.length - 1,
      collapsed: !expandedItems.includes(def),
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
  const resizedItemDef = definitions.find(def => def.name === resizedItemName);
  if (!resizedItemDef || resizedItemDef.collapsed) return res;
  const resizedItemProps = res[resizedItemName];

  if (deltaY < 0) {
    // moving up - reduce height of resized item, if too small, reduce height of previous items
    let remainingDeltaY = -deltaY;
    let itemIndex = visibleItems.findIndex(def => def.name === resizedItemName);
    while (remainingDeltaY > 0 && itemIndex >= 0) {
      const itemDef = visibleItems[itemIndex];
      const itemProps = res[itemDef.name];
      const currentHeight = itemProps.contentHeight;
      const minimalHeight = itemDef.minimalContentHeight;
      const reducibleHeight = currentHeight - minimalHeight;
      if (reducibleHeight > 0) {
        const reduction = Math.min(reducibleHeight, remainingDeltaY);
        itemProps.contentHeight -= reduction;
        remainingDeltaY -= reduction;
      }
      itemIndex -= 1;
    }
  } else {
    // moving down - increase height of resized item, reduce size of next item, if too small, reduce size of further items
    // if all items below are at minimal height, stop
    let remainingDeltaY = deltaY;
    let itemIndex = visibleItems.findIndex(def => def.name === resizedItemName) + 1;
    while (remainingDeltaY > 0 && itemIndex < visibleItems.length) {
      const itemDef = visibleItems[itemIndex];
      const itemProps = res[itemDef.name];
      const currentHeight = itemProps.contentHeight;
      const minimalHeight = itemDef.minimalContentHeight;
      const reducibleHeight = currentHeight - minimalHeight;
      if (reducibleHeight > 0) {
        const reduction = Math.min(reducibleHeight, remainingDeltaY);
        itemProps.contentHeight -= reduction;
        resizedItemProps.contentHeight += reduction;
        remainingDeltaY -= reduction;
      }
      itemIndex += 1;
    }
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
