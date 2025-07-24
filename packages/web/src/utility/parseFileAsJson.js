/**
 * @template [T = any]
 * @typedef {Object} FileParseResultSuccess
 * @property {true} success
 * @property {T} data
 */

/**
 * @typedef {Object} FileParseResultError
 * @property {false} success
 * @property {string} error
 */

/**
 * @template [T = any]
 * @typedef {FileParseResultSuccess<T> | FileParseResultError} FileParseResult
 */

/**
 * @template [T = any]
 * @param {File} file
 * @returns {Promise<FileParseResult<T>>}
 */
export async function parseFileAsJson(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}
