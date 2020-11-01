import React from 'react';

export function TextField({ editorRef = undefined, ...other }) {
  return <input type="text" {...other} ref={editorRef}></input>;
}

export function SelectField({ children = null, options = [], ...other }) {
  return (
    <select {...other}>
      {children}
      {options.map((x) => (
        <option value={x.value} key={x.value}>
          {x.label}
        </option>
      ))}
    </select>
  );
}

export function CheckboxField({ editorRef = undefined, ...other }) {
  return <input type="checkbox" {...other} ref={editorRef}></input>;
}
