import React from 'react';

function reducer(state, action) {
  switch (action.type) {
    case 'set':
      // console.log('SET', state.history, action.value);
      return {
        history: [...state.history.slice(0, state.current + 1), action.value],
        current: state.current + 1,
        value: action.value,
      };
    case 'undo':
      if (state.current > 0)
        return {
          history: state.history,
          current: state.current - 1,
          value: state.history[state.current - 1],
        };
      return state;
    case 'redo':
      if (state.current < state.history.length - 1)
        return {
          history: state.history,
          current: state.current + 1,
          value: state.history[state.current + 1],
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
