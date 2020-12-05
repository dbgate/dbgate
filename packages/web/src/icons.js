import React from 'react';

const iconNames = {
  'icon minus-box': 'mdi mdi-minus-box-outline',
  'icon plus-box': 'mdi mdi-plus-box-outline',
  'icon invisible-box': 'mdi mdi-minus-box-outline icon-invisible',
  'icon cloud-upload': 'mdi mdi-cloud-upload',
  'icon import': 'mdi mdi-application-import',
  'icon export': 'mdi mdi-application-export',
  'icon new-connection': 'mdi mdi-database-plus',
  'icon tables': 'mdi mdi-table-multiple',

  'icon database': 'mdi mdi-database',
  'icon server': 'mdi mdi-server',
  'icon table': 'mdi mdi-table',
  'icon archive': 'mdi mdi-archive',
  'icon file': 'mdi mdi-file',
  'icon loading': 'mdi mdi-loading mdi-spin',
  'icon close': 'mdi mdi-close',
  'icon filter': 'mdi mdi-filter',
  'icon filter-off': 'mdi mdi-filter-off',
  'icon reload': 'mdi mdi-reload',
  'icon undo': 'mdi mdi-undo',
  'icon redo': 'mdi mdi-redo',
  'icon save': 'mdi mdi-content-save',
  'icon account': 'mdi mdi-account',
  'icon sql-file': 'mdi mdi-file',
  'icon web': 'mdi mdi-web',

  'icon edit': 'mdi mdi-pencil',
  'icon delete': 'mdi mdi-delete',
  'icon arrow-up': 'mdi mdi-arrow-up',
  'icon arrow-down': 'mdi mdi-arrow-down',
  'icon arrow-left': 'mdi mdi-arrow-left',
  'icon arrow-right': 'mdi mdi-arrow-right',
  'icon format-code': 'mdi mdi-code-tags-check',
  'icon show-wizard': 'mdi mdi-comment-edit',
  'icon disconnected': 'mdi mdi-lan-disconnect',
  'icon theme': 'mdi mdi-brightness-6',
  'icon error': 'mdi mdi-close-circle',
  'icon ok': 'mdi mdi-check-circle',

  'icon run': 'mdi mdi-play',
  'icon chevron-down': 'mdi mdi-chevron-down',
  'icon plugin': 'mdi mdi-toy-brick',

  'img ok': 'mdi mdi-check-circle color-green-8',
  'img alert': 'mdi mdi-alert-circle color-blue-6',
  'img error': 'mdi mdi-close-circle color-red-7',
  'img warn': 'mdi mdi-alert color-gold-7',
  // 'img statusbar-ok': 'mdi mdi-check-circle color-on-statusbar-green',

  'img archive': 'mdi mdi-table color-gold-7',
  'img archive-folder': 'mdi mdi-database-outline color-green-7',
  'img autoincrement': 'mdi mdi-numeric-1-box-multiple-outline',
  'img column': 'mdi mdi-table-column',
  'img server': 'mdi mdi-server color-blue-7',
  'img primary-key': 'mdi mdi-key-star color-yellow-7',
  'img foreign-key': 'mdi mdi-key-link',
  'img sql-file': 'mdi mdi-file',
  'img shell': 'mdi mdi-flash color-blue-7',

  'img free-table': 'mdi mdi-table color-green-7',
  'img macro': 'mdi mdi-hammer-wrench',

  'img database': 'mdi mdi-database color-gold-7',
  'img table': 'mdi mdi-table color-blue-7',
  'img view': 'mdi mdi-table color-magenta-7',
  'img procedure': 'mdi mdi-cog color-blue-7',
  'img function': 'mdi mdi-function-variant',

  'img sort-asc': 'mdi mdi-sort-alphabetical-ascending color-green',
  'img sort-desc': 'mdi mdi-sort-alphabetical-descending color-green',

  'img reference': 'mdi mdi-link-box',
  'img link': 'mdi mdi-link',
};

export function FontIcon({ icon, className = '', ...other }) {
  if (!icon) return null;
  let cls = icon;
  if (icon.startsWith('icon ') || icon.startsWith('img ')) {
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
