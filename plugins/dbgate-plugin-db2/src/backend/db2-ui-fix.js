/**
 * Fix to ensure function names and procedure names are properly displayed in UI
 */

// Function to ensure proper field mapping for functions
function mapFunctionFields(row) {
  // Create a safe access function to handle case sensitivity
  const getValue = (fieldName) => {
    if (row[fieldName] !== undefined) return row[fieldName];
    if (row[fieldName.toUpperCase()] !== undefined) return row[fieldName.toUpperCase()];
    if (row[fieldName.toLowerCase()] !== undefined) return row[fieldName.toLowerCase()];
    
    // Special handling for DB2-specific field names
    if (fieldName === 'functionName' && row['ROUTINENAME'] !== undefined) return row['ROUTINENAME'];
    if (fieldName === 'schemaName' && row['ROUTINESCHEMA'] !== undefined) return row['ROUTINESCHEMA'];
    
    return null;
  };
  
  const functionName = getValue("functionName") || '';
  const schemaName = getValue("schemaName") || '';
  
  return {
    schemaName: schemaName,
    pureName: functionName,
    functionName: functionName, // Add this field explicitly for UI display
    name: functionName, // Add this field explicitly for UI display
    objectType: 'function',
    objectId: `${schemaName}.${functionName}`,
    description: getValue("description"),
    definition: getValue("definition"),
    parameterStyle: getValue("parameterStyle"),
    language: getValue("language"),
    returnType: getValue("returnType") || getValue("returnTypeName") || 'unknown',
    createTime: getValue("createTime"),
    alterTime: getValue("alterTime"),
    contentHash: getValue("definition") || getValue("alterTime")?.toISOString() || getValue("createTime")?.toISOString(),
    displayName: functionName
  };
}

// Function to ensure proper field mapping for procedures
function mapProcedureFields(row) {
  // Create a safe access function to handle case sensitivity
  const getValue = (fieldName) => {
    if (row[fieldName] !== undefined) return row[fieldName];
    if (row[fieldName.toUpperCase()] !== undefined) return row[fieldName.toUpperCase()];
    if (row[fieldName.toLowerCase()] !== undefined) return row[fieldName.toLowerCase()];
    
    // Special handling for DB2-specific field names
    if (fieldName === 'procedureName' && row['ROUTINENAME'] !== undefined) return row['ROUTINENAME'];
    if (fieldName === 'schemaName' && row['ROUTINESCHEMA'] !== undefined) return row['ROUTINESCHEMA'];
    
    return null;
  };
  
  const procedureName = getValue("procedureName") || '';
  const schemaName = getValue("schemaName") || '';
  
  return {
    schemaName: schemaName,
    pureName: procedureName,
    procedureName: procedureName, // Add this field explicitly for UI display
    name: procedureName, // Add this field explicitly for UI display
    objectType: 'procedure',
    objectId: `${schemaName}.${procedureName}`,
    description: getValue("description"),
    definition: getValue("definition"),
    parameterStyle: getValue("parameterStyle"),
    language: getValue("language"),
    createTime: getValue("createTime"),
    alterTime: getValue("alterTime"),
    origin: getValue("origin"),
    dialect: getValue("dialect"),
    contentHash: getValue("definition") || getValue("alterTime")?.toISOString() || getValue("createTime")?.toISOString(),
    modifyDate: getValue("alterTime") || getValue("createTime") || new Date(),
    displayName: procedureName
  };
}

module.exports = {
  mapFunctionFields,
  mapProcedureFields
};
