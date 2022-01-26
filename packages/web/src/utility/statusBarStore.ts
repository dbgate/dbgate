import { writable } from "svelte/store";

export const statusBarTabInfo = writable({});

// export function updateStatuBarInfo(tabid, info) {
//   statusBarTabInfo.update(x => ({
//     ...x,
//     [tabid]: info,
//   }));
// }

export function updateStatuBarInfoItem(tabid, key, item) {
  statusBarTabInfo.update(tabs => {
    const items = tabs[tabid] || [];
    let newItems;
    if (item == null) {
      newItems = items.filter(x => x.key != key);
    } else if (items.find(x => x.key == key)) {
      newItems = items.map(x => (x.key == key ? { ...item, key } : x));
    } else {
      newItems = [...items, { ...item, key }];
    }
    return {
      ...tabs,
      [tabid]: newItems,
    };
  });
}
