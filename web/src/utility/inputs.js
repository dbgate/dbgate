import React from 'react';

export function TextField({ ...other }) {
  return <input type="text" {...other}></input>;
}

export function SelectField({ children, ...other }) {
  return (
    <select {...other}>
      {children}
    </select>
  );
}
