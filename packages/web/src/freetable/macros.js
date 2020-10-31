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
    description: 'Index of row from 1 (autoincrement)',
    type: 'transformValue',
    code: `return rowIndex + 1`,
  },
  {
    title: 'Generate UUID',
    name: 'uuidv1',
    group: 'Tools',
    description: 'Generate unique identifier',
    type: 'transformValue',
    args: [
      {
        type: 'select',
        options: [
          { value: 'uuidv1', name: 'V1 - from timestamp' },
          { value: 'uuidv4', name: 'V4 - random generated' },
        ],
        label: 'Version',
        name: 'uuidVersion',
      },
    ],
    code: `return modules[args.uuidVersion || 'uuidv1']()`,
  },
  {
    title: 'Current date',
    name: 'currentDate',
    group: 'Tools',
    description: 'Gets current date',
    type: 'transformValue',
    args: [
      {
        type: 'text',
        label: 'Format',
        name: 'dateFormat',
      },
    ],
    code: `return modules.moment().format(args.dateFormat || 'YYYY-MM-DD HH:mm:ss')`,
  },
];

export default macros;
