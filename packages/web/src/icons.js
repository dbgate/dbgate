import React from 'react';
import _ from 'lodash';

export function ExpandIcon({ isBlank = false, isExpanded = false, className = '', ...other }) {
  if (isBlank) {
    return <span className={`mdi mdi-minus-box-outline icon-invisible ${className}`} {...other} />;
  }
  return (
    <span
      className={`${isExpanded ? 'mdi mdi-minus-box-outline' : 'mdi mdi-plus-box-outline'} ${className}`}
      {...other}
    />
  );
}
