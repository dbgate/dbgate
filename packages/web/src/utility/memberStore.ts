import { writable } from 'svelte/store';

export default function memberStore(store, extractStore) {
  let res;
  let unsubscribeSub = null;
  store.subscribe(value => {
    const subStore = extractStore(value);
    if (unsubscribeSub) unsubscribeSub();
    unsubscribeSub = subStore.subscribe(subValue => {
      if (res) {
        res.set(subValue);
      } else {
        res = writable(subValue);
      }
    });
  });
  return res;
}
