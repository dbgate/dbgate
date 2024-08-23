import _ from 'lodash';
import { arrayToHexString, stringifyCellValue } from 'dbgate-tools';
import yaml from 'js-yaml';
import { DataEditorTypesBehaviour } from 'dbgate-types';

export function copyTextToClipboard(text) {
  const oldFocus = document.activeElement;

  const textArea = document.createElement('textarea');

  //
  // *** This styling is an extra step which is likely not required. ***
  //
  // Why is it here? To ensure:
  // 1. the element is able to have focus and selection.
  // 2. if element was to flash render it has minimal visual impact.
  // 3. less flakyness with selection and copying which **might** occur if
  //    the textarea element is not visible.
  //
  // The likelihood is the element won't even render, not even a flash,
  // so some of these are just precautions. However in IE the element
  // is visible whilst the popup box asking the user for permission for
  // the web page to copy to the clipboard.
  //

  // Place in top-left corner of screen regardless of scroll position.
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';

  // Ensure it has a small width and height. Setting to 1px / 1em
  // doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = '2em';
  textArea.style.height = '2em';

  // We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = '0';

  // Clean up any borders.
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';

  // Avoid flash of white box if rendered for any reason.
  textArea.style.background = 'transparent';

  textArea.value = text;

  document.body.appendChild(textArea);

  textArea.select();

  try {
    let successful = document.execCommand('copy');
    if (!successful) {
      console.log('Failed copy to clipboard');
    }
  } catch (err) {
    console.log('Failed copy to clipboard: ' + err);
  }

  document.body.removeChild(textArea);

  if (oldFocus) {
    // @ts-ignore
    oldFocus.focus();
  }
}

/* Currently this doesn't work in firefox stable, but works in nightly */
export async function getClipboardText() {
  return await navigator.clipboard.readText();
}

export function extractRowCopiedValue(row, col, editorTypes?: DataEditorTypesBehaviour) {
  let value = row[col];
  if (value === undefined) value = _.get(row, col);
  return stringifyCellValue(value, 'exportIntent', editorTypes).value;
}

const clipboardHeadersFormatter = delimiter => columns => {
  return columns.join(delimiter);
};

const clipboardTextFormatter = (delimiter, headers) => (columns, rows) => {
  const lines = [];
  if (headers) lines.push(columns.join(delimiter));
  lines.push(
    ...rows.map(row => {
      if (!row) return '';
      const line = columns.map(col => extractRowCopiedValue(row, col)).join(delimiter);
      return line;
    })
  );
  return lines.join('\r\n');
};

const clipboardJsonFormatter = () => (columns, rows) => {
  return JSON.stringify(
    rows.map(row => _.pick(row, columns)),
    undefined,
    2
  );
};

const clipboardYamlFormatter = () => (columns, rows) => {
  return yaml.dump(rows.map(row => _.pick(row, columns)));
};

const clipboardJsonLinesFormatter = () => (columns, rows) => {
  return rows.map(row => JSON.stringify(_.pick(row, columns))).join('\r\n');
};

const clipboardInsertsFormatter = () => (columns, rows, options) => {
  const { schemaName, pureName, driver } = options;
  const dmp = driver.createDumper();
  for (const row of rows) {
    dmp.putCmd(
      '^insert ^into %f (%,i) ^values (%,v)',
      { schemaName, pureName },
      columns,
      columns.map(col => row[col])
    );
  }
  return dmp.s;
};

const clipboardUpdatesFormatter = () => (columns, rows, options) => {
  const { schemaName, pureName, driver, keyColumns } = options;
  const dmp = driver.createDumper();
  for (const row of rows) {
    dmp.put('^update %f ^set ', { schemaName, pureName });
    dmp.putCollection(', ', columns, col => dmp.put('%i=%v', col, row[col]));
    dmp.put(' ^where ');
    dmp.putCollection(' ^and ', keyColumns, col => dmp.put('%i=%v', col, row[col]));
    dmp.endCommand();
  }
  return dmp.s;
};

const clipboardMongoInsertFormatter = () => (columns, rows, options) => {
  const { pureName } = options;
  return rows.map(row => `db.${pureName}.insert(${JSON.stringify(_.pick(row, columns), undefined, 2)});`).join('\n');
};

export function formatClipboardRows(format, columns, rows, options) {
  if (format in copyRowsFormatDefs) {
    return copyRowsFormatDefs[format].formatter(columns, rows, options);
  }
  return '';
}

export function copyRowsToClipboard(format, columns, rows, options) {
  const formatted = formatClipboardRows(format, columns, rows, options);
  copyTextToClipboard(formatted);
}

export const copyRowsFormatDefs = {
  textWithHeaders: {
    label: 'Copy with headers',
    name: 'With headers',
    formatter: clipboardTextFormatter('\t', true),
  },
  textWithoutHeaders: {
    label: 'Copy without headers',
    name: 'Without headers',
    formatter: clipboardTextFormatter('\t', false),
  },
  headers: {
    label: 'Copy only headers',
    name: 'Only Headers',
    formatter: clipboardHeadersFormatter('\t'),
  },
  csv: {
    label: 'Copy as CSV',
    name: 'CSV',
    formatter: clipboardTextFormatter(',', true),
  },
  json: {
    label: 'Copy as JSON',
    name: 'JSON',
    formatter: clipboardJsonFormatter(),
  },
  jsonLines: {
    label: 'Copy as JSON lines/NDJSON',
    name: 'JSON lines/NDJSON',
    formatter: clipboardJsonLinesFormatter(),
  },
  yaml: {
    label: 'Copy as YAML',
    name: 'YAML',
    formatter: clipboardYamlFormatter(),
  },
  inserts: {
    label: 'Copy as SQL INSERTs',
    name: 'SQL INSERTs',
    formatter: clipboardInsertsFormatter(),
  },
  updates: {
    label: 'Copy as SQL UPDATEs',
    name: 'SQL UPDATEs',
    formatter: clipboardUpdatesFormatter(),
  },
  mongoInsert: {
    label: 'Copy as Mongo INSERTs',
    name: 'Mongo INSERTs',
    formatter: clipboardMongoInsertFormatter(),
  },
};
