import { writable } from 'svelte/store';

export default function createReducer(reducer, initialState): any {
  const state = writable(initialState);

  function dispatch(action) {
    state.update(x => reducer(x, action));
  }

  return [state, dispatch];
}
