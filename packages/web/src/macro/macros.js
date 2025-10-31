import { __t } from '../translations';

const macros = [
  {
    title: __t('datagrid.macros.removeDiacritics', { defaultMessage: 'Remove diacritics' }),
    name: 'removeDiacritics',
    group: __t('datagrid.macros.textGroup', { defaultMessage: 'Text' }),
    description: __t('datagrid.macros.removeDiacriticsDescription', { defaultMessage: 'Removes diacritics from selected cells' }),
    type: 'transformValue',
    code: `return modules.lodash.deburr(value)`,
  },
  {
    title: __t('datagrid.macros.searchReplaceText', { defaultMessage: 'Search & replace text' }),
    name: 'stringReplace',
    group: __t('datagrid.macros.textGroup', { defaultMessage: 'Text' }),
    description: __t('datagrid.macros.searchReplaceTextDescription', { defaultMessage: 'Search & replace text or regular expression' }),
    type: 'transformValue',
    args: [
      {
        type: 'text',
        label: __t('datagrid.macros.searchReplaceTextFind', { defaultMessage: 'Find' }),
        name: 'find',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.searchReplaceTextReplaceWith', { defaultMessage: 'Replace with' }),
        name: 'replace',
      },
      {
        type: 'checkbox',
        label: __t('datagrid.macros.searchReplaceTextCaseSensitive', { defaultMessage: 'Case sensitive' }),
        name: 'caseSensitive',
      },
      {
        type: 'checkbox',
        label: __t('datagrid.macros.searchReplaceTextIsRegex', { defaultMessage: 'Regular expression' }),
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
    title: __t('datagrid.macros.changeTextCase', { defaultMessage: 'Change text case' }),
    name: 'changeTextCase',
    group: __t('datagrid.macros.textGroup', { defaultMessage: 'Text' }),
    description: __t('datagrid.macros.changeTextCaseDescription', { defaultMessage: 'Uppercase, lowercase and other case functions' }),
    type: 'transformValue',
    args: [
      {
        type: 'select',
        options: ['toUpper', 'toLower', 'lowerCase', 'upperCase', 'kebabCase', 'snakeCase', 'camelCase', 'startCase'],
        label: __t('datagrid.macros.changeTextCaseType', { defaultMessage: 'Type' }),
        name: 'type',
        default: 'toUpper',
      },
    ],
    code: `return modules.lodash[args.type](value)`,
  },
  {
    title: __t('datagrid.macros.padLeft', { defaultMessage: 'Pad left' }),
    name: 'padLeft',
    group: __t('datagrid.macros.textGroup', { defaultMessage: 'Text' }),
    args: [
      {
        type: 'text',
        label: __t('datagrid.macros.padCharacter', { defaultMessage: 'Character' }),
        name: 'character',
        default: '0',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.padLength', { defaultMessage: 'Length' }),
        name: 'length',
        default: '3',
      },
    ],
    description:
      __t('datagrid.macros.padLeftDescription', { defaultMessage: 'Returns string of a specified length in which the beginning of the current string is padded with spaces or other character' }),
    type: 'transformValue',
    code: `return modules.lodash.padStart(value, +args.length, args.character)`,
  },
  {
    title: __t('datagrid.macros.padRight', { defaultMessage: 'Pad right' }),
    name: 'padRight',
    group: __t('datagrid.macros.textGroup', { defaultMessage: 'Text' }),
    args: [
      {
        type: 'text',
        label: __t('datagrid.macros.padCharacter', { defaultMessage: 'Character' }),
        name: 'character',
        default: '0',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.padLength', { defaultMessage: 'Length' }),
        name: 'length',
        default: '3',
      },
    ],
    description:
      __t('datagrid.macros.padRightDescription', { defaultMessage: 'Returns string of a specified length in which the end of the current string is padded with spaces or other character' }),
    type: 'transformValue',
    code: `return modules.lodash.padEnd(value, +args.length, args.character)`,
  },
  {
    title: __t('datagrid.macros.trim', { defaultMessage: 'Trim' }),
    name: 'trim',
    group: __t('datagrid.macros.textGroup', { defaultMessage: 'Text' }),
    description: __t('datagrid.macros.trimDescription', { defaultMessage: 'Removes leading and trailing whitespace' }),
    type: 'transformValue',
    code: `return modules.lodash.trim(value)`,
  },
  {
    title: __t('datagrid.macros.rowIndex', { defaultMessage: 'Row index' }),
    name: 'rowIndex',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.rowIndexDescription', { defaultMessage: 'Index of row from 1 (autoincrement)' }),
    type: 'transformValue',
    code: `return rowIndex + 1`,
  },
  {
    title: __t('datagrid.macros.generateUUID', { defaultMessage: 'Generate UUID' }),
    name: 'uuidv1',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.generateUUIDDescription', { defaultMessage: 'Generate unique identifier' }),
    type: 'transformValue',
    args: [
      {
        type: 'select',
        options: [
          { value: 'uuidv1', name: 'V1 - from timestamp' },
          { value: 'uuidv4', name: 'V4 - random generated'},
        ],
        label: __t('datagrid.macros.version', { defaultMessage: 'Version' }),
        name: 'version',
        default: 'uuidv1',
      },
    ],
    code: `return modules[args.version]()`,
  },
  {
    title: __t('datagrid.macros.toInt', { defaultMessage: 'Convert to integer' }),
    name: 'toInt',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.toIntDescription', { defaultMessage: 'Converts to integral number' }),
    type: 'transformValue',
    code: `return modules.lodash.isNaN(parseInt(value)) ? null : parseInt(value)`,
  },
  {
    title: __t('datagrid.macros.toNumber', { defaultMessage: 'Convert to number' }),
    name: 'toNumber',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.toNumberDescription', { defaultMessage: 'Converts to number' }),
    type: 'transformValue',
    code: `return modules.lodash.isNaN(parseFloat(value)) ? null : parseFloat(value)`,
  },
  {
    title: __t('datagrid.macros.toBoolean', { defaultMessage: 'Convert to boolean' }),
    name: 'toBoolean',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.toBooleanDescription', { defaultMessage: 'Converts to boolean' }),
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
    title: __t('datagrid.macros.toString', { defaultMessage: 'Convert to string' }),
    name: 'toString',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.toStringDescription', { defaultMessage: 'Converts to string' }),
    type: 'transformValue',
    code: `
    if (value==null) return null;
    if (value && value.$oid) return value.$oid;
    return value.toString();
  `,
  },
  {
    title: __t('datagrid.macros.currentDate', { defaultMessage: 'Current date' }),
    name: 'currentDate',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.currentDateDescription', { defaultMessage: 'Gets current date' }),
    type: 'transformValue',
    args: [
      {
        type: 'text',
        label: __t('datagrid.macros.format', { defaultMessage: 'Format' }),
        name: 'format',
        default: 'YYYY-MM-DD HH:mm:ss',
      },
    ],
    code: `return modules.moment().format(args.format)`,
  },
  {
    title: __t('datagrid.macros.duplicateColumns', { defaultMessage: 'Duplicate columns' }),
    name: 'duplicateColumns',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.duplicateColumnsDescription', { defaultMessage: 'Duplicate selected columns' }),
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
        label: __t('datagrid.macros.prefix', { defaultMessage: 'Prefix' }),
        name: 'prefix',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.postfix', { defaultMessage: 'Postfix' }),
        name: 'postfix',
        default: '_copy',
      },
    ],
  },
  {
    title: __t('datagrid.macros.splitColumns', { defaultMessage: 'Split columns' }),
    name: 'splitColumns',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.splitColumnsDescription', { defaultMessage: 'Split selected columns' }),
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
        label: __t('datagrid.macros.delimiter', { defaultMessage: 'Delimiter' }),
        name: 'delimiter',
        default: ',',
      },
    ],
  },
  {
    title: __t('datagrid.macros.calculation', { defaultMessage: 'Calculation' }),
    name: 'calculation',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.calculationDescription', { defaultMessage: 'Custom expression. Use row.column_name for accessing column values, value for original value' }),
    type: 'transformValue',
    args: [
      {
        type: 'text',
        label: __t('datagrid.macros.expression', { defaultMessage: 'Expression' }),
        name: 'expression',
        default: 'value',
      },
    ],
    code: `return eval(args.expression);`,
  },
  {
    title: __t('datagrid.macros.extractDateFields', { defaultMessage: 'Extract date fields' }),
    name: 'extractDateFields',
    group: __t('datagrid.macros.toolsGroup', { defaultMessage: 'Tools' }),
    description: __t('datagrid.macros.extractDateFieldsDescription', { defaultMessage: 'Extract year, month, day and other date/time fields from selection and adds it as new columns' }),
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
        label: __t('datagrid.macros.yearName', { defaultMessage: 'Year name' }),
        name: 'year',
        default: 'year',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.monthName', { defaultMessage: 'Month name' })  ,
        name: 'month',
        default: 'month',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.dayName', { defaultMessage: 'Day name' }),
        name: 'day',
        default: 'day',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.hourName', { defaultMessage: 'Hour name' }),
        name: 'hour',
        default: 'hour',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.minuteName', { defaultMessage: 'Minute name' }),
        name: 'minute',
        default: 'minute',
      },
      {
        type: 'text',
        label: __t('datagrid.macros.secondName', { defaultMessage: 'Second name' }),
        name: 'second',
        default: 'second',
      },
    ],
  },
];

export default macros;
