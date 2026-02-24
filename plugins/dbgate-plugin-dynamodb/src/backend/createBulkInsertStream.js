const { getLogger, extractErrorLogData } = require('dbgate-tools');
const { PutCommand, DeleteCommand, ScanCommand: DocScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const logger = getLogger('dynamodbBulkInsert');

async function tableExists(driver, dbhan, tableName) {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    await dbhan.client.send(command);
    return true;
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      return false;
    }
    throw err;
  }
}

function inferKeyType(value) {
  if (value === null || value === undefined) {
    return 'S'; // Default to string
  }
  
  // Check if it's a number (including numeric strings)
  if (typeof value === 'number') {
    return 'N';
  }
  
  if (typeof value === 'string') {
    // Try to parse as number
    if (!isNaN(value) && !isNaN(parseFloat(value)) && value.trim() !== '') {
      return 'N';
    }
    return 'S';
  }
  
  if (typeof value === 'boolean') {
    return 'N'; // Store boolean as number (0/1)
  }
  
  // Default to string for other types
  return 'S';
}

function createBulkInsertStream(driver, stream, dbhan, name, options) {
  const tableName = name.pureName;
  const docClient = dbhan.docClient;

  const writable = new stream.Writable({
    objectMode: true,
  });

  writable.buffer = [];
  writable.wasHeader = false;
  writable.columnNames = null;
  writable.tableCreated = false;
  writable.structureChecked = false;
  writable.options = options;

  writable.addRow = (row) => {
    if (!writable.wasHeader) {
      writable.wasHeader = true;
      if (row.__isStreamHeader) {
        writable.columnNames = row.columns ? row.columns.map(c => c.columnName) : Object.keys(row);
        return;
      }
    }
    writable.buffer.push(row);
  };

  writable.checkStructure = async () => {
    try {
      // Check if table exists
      const exists = await tableExists(driver, dbhan, tableName);

      if (!exists) {
        if (options.createIfNotExists) {
          // We'll create the table when we see the first row
          logger.info(`DBGM-00143 Table ${tableName} does not exist, will create on first row`);
          return;
        } else {
          throw new Error(`Table ${tableName} does not exist and createIfNotExists is not set`);
        }
      }

      if (options.dropIfExists && exists) {
        logger.info(`DBGM-00140 Dropping table ${tableName}`);
        try {
          await driver.dropTable(dbhan, tableName);
        } catch (err) {
          logger.error(`Error dropping table ${tableName}`, { error: err.message });
          throw err;
        }
      }

      if (options.truncate && exists) {
        logger.info(`DBGM-00141 Truncating table ${tableName}`);
        // Scan and delete all items from table using batch operations
        try {
          const keyAttributes = await driver.getTableKeySchema(dbhan, tableName);
          const allDeleteKeys = [];
          let lastEvaluatedKey = undefined;
          
          // First, scan all items to get their keys
          do {
            const scanParams = {
              TableName: tableName,
              ExclusiveStartKey: lastEvaluatedKey,
            };
            const scanCommand = new DocScanCommand(scanParams);
            const response = await docClient.send(scanCommand);

            if (response.Items && response.Items.length > 0) {
              for (const item of response.Items) {
                const deleteKey = {};
                for (const keyAttr of keyAttributes) {
                  deleteKey[keyAttr] = item[keyAttr];
                }
                allDeleteKeys.push(deleteKey);
              }
            }
            lastEvaluatedKey = response.LastEvaluatedKey;
          } while (lastEvaluatedKey);
          
          // Now delete items in batches of 25
          const batchSize = 25;
          let successfullyDeleted = 0;
          let totalFailed = 0;
          
          for (let i = 0; i < allDeleteKeys.length; i += batchSize) {
            const batch = allDeleteKeys.slice(i, i + batchSize);
            const requestItems = batch.map(key => ({
              DeleteRequest: {
                Key: key,
              },
            }));
            
            let unprocessedItems = requestItems;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (unprocessedItems.length > 0 && retryCount < maxRetries) {
              const batchWriteCommand = new BatchWriteCommand({
                RequestItems: {
                  [tableName]: unprocessedItems,
                },
              });
              
              const result = await docClient.send(batchWriteCommand);
              
              if (result.UnprocessedItems && result.UnprocessedItems[tableName]) {
                unprocessedItems = result.UnprocessedItems[tableName];
                retryCount++;
                
                if (unprocessedItems.length > 0) {
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
                }
              } else {
                unprocessedItems = [];
              }
            }
            
            // Count successfully deleted items (batch size minus failed items)
            const batchFailed = unprocessedItems.length;
            const batchSuccess = batch.length - batchFailed;
            successfullyDeleted += batchSuccess;
            totalFailed += batchFailed;
            
            logger.info(`Truncate progress: deleted ${successfullyDeleted} of ${allDeleteKeys.length} items${totalFailed > 0 ? ` (${totalFailed} failed)` : ''}`);
          }
          
          if (totalFailed > 0) {
            logger.warn(`Truncate completed with ${totalFailed} items that could not be deleted`);
          }
        } catch (err) {
          logger.warn({ error: err.message }, 'Error truncating table, continuing anyway');
        }
      }
    } catch (err) {
      logger.error('DBGM-00142 Error during preparing DynamoDB bulk insert table, stopped', extractErrorLogData(err));
      writable.destroy(err);
      throw err;
    }
  };

  writable.ensureTableExists = async () => {
    if (writable.tableCreated) return;

    const exists = await tableExists(driver, dbhan, tableName);
    if (!exists) {
      if (!options.createIfNotExists) {
        throw new Error(`Table ${tableName} does not exist and createIfNotExists is not set`);
      }

      // Create table from first row structure
      if (writable.buffer.length === 0) {
        throw new Error('Cannot create table: no data to infer schema from');
      }

      const firstRow = writable.buffer[0];
      const keys = Object.keys(firstRow);

      if (keys.length === 0) {
        throw new Error('Cannot create table: first row has no columns');
      }

      // Use first key as partition key, second as sort key if available
      const partitionKey = keys[0];
      const sortKey = keys.length > 1 ? keys[1] : null;

      // Infer key types from actual data
      const partitionKeyType = inferKeyType(firstRow[partitionKey]);
      const sortKeyType = sortKey ? inferKeyType(firstRow[sortKey]) : null;

      logger.info(`DBGM-00144 Creating table ${tableName} with partition key: ${partitionKey} (${partitionKeyType})${sortKey ? `, sort key: ${sortKey} (${sortKeyType})` : ''}`);

      try {
        await driver.createTable(dbhan, {
          name: tableName,
          partitionKey,
          sortKey,
          partitionKeyType,
          sortKeyType,
        });

        // Store key info for data insertion
        writable.partitionKey = partitionKey;
        writable.sortKey = sortKey;
        writable.partitionKeyType = partitionKeyType;
        writable.sortKeyType = sortKeyType;
      } catch (err) {
        logger.error(`Error creating table ${tableName}`, { error: err.message });
        throw err;
      }
    } else {
      // If table exists, get its key schema with types
      try {
        const schema = await driver.getTableSchema(dbhan, tableName);
        const { keySchema, attributeTypes } = schema;
        
        if (keySchema && keySchema.length > 0) {
          // Find partition key (HASH) and sort key (RANGE)
          const partitionKeyDef = keySchema.find(k => k.KeyType === 'HASH');
          const sortKeyDef = keySchema.find(k => k.KeyType === 'RANGE');
          
          if (partitionKeyDef) {
            writable.partitionKey = partitionKeyDef.AttributeName;
            writable.partitionKeyType = attributeTypes[partitionKeyDef.AttributeName] || 'S';
          }
          
          if (sortKeyDef) {
            writable.sortKey = sortKeyDef.AttributeName;
            writable.sortKeyType = attributeTypes[sortKeyDef.AttributeName] || 'S';
          }
          
          logger.info({ 
            partitionKey: writable.partitionKey, 
            partitionKeyType: writable.partitionKeyType,
            sortKey: writable.sortKey,
            sortKeyType: writable.sortKeyType
          }, 'Loaded existing table key schema');
        }
      } catch (err) {
        logger.warn({ error: err.message }, 'Could not get table key schema');
      }
    }

    writable.tableCreated = true;
  };

  writable.send = async () => {
    try {
      // Check structure once (handle drop/truncate)
      if (!writable.structureChecked) {
        await writable.checkStructure();
        writable.structureChecked = true;
      }
      
      // Ensure table exists before sending data
      await writable.ensureTableExists();

      const rows = writable.buffer;
      writable.buffer = [];

      if (rows.length === 0) return;

      // Prepare items with correct key types
      const preparedItems = [];
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const item = rows[rowIndex];
        
        try {
          // Create a copy of the item
          const insertItem = { ...item };

          // Validate partition key exists
          if (!writable.partitionKey) {
            throw new Error('Table partition key is not defined');
          }
          
          if (insertItem[writable.partitionKey] === undefined) {
            throw new Error(`Partition key "${writable.partitionKey}" is missing in row ${rowIndex + 1}`);
          }
          
          // Note: NULL values in keys are handled below by converting to placeholder values
          // (DynamoDB doesn't allow NULL in key attributes)

          // Ensure key fields have the correct types
          if (insertItem[writable.partitionKey] !== undefined) {
            const value = insertItem[writable.partitionKey];
          
            if (writable.partitionKeyType === 'N') {
              // Convert to number
              if (typeof value === 'number') {
                insertItem[writable.partitionKey] = value;
              } else if (typeof value === 'string') {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                  insertItem[writable.partitionKey] = num;
                } else {
                  throw new Error(`Cannot convert partition key ${writable.partitionKey} to number: "${value}"`);
                }
              } else if (typeof value === 'boolean') {
                insertItem[writable.partitionKey] = value ? 1 : 0;
              } else if (value === null) {
                // DynamoDB doesn't allow NULL in key attributes - use 0 as placeholder
                logger.warn({ rowIndex: rowIndex + 1, key: writable.partitionKey }, 'Partition key is NULL, using 0 as placeholder');
                insertItem[writable.partitionKey] = 0;
              } else if (typeof value === 'object' || Array.isArray(value)) {
                throw new Error(`Cannot convert partition key ${writable.partitionKey} from ${Array.isArray(value) ? 'array' : 'object'} to number`);
              } else {
                throw new Error(`Cannot convert partition key ${writable.partitionKey} from type ${typeof value} to number`);
              }
            } else if (writable.partitionKeyType === 'S') {
              // Convert to string
              if (value === null) {
                // DynamoDB doesn't allow NULL in key attributes - use placeholder
                logger.warn({ rowIndex: rowIndex + 1, key: writable.partitionKey }, 'Partition key is NULL, using "_NULL_" as placeholder');
                insertItem[writable.partitionKey] = '_NULL_';
              } else if (typeof value === 'object' || Array.isArray(value)) {
                insertItem[writable.partitionKey] = JSON.stringify(value);
              } else {
                insertItem[writable.partitionKey] = String(value);
              }
            }
          }

        // Handle sort key if present
        if (writable.sortKey && insertItem[writable.sortKey] !== undefined) {
          const value = insertItem[writable.sortKey];
          
          if (writable.sortKeyType === 'N') {
            // Convert to number
            if (typeof value === 'number') {
              insertItem[writable.sortKey] = value;
            } else if (typeof value === 'string') {
              const num = parseFloat(value);
              if (!isNaN(num)) {
                insertItem[writable.sortKey] = num;
              } else {
                throw new Error(`Cannot convert sort key ${writable.sortKey} to number: "${value}"`);
              }
            } else if (typeof value === 'boolean') {
              insertItem[writable.sortKey] = value ? 1 : 0;
            } else if (value === null) {
              // DynamoDB doesn't allow NULL in key attributes - use 0 as placeholder
              logger.warn({ rowIndex: rowIndex + 1, key: writable.sortKey }, 'Sort key is NULL, using 0 as placeholder');
              insertItem[writable.sortKey] = 0;
            } else if (typeof value === 'object' || Array.isArray(value)) {
              throw new Error(`Cannot convert sort key ${writable.sortKey} from ${Array.isArray(value) ? 'array' : 'object'} to number`);
            } else {
              throw new Error(`Cannot convert sort key ${writable.sortKey} from type ${typeof value} to number`);
            }
          } else if (writable.sortKeyType === 'S') {
            // Convert to string
            if (value === null) {
              // DynamoDB doesn't allow NULL in key attributes - use placeholder
              logger.warn({ rowIndex: rowIndex + 1, key: writable.sortKey }, 'Sort key is NULL, using "_NULL_" as placeholder');
              insertItem[writable.sortKey] = '_NULL_';
            } else if (typeof value === 'object' || Array.isArray(value)) {
              insertItem[writable.sortKey] = JSON.stringify(value);
            } else {
              insertItem[writable.sortKey] = String(value);
            }
          }
        }

        // Validate partition key is not empty string
        const pkValue = insertItem[writable.partitionKey];
        if (typeof pkValue === 'string' && pkValue.trim() === '') {
          throw new Error(`Partition key "${writable.partitionKey}" cannot be empty string in row ${rowIndex + 1}`);
        }

        // Validate sort key if present
        if (writable.sortKey && insertItem[writable.sortKey] !== undefined) {
          const skValue = insertItem[writable.sortKey];
          if (typeof skValue === 'string' && skValue.trim() === '') {
            throw new Error(`Sort key "${writable.sortKey}" cannot be empty string in row ${rowIndex + 1}`);
          }
        }

        preparedItems.push(insertItem);
        
        } catch (err) {
          // Log detailed error with row information
          logger.error({
            error: err.message,
            rowIndex: rowIndex + 1,
            totalRows: rows.length,
            partitionKey: writable.partitionKey,
            partitionKeyValue: item[writable.partitionKey],
            sortKey: writable.sortKey,
            sortKeyValue: writable.sortKey ? item[writable.sortKey] : undefined,
            rowSample: JSON.stringify(item).substring(0, 200)
          }, 'Error preparing row for insert');
          
          throw new Error(`Row ${rowIndex + 1}/${rows.length}: ${err.message}`);
        }
      }

      // Insert items in batches of 25 using BatchWriteCommand
      const batchSize = 25;
      let successfullyInserted = 0;
      let totalFailed = 0;
      
      for (let i = 0; i < preparedItems.length; i += batchSize) {
        const batch = preparedItems.slice(i, i + batchSize);
        const requestItems = batch.map(item => ({
          PutRequest: {
            Item: item,
          },
        }));
        
        let unprocessedItems = requestItems;
        let retryCount = 0;
        const maxRetries = 3;
        
        // Retry loop for handling unprocessed items
        while (unprocessedItems.length > 0 && retryCount < maxRetries) {
          const batchWriteCommand = new BatchWriteCommand({
            RequestItems: {
              [tableName]: unprocessedItems,
            },
          });
          
          const result = await docClient.send(batchWriteCommand);
          
          // Check for unprocessed items and retry
          if (result.UnprocessedItems && result.UnprocessedItems[tableName]) {
            unprocessedItems = result.UnprocessedItems[tableName];
            retryCount++;
            
            if (unprocessedItems.length > 0) {
              logger.info({ 
                table: tableName, 
                unprocessedCount: unprocessedItems.length, 
                retryAttempt: retryCount 
              }, 'Retrying unprocessed bulk insert items');
              // Exponential backoff before retry
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            }
          } else {
            unprocessedItems = [];
          }
        }
        
        // Count successfully inserted items (batch size minus failed items)
        const batchFailed = unprocessedItems.length;
        const batchSuccess = batch.length - batchFailed;
        successfullyInserted += batchSuccess;
        totalFailed += batchFailed;
        
        if (batchFailed > 0) {
          logger.warn({ 
            table: tableName, 
            failedCount: batchFailed 
          }, 'Some items could not be inserted after retries');
        }
      }

      logger.info(`Inserted ${successfullyInserted} items into table ${tableName}${totalFailed > 0 ? ` (${totalFailed} failed)` : ''}`);
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00198 Error bulk insert table, stopped');
      writable.destroy(err);
      throw err;
    }
  };

  writable.sendIfFull = async () => {
    if (writable.buffer.length > 100) {
      await writable.send();
    }
  };

  writable._write = async (chunk, encoding, callback) => {
    try {
      writable.addRow(chunk);
      await writable.sendIfFull();
      callback();
    } catch (err) {
      callback(err);
    }
  };

  writable._final = async (callback) => {
    try {
      await writable.send();
      callback();
    } catch (err) {
      callback(err);
    }
  };

  return writable;
}

module.exports = createBulkInsertStream;
