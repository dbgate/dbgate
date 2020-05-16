import React from 'react';

export function TextField({ editorRef = undefined, ...other }) {
  return <input type="text" {...other} ref={editorRef}></input>;
}

export function SelectField({ children, ...other }) {
  return <select {...other}>{children}</select>;
}
