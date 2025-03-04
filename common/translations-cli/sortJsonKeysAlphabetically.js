// @ts-check

/**
 * @param {object|string} json
 * @returns {object}
 */
function sortJsonKeysAlphabetically(json) {
  const obj = typeof json === 'string' ? JSON.parse(json) : json;

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const sortedObj = Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {});

  return sortedObj;
}

module.exports = sortJsonKeysAlphabetically;
