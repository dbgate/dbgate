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
      {
        type: 'checkbox',
        label: 'Case sensitive',
        name: 'caseSensitive',
      },
      {
        type: 'checkbox',
        label: 'Regular expression',
        name: 'isRegex',
      },
    ],
    code: `
const rtext = args.isRegex ? args.find : modules.lodash.escapeRegExp(args.find);
const rflags = args.caseSensitive ? 'g' : 'ig';
return value ? value.toString().replace(new RegExp(rtext, rflags), args.replace || '') : value
    `,
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
        name: 'type',
        default: 'toUpper',
      },
    ],
    code: `return modules.lodash[args.type](value)`,
  },
  {
    title: 'Pad left',
    name: 'padLeft',
    group: 'Text',
    args: [
      {
        type: 'text',
        label: 'Character',
        name: 'character',
        default: '0',
      },
      {
        type: 'text',
        label: 'Length',
        name: 'length',
        default: '3',
      },
    ],
    description:
      'Returns string of a specified length in which the beginning of the current string is padded with spaces or other character',
    type: 'transformValue',
    code: `return modules.lodash.padStart(value, +args.length, args.character)`,
  },
  {
    title: 'Pad right',
    name: 'padRight',
    group: 'Text',
    args: [
      {
        type: 'text',
        label: 'Character',
        name: 'character',
        default: '0',
      },
      {
        type: 'text',
        label: 'Length',
        name: 'length',
        default: '3',
      },
    ],
    description:
      'Returns string of a specified length in which the end of the current string is padded with spaces or other character',
    type: 'transformValue',
    code: `return modules.lodash.padEnd(value, +args.length, args.character)`,
  },
  {
    title: 'Trim',
    name: 'trim',
    group: 'Text',
    description: 'Removes leading and trailing whitespace ',
    type: 'transformValue',
    code: `return modules.lodash.trim(value)`,
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
        name: 'version',
        default: 'uuidv1',
      },
    ],
    code: `return modules[args.version]()`,
  },
  {
    title: 'Convert to integer',
    name: 'toInt',
    group: 'Tools',
    description: 'Converts to integral number',
    type: 'transformValue',
    code: `return modules.lodash.isNaN(parseInt(value)) ? null : parseInt(value)`,
  },
  {
    title: 'Convert to number',
    name: 'toNumber',
    group: 'Tools',
    description: 'Converts to number',
    type: 'transformValue',
    code: `return modules.lodash.isNaN(parseFloat(value)) ? null : parseFloat(value)`,
  },
  {
    title: 'Convert to boolean',
    name: 'toBoolean',
    group: 'Tools',
    description: 'Converts to boolean',
    type: 'transformValue',
    code: `
if (modules.lodash.isString(value)) {
  if (value.toLowerCase()=='true') return true;
  if (value.toLowerCase()=='false') return false;
  if (value == '1') return true;
  if (value == '0') return false;
  if (value.toLowerCase()=='t') return true;
  if (value.toLowerCase()=='f') return false;
} 
if (value==null) return null;
return !!value;
  `,
  },
  {
    title: 'Convert to string',
    name: 'toString',
    group: 'Tools',
    description: 'Converts to string',
    type: 'transformValue',
    code: `
    if (value==null) return null;
    if (value && value.$oid) return value.$oid;
    return value.toString();
  `,
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
        name: 'format',
        default: 'YYYY-MM-DD HH:mm:ss',
      },
    ],
    code: `return modules.moment().format(args.format)`,
  },
  {
    title: 'Duplicate columns',
    name: 'duplicateColumns',
    group: 'Tools',
    description: 'Duplicate selected columns',
    type: 'transformRow',
    code: `
      return {
        ...row,
        ...modules.lodash.fromPairs(columns.map(col=>[(args.prefix || '') + col + (args.postfix || ''), row[col]]))
      }
    `,
    args: [
      {
        type: 'text',
        label: 'Prefix',
        name: 'prefix',
      },
      {
        type: 'text',
        label: 'Postfix',
        name: 'postfix',
        default: '_copy',
      },
    ],
  },
  {
    title: 'Split columns',
    name: 'splitColumns',
    group: 'Tools',
    description: 'Split selected columns',
    type: 'transformRow',
    code: `
       const res = {...row};
       for(const col of columns) {
          const value = row[col];
          if (modules.lodash.isString(value)) {
            const splitted = value.split(args.delimiter);      
            splitted.forEach((splitValue, valueIndex) => {
              const name = col + '_' + (valueIndex + 1).toString();
              res[name] = splitValue;
            });
          }
       }
       return res;
    `,
    args: [
      {
        type: 'text',
        label: 'Delimiter',
        name: 'delimiter',
        default: ',',
      },
    ],
  },
  {
    title: 'Calculation',
    name: 'calculation',
    group: 'Tools',
    description: 'Custom expression. Use row.column_name for accessing column values, value for original value',
    type: 'transformValue',
    args: [
      {
        type: 'text',
        label: 'Expression',
        name: 'expression',
        default: 'value',
      },
    ],
    code: `return eval(args.expression);`,
  },
  {
    title: 'Extract date fields',
    name: 'extractDateFields',
    group: 'Tools',
    description: 'Extract yaear, month, day and other date/time fields from selection and adds it as new columns',
    type: 'transformRow',
    code: `
      let mom = null;
      for(const col of columns) {
        const m = modules.moment(row[col]);
        if (m.isValid()) {
          mom = m;
          break;
        }
      }

      if (!mom) return row;

      const addedColumnNames = modules.lodash.compact([args.year, args.month, args.day, args.hour, args.minute, args.second]);

      const fields = {
        [args.year]: mom.year(),
        [args.month]: mom.month() + 1,
        [args.day]: mom.day(),
        [args.hour]: mom.hour(),
        [args.minute]: mom.minute(),
        [args.second]: mom.second(),
      };
    
      return {
        ...row,
        ...modules.lodash.pick(fields, addedColumnNames),
      };
    `,
    args: [
      {
        type: 'text',
        label: 'Year name',
        name: 'year',
        default: 'year',
      },
      {
        type: 'text',
        label: 'Month name',
        name: 'month',
        default: 'month',
      },
      {
        type: 'text',
        label: 'Day name',
        name: 'day',
        default: 'day',
      },
      {
        type: 'text',
        label: 'Hour name',
        name: 'hour',
        default: 'hour',
      },
      {
        type: 'text',
        label: 'Minute name',
        name: 'minute',
        default: 'minute',
      },
      {
        type: 'text',
        label: 'Second name',
        name: 'second',
        default: 'second',
      },
    ],
  },
];

export default macros;
