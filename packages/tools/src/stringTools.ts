export function arrayToHexString(byteArray) {
  return byteArray.reduce((output, elem) => output + ('0' + elem.toString(16)).slice(-2), '');
}

export function hexStringToArray(inputString) {
  var hex = inputString.toString();
  var res = [];
  for (var n = 0; n < hex.length; n += 2) {
    res.push(parseInt(hex.substr(n, 2), 16));
  }
  return res;
}
