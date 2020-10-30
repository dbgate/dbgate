const macros = [
  {
    title: 'Remove diacritics',
    name: 'removeDiacritics',
    group: 'text',
    description: 'Removes diacritics from selected cells',
    type: 'transformValue',
    code: `value => modules.diacritics.remove(value)`,
  },
  {
    title: 'Search & replace text',
    name: 'stringReplace',
    group: 'text',
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
    code: `value => value ? value.toString().replace(args.find, args.replace) : value`,
  },
];

export default macros;
