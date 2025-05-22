/**
 * Helper functions for standardizing DB2 result set handling
 * with case-insensitive property access
 */

// Normalizes a row by adding both uppercase and lowercase versions of each property
function normalizeRow(row) {
  if (!row) return {};
  
  const normalizedRow = {...row};
  
  // Ensure all properties exist in both upper and lowercase
  Object.keys(row).forEach(key => {
    const upperKey = key.toUpperCase();
    const lowerKey = key.toLowerCase();
    
    normalizedRow[upperKey] = row[key];
    normalizedRow[lowerKey] = row[key];
  });
  
  return normalizedRow;
}

// Gets a property value from a row with multiple possible property names
function getPropertyValue(row, ...possibleNames) {
  if (!row) return null;
  
  for (const name of possibleNames) {
    // Try exact match
    if (row[name] !== undefined) {
      return row[name];
    }
    
    // Try uppercase
    if (row[name.toUpperCase()] !== undefined) {
      return row[name.toUpperCase()];
    }
    
    // Try lowercase
    if (row[name.toLowerCase()] !== undefined) {
      return row[name.toLowerCase()];
    }
  }
  
  return null;
}

// Normalize result rows in a query result
function normalizeQueryResult(result) {
  if (!result || !result.rows) return result;
  
  result.rows = result.rows.map(normalizeRow);
  return result;
}

module.exports = {
  normalizeRow,
  getPropertyValue,
  normalizeQueryResult
};
