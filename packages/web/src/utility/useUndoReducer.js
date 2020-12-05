import _ from 'lodash';
import React from 'react';

function reducer(state, action) {
  switch (action.type) {
    case 'set':
      return {
        history: [...state.history.slice(0, state.current + 1), action.value],
        current: state.current + 1,
        value: action.value,
        canUndo: true,
        canRedo: false,
      };
    case 'compute': {
      const newValue = action.compute(state.history[state.current]);
      return {
        history: [...state.history.slice(0, state.current + 1), newValue],
        current: state.current + 1,
        value: newValue,
        canUndo: true,
        canRedo: false,
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
        };
      return state;
    case 'reset':
      return {
        history: [action.value],
        current: 0,
        value: action.value,
      };
  }
}

export default function useUndoReducer(initialValue) {
  return React.useReducer(reducer, {
    history: [initialValue],
    current: 0,
    value: initialValue,
  });
}
