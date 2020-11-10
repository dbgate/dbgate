import React from 'react';
import _ from 'lodash';

const iconNames = {
  'icon minus-box': 'mdi mdi-minus-box-outline',
  'icon plus-box': 'mdi mdi-plus-box-outline',
  'icon invisible-box': 'mdi mdi-minus-box-outline icon-invisible',
  'icon cloud-upload': 'mdi mdi-cloud-upload',

  'icon database': 'mdi mdi-database',
  'icon archive': 'mdi mdi-archive',
  'icon file': 'mdi mdi-file',
};

export function FontIcon({ icon, className = '', ...other }) {
  if (!icon) return null;
  let cls = icon;
  if (icon.startsWith('icon ')) {
    cls = iconNames[icon];
    if (!cls) return null;
  }
  return <span className={`${cls} ${className}`} {...other} />;
}

export function ExpandIcon({ isBlank = false, isExpanded = false, ...other }) {
  if (isBlank) {
    return <FontIcon icon="icon invisible-box" {...other} />;
  }
  return <FontIcon icon={isExpanded ? 'icon minus-box' : 'icon plus-box'} {...other} />;
}
