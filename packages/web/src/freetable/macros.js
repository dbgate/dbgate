const macros = [
  {
    title: 'Remove diacritics',
    name: 'removeDiacritics',
    group: 'Text',
    description: 'Removes diacritics from selected cells',
    type: 'transformValue',
    code: `return modules.lodash.deburr(value)`,
  },
  {
    title: 'Search & replace text',
    name: 'stringReplace',
    group: 'Text',
    description: 'Search & replace text or regular expression',
    type: 'transformValue',
    args: [
      {
        type: 'text',
        label: 'Find',
        name: 'find',
      },
      {
        type: 'text',
        label: 'Replace with',
        name: 'replace',
      },
    ],
    code: `return value ? value.toString().replace(args.find, args.replace) : value`,
  },
  {
    title: 'Change text case',
    name: 'changeTextCase',
    group: 'Text',
    description: 'Uppercase, lowercase and other case functions',
    type: 'transformValue',
    args: [
      {
        type: 'select',
        options: ['toUpper', 'toLower', 'lowerCase', 'upperCase', 'kebabCase', 'snakeCase', 'camelCase', 'startCase'],
        label: 'Type',
        name: 'caseTransform',
      },
    ],
    code: `return modules.lodash[args.caseTransform || 'toUpper'](value)`,
  },
  {
    title: 'Row index',
    name: 'rowIndex',
    group: 'Tools',
    description: 'index of row from 1 (autoincrement)',
    type: 'transformValue',
    code: `return rowIndex + 1`,
  },
];

export default macros;
