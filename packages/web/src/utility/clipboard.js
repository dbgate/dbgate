import _ from 'lodash';
import { arrayToHexString } from 'dbgate-tools';

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

  if (oldFocus) oldFocus.focus();
}

export function extractRowCopiedValue(row, col) {
  let value = row[col];
  if (value === undefined) value = _.get(row, col);
  if (value === null) return '(NULL)';
  if (value === undefined) return '(NoField)';
  if (value.type == 'Buffer' && _.isArray(value.data)) return arrayToHexString(value.data);
  if (_.isPlainObject(value) || _.isArray(value)) return JSON.stringify(value);
  return value;
}
