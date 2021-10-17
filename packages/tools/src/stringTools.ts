export function toHexString(byteArray) {
  return byteArray.reduce((output, elem) => output + ('0' + elem.toString(16)).slice(-2), '');
}
