import _ from 'lodash';
import createReducer from './createReducer';

const reducer = options => (state, action) => {
  const { mergeNearActions } = options || {};

  const useMerge =
    action.useMerge || (mergeNearActions && state.lastActionTm && new Date().getTime() - state.lastActionTm < 100);

  switch (action.type) {
    case 'set':
      return {
        history: [...state.history.slice(0, useMerge ? state.current : state.current + 1), action.value],
        current: useMerge ? state.current : state.current + 1,
        value: action.value,
        canUndo: true,
        canRedo: false,
        lastActionTm: new Date().getTime(),
      };
    case 'compute': {
      const newValue = action.compute(state.history[state.current]);
      return {
        history: [...state.history.slice(0, useMerge ? state.current : state.current + 1), newValue],
        current: useMerge ? state.current : state.current + 1,
        value: newValue,
        canUndo: true,
        canRedo: false,
        lastActionTm: new Date().getTime(),
      };
    }
    case 'undo':
      if (state.current > 0)
        return {
          history: state.history,
          current: state.current - 1,
          value: state.history[state.current - 1],
          canUndo: state.current > 1,
          canRedo: true,
          lastActionTm: null,
        };
      return state;
    case 'redo':
      if (state.current < state.history.length - 1)
        return {
          history: state.history,
          current: state.current + 1,
          value: state.history[state.current + 1],
          canUndo: true,
          canRedo: state.current < state.history.length - 2,
          lastActionTm: null,
        };
      return state;
    case 'reset':
      return {
        history: [action.value],
        current: 0,
        value: action.value,
        lastActionTm: null,
      };
  }
};

export default function createUndoReducer(initialValue, options = null) {
  return createReducer(reducer(options), {
    history: [initialValue],
    current: 0,
    value: initialValue,
  });
}
