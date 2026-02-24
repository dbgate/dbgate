const { getLogger } = require('dbgate-tools');
const driverBases = require('../frontend/drivers');
const { DynamoDBClient, ListTablesCommand, DescribeTableCommand, ScanCommand, CreateTableCommand, DeleteTableCommand, ExecuteStatementCommand, waitUntilTableNotExists, waitUntilTableExists } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand: DocScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
  BatchWriteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { version } = require('@aws-sdk/client-dynamodb/package.json');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { evaluateCondition } = require('dbgate-sqltree');
const stream = require('stream');
const Analyser = require('./Analyser');
const createBulkInsertStream = require('./createBulkInsertStream');

const logger = getLogger('dynamodbDriver');

const drivers = driverBases.map((driverBase) => ({
  ...driverBase,
  analyserClass: Analyser,
  
  // Helper to ensure all object keys are strings (fixes sorting issues with dynamic columns)
  normalizeObjectKeys(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeObjectKeys(item));
    }
    
    const normalized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const normalizedKey = String(key);
        normalized[normalizedKey] = this.normalizeObjectKeys(obj[key]);
      }
    }
    return normalized;
  },
  
  // Helper function to get table key schema (no caching)
  async getTableKeySchema(pool, tableName) {
    const describeCommand = new DescribeTableCommand({ TableName: tableName });
    const describeResponse = await pool.client.send(describeCommand);
    
    const keySchema = describeResponse.Table.KeySchema || [];
    const keyAttributes = keySchema.map(key => key.AttributeName);
    
    return keyAttributes;
  },

  // Helper function to get complete table schema with attribute types
  async getTableSchema(pool, tableName) {
    const describeCommand = new DescribeTableCommand({ TableName: tableName });
    const describeResponse = await pool.client.send(describeCommand);
    
    const table = describeResponse.Table;
    const keySchema = table.KeySchema || [];
    const attributeDefinitions = table.AttributeDefinitions || [];
    
    // Map attribute names to their types (S, N, B)
    const attributeTypes = {};
    for (const attr of attributeDefinitions) {
      attributeTypes[attr.AttributeName] = attr.AttributeType;
    }
    
    return {
      keySchema,
      attributeTypes,
    };
  },

  // Helper function to infer and convert value types based on existing item
  convertValueType(newValue, existingValue) {
    if (newValue === undefined || newValue === null) {
      return newValue;
    }

    // If there's no existing value to reference, try intelligent parsing
    if (existingValue === undefined || existingValue === null) {
      // If it's already the right type, return as-is
      if (typeof newValue !== 'string') {
        return newValue;
      }
      
      // Try to parse as JSON first if it looks like valid JSON
      const trimmed = newValue.trim();
      const looksLikeJSON = (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) && trimmed.length >= 2;
      
      if (looksLikeJSON) {
        try {
          const jsonValue = JSON.parse(newValue);
          return jsonValue;
        } catch (err) {
          // Not valid JSON, continue with other parsing
        }
      }
      
      // Try to parse as number if it looks numeric and non-empty
      if (newValue !== '' && !isNaN(newValue) && !isNaN(parseFloat(newValue))) {
        const trimmedValue = newValue.trim();
        const numValue = Number(trimmedValue);
        // Only convert if the trimmed string exactly matches the number representation
        if (!isNaN(numValue) && String(numValue) === trimmedValue) {
          return numValue;
        }
      }
      
      return newValue;
    }

    // If existing value is an object (JSON), try to convert to object
    if (typeof existingValue === 'object' && existingValue !== null) {
      if (typeof newValue === 'object') {
        return newValue;
      }
      if (typeof newValue === 'string') {
        try {
          const jsonValue = JSON.parse(newValue);
          return jsonValue;
        } catch (err) {
          // If can't parse, return as-is string (may be intended)
          return newValue;
        }
      }
      // If newValue is not string or object, try to convert to object
      try {
        return JSON.parse(JSON.stringify(newValue));
      } catch (err) {
        return newValue;
      }
    }

    // If existing value is a number, try to convert to number
    if (typeof existingValue === 'number') {
      if (typeof newValue === 'number') {
        return newValue;
      }
      if (typeof newValue === 'string') {
        const numValue = Number(newValue);
        if (!isNaN(numValue)) {
          return numValue;
        }
      }
    }

    // If existing value is a boolean, try to convert to boolean
    if (typeof existingValue === 'boolean') {
      if (typeof newValue === 'boolean') {
        return newValue;
      }
      if (typeof newValue === 'string') {
        if (newValue.toLowerCase() === 'true') return true;
        if (newValue.toLowerCase() === 'false') return false;
      }
      return Boolean(newValue);
    }

    // If existing value is a string, keep as string
    if (typeof existingValue === 'string') {
      return String(newValue);
    }

    // For other types, return as-is
    return newValue;
  },
  
  async connect(conn) {
    const authType = conn.authType || 'awscloud';
    
    // Parse region and endpoint from connection
    let region = conn.awsRegion || conn.region || 'us-east-1';
    let endpoint = undefined;
    
    if (conn.useDatabaseUrl && conn.databaseUrl) {
      // Parse region from URL format: dynamodb://region or just region name
      const url = conn.databaseUrl.replace('dynamodb://', '').split('/')[0];
      region = url || 'us-east-1';
    }
    
    // Check if using On Premise (local DynamoDB)
    if (authType === 'onpremise' && conn.server) {
      const port = conn.port || 8000;
      endpoint = `http://${conn.server}:${port}`;
      region = 'us-east-1'; // Required but unused for local
    }
    
    logger.info({ 
      authType,
      region,
      endpoint
    }, 'Connecting to DynamoDB');
    
    // Initialize DynamoDB client with AWS SDK
    const clientConfig = {
      region,
    };
    
    // Add endpoint if it's a local connection
    if (endpoint) {
      clientConfig.endpoint = endpoint;
    }
    
    // Add credentials if provided
    if (conn.accessKeyId && conn.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: conn.accessKeyId,
        secretAccessKey: conn.secretAccessKey,
      };
      // Add session token if provided (for temporary credentials)
      if (conn.sessionToken) {
        clientConfig.credentials.sessionToken = conn.sessionToken;
      }
    }
    
    const client = new DynamoDBClient(clientConfig);

    // Create a document client for easier data reading
    const docClient = DynamoDBDocumentClient.from(client);
    
    return {
      // Connection object will be returned here
      connected: true,
      region,
      client,
      docClient,
      database: conn.defaultDatabase || conn.database || region,
    };
  },

  async disconnect(pool) {
    logger.info('Disconnecting from DynamoDB');
    if (pool.client) {
      pool.client.destroy();
    }
  },

  async close(pool) {
    return this.disconnect(pool);
  },

  async getVersion(pool) {
    return {
      version: version,
      versionText: 'AWS DynamoDB',
    };
  },

  async listDatabases(pool) {
    // DynamoDB doesn't have databases, but return single "database" for UI compatibility
    return [
      {
        name: pool.database || pool.region,
      },
    ];
  },

  async listCollections(pool, db) {
    // For DynamoDB, tables are like collections
    // This will return an array of collection objects with name property
    try {
      logger.info('Listing DynamoDB tables');
      
      const command = new ListTablesCommand({});
      const response = await pool.client.send(command);
      
      const collections = [];
      
      for (const tableName of response.TableNames || []) {
        // Get table schema to identify partition key and sort key
        try {
          const describeCommand = new DescribeTableCommand({ TableName: tableName });
          const describeResponse = await pool.client.send(describeCommand);
          
          const keySchema = describeResponse.Table.KeySchema || [];
          
          // Separate partition key (HASH) and sort key (RANGE)
          const partitionKeyAttr = keySchema.find(key => key.KeyType === 'HASH');
          const sortKeyAttr = keySchema.find(key => key.KeyType === 'RANGE');
          
          const collection = {
            name: tableName,
            pureName: tableName,
            partitionKey: partitionKeyAttr ? [{
              columnName: String(partitionKeyAttr.AttributeName || ''),
              schemaName: tableName,
            }] : [],
            clusterKey: sortKeyAttr ? [{
              columnName: String(sortKeyAttr.AttributeName || ''),
              schemaName: tableName,
            }] : [],
          };
          
          collections.push(collection);
          // Table schema loaded
        } catch (err) {
          logger.error({ tableName, error: err.message }, 'Error getting table schema');
          // Still add collection even if schema loading fails
          collections.push({
            name: tableName,
            pureName: tableName,
            partitionKey: [],
            clusterKey: [],
          });
        }
      }
      
      return collections;
    } catch (err) {
      logger.error({ errorMessage: err?.message, errorName: err?.name }, 'Error listing DynamoDB tables');
      throw err;
    }
  },

  async readCollection(pool, options) {
    try {
      logger.info({ 
        table: options.pureName, 
        skip: options.skip, 
        limit: options.limit,
        region: pool.region,
        database: pool.database
      }, 'Reading DynamoDB table');
      
      const params = {
        TableName: options.pureName,
      };

      const condition = options.condition;
      const hasSort = Array.isArray(options.sort) && options.sort.length > 0;
      const countDocuments = !!options.countDocuments;

      // DynamoDB doesn't support offset-based pagination (skip) directly
      // We need to scan through records to simulate skip behavior
      let matchedItems = [];
      let lastEvaluatedKey = undefined;
      let scannedCount = 0;
      
      // Calculate how many items we need to fetch
      const skip = options.skip || 0;
      const rawLimit = options.limit;
      const unlimited = rawLimit === null;
      const limit = rawLimit === undefined ? 50 : rawLimit;
      const totalNeeded = unlimited ? Infinity : skip + limit;
      const shouldScanAll = hasSort || countDocuments || unlimited;

      const matchItem = (item) => {
        if (!condition) return true;
        try {
          return evaluateCondition(condition, item);
        } catch (err) {
          return false;
        }
      };

      const normalizeSortValue = (value) => {
        if (value == null) return null;
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch (err) {
            return String(value);
          }
        }
        return value;
      };

      const compareValues = (a, b, direction) => {
        const av = normalizeSortValue(a);
        const bv = normalizeSortValue(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return direction === 'DESC' ? 1 : -1;
        if (av > bv) return direction === 'DESC' ? -1 : 1;
        return 0;
      };
      
      // Keep scanning until we have enough items or reach the end
      do {
        const scanParams = {
          ...params,
          ExclusiveStartKey: lastEvaluatedKey,
        };
        
        const command = new DocScanCommand(scanParams);
        const response = await pool.docClient.send(command);
        
        const items = response.Items || [];
        scannedCount += items.length;
        
        for (const item of items) {
          if (matchItem(item)) {
            matchedItems.push(item);
          }
        }
        lastEvaluatedKey = response.LastEvaluatedKey;
        
        // Stop if we have enough items or there are no more items
        if (!shouldScanAll && (matchedItems.length >= totalNeeded || !lastEvaluatedKey)) {
          break;
        }
      } while (lastEvaluatedKey);

      if (countDocuments) {
        return { count: matchedItems.length };
      }

      let resultItems = matchedItems;
      if (hasSort) {
        resultItems = [...matchedItems].sort((a, b) => {
          for (const sortItem of options.sort) {
            const dir = sortItem.direction === 'DESC' ? 'DESC' : 'ASC';
            const cmp = compareValues(a[sortItem.columnName], b[sortItem.columnName], dir);
            if (cmp !== 0) return cmp;
          }
          return 0;
        });
      }

      // Apply skip and limit
      const rows = resultItems.slice(skip, unlimited ? undefined : skip + limit).map(item => this.normalizeObjectKeys(item));

      logger.info({ 
        rowsReturned: rows.length, 
        totalScanned: scannedCount, 
        totalMatched: matchedItems.length,
        tableName: options.pureName,
        skip: skip,
        limit: limit
      }, 'Read completed');
      
      return {
        rows,
      };
    } catch (err) {
      logger.error({ errorMessage: err?.message, errorName: err?.name, stack: err?.stack }, 'Error reading DynamoDB table');
      return { 
        errorMessage: err.message,
        rows: []
      };
    }
  },

  async updateCollection(pool, changeSet) {
    const res = {
      inserted: [],
      updated: [],
      deleted: [],
      replaced: [],
    };

    // Cache for table key schemas to avoid redundant DescribeTable API calls
    const tableKeySchemaCache = {};

    try {
      for (const insert of changeSet.inserts || []) {
        try {
          logger.info({ insertFields: insert.fields, insertDocument: insert.document }, 'Insert operation - incoming fields:');

          // Get the table's full schema including attribute types
          const schema = await this.getTableSchema(pool, insert.pureName);
          const keyAttributes = schema.keySchema.map(k => k.AttributeName);

          // Validate that all key attributes are present
          const item = {
            ...insert.document,
            ...insert.fields,
          };

          // Check that all required key attributes are present and have correct types
          for (const keyAttr of keyAttributes) {
            if (item[keyAttr] === undefined) {
              throw new Error(`Missing required key attribute: ${keyAttr}`);
            }
            
            const expectedType = schema.attributeTypes[keyAttr];
            const actualValue = item[keyAttr];
            
            // Validate types: N = number, S = string, B = binary
            if (expectedType === 'N' && typeof actualValue !== 'number') {
              logger.info({
                attribute: keyAttr,
                expectedType: 'number',
                actualType: typeof actualValue,
                actualValue,
              }, 'Insert operation - type mismatch for key attribute');
              
              // Handle null explicitly
              if (actualValue === null) {
                throw new Error(`Key attribute ${keyAttr} cannot be null (expected number)`);
              }
              
              // Try to convert to number based on type
              if (typeof actualValue === 'string') {
                const num = Number(actualValue);
                if (!isNaN(num)) {
                  item[keyAttr] = num;
                  logger.info({ attribute: keyAttr, newValue: num }, 'Insert operation - converted key attribute to number');
                } else {
                  throw new Error(`Cannot convert key attribute ${keyAttr} to number: "${actualValue}"`);
                }
              } else if (typeof actualValue === 'boolean') {
                // Convert boolean to number (0/1)
                item[keyAttr] = actualValue ? 1 : 0;
                logger.info({ attribute: keyAttr, newValue: item[keyAttr] }, 'Insert operation - converted boolean key attribute to number');
              } else if (typeof actualValue === 'object' || Array.isArray(actualValue)) {
                throw new Error(`Cannot convert key attribute ${keyAttr} from ${Array.isArray(actualValue) ? 'array' : 'object'} to number`);
              } else {
                throw new Error(`Cannot convert key attribute ${keyAttr} from type ${typeof actualValue} to number`);
              }
            } else if (expectedType === 'S' && typeof actualValue !== 'string') {
              logger.info({
                attribute: keyAttr,
                expectedType: 'string',
                actualType: typeof actualValue,
                actualValue,
              }, 'Insert operation - type mismatch for key attribute');
              
              // Handle null explicitly
              if (actualValue === null) {
                throw new Error(`Key attribute ${keyAttr} cannot be null (expected string)`);
              }
              
              // Convert to string (handles numbers, booleans, etc.)
              if (typeof actualValue === 'object' || Array.isArray(actualValue)) {
                // For objects/arrays, use JSON.stringify
                item[keyAttr] = JSON.stringify(actualValue);
                logger.info({ attribute: keyAttr, newValue: item[keyAttr] }, 'Insert operation - converted object/array key attribute to JSON string');
              } else {
                item[keyAttr] = String(actualValue);
                logger.info({ attribute: keyAttr, newValue: item[keyAttr] }, 'Insert operation - converted key attribute to string');
              }
            }
          }

          logger.info({ item }, 'Insert operation - final item after type validation:');

          // Convert types for non-key attributes (intelligent parsing based on value content)
          const nonKeyAttrs = Object.keys(item).filter(attr => !keyAttributes.includes(attr));
          for (const attr of nonKeyAttrs) {
            const value = item[attr];
            const convertedValue = this.convertValueType(value, null);
            if (convertedValue !== value) {
              logger.info({
                attribute: attr,
                originalValue: value,
                originalType: typeof value,
                convertedValue: convertedValue,
                convertedType: typeof convertedValue
              }, 'Insert operation - type conversion for non-key attribute');
              item[attr] = convertedValue;
            }
          }

          const command = new PutCommand({
            TableName: insert.pureName,
            Item: item,
          });
          await pool.docClient.send(command);
          res.inserted.push(item);
        } catch (insertErr) {
          logger.error({ 
            table: insert.pureName,
            errorMessage: insertErr?.message, 
            errorName: insertErr?.name,
            fault: insertErr?.$fault,
            statusCode: insertErr?.$metadata?.httpStatusCode,
            type: insertErr?.__type
          }, 'Insert operation failed for table');
          throw insertErr;
        }
      }

      for (const update of changeSet.updates || []) {
        const key = update.condition || update.key;
        if (!key || Object.keys(key).length === 0) {
          throw new Error('Missing key for update');
        }

        logger.info({ incomingKey: key }, 'Update operation - incoming key:');
        
        // Get the table's key schema to filter only key attributes (use cache to avoid redundant API calls)
        if (!tableKeySchemaCache[update.pureName]) {
          tableKeySchemaCache[update.pureName] = await this.getTableKeySchema(pool, update.pureName);
        }
        const keyAttributes = tableKeySchemaCache[update.pureName];
        logger.info({ tableKeyAttributes: keyAttributes }, 'Update operation - table key attributes:');
        
        // Filter the key to only include actual key attributes
        const filteredKey = {};
        for (const attr of keyAttributes) {
          if (key[attr] !== undefined) {
            filteredKey[attr] = key[attr];
          }
        }
        
        if (Object.keys(filteredKey).length === 0) {
          throw new Error('No valid key attributes found for update');
        }

        if (update.document) {
          const item = {
            ...update.document,
            ...update.fields,
            ...filteredKey,
          };
          const command = new PutCommand({
            TableName: update.pureName,
            Item: item,
          });
          await pool.docClient.send(command);
          res.replaced.push(filteredKey);
          continue;
        }

        const keyFields = new Set(Object.keys(filteredKey));
        const setEntries = Object.entries(update.fields || {}).filter(
          ([name, value]) => !keyFields.has(name) && !value?.$$undefined$$
        );
        const removeEntries = Object.entries(update.fields || {})
          .filter(([name, value]) => !keyFields.has(name) && value?.$$undefined$$)
          .map(([name]) => name);

        if (setEntries.length === 0 && removeEntries.length === 0) {
          res.updated.push(filteredKey);
          continue;
        }

        // Fetch existing item to infer types for conversion
        let existingItem = null;
        try {
          const getCommand = new GetCommand({
            TableName: update.pureName,
            Key: filteredKey,
          });
          const getResult = await pool.docClient.send(getCommand);
          existingItem = getResult.Item || null;
          logger.info({ 
            existingItemKeys: existingItem ? Object.keys(existingItem) : 'null'
          }, 'Update operation - fetched existing item for type inference');
        } catch (getErr) {
          logger.warn({ 
            errorMessage: getErr?.message
          }, 'Update operation - could not fetch existing item');
        }

        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        const setParts = [];
        const removeParts = [];
        let index = 0;

        for (const [name, value] of setEntries) {
          index += 1;
          const nameKey = `#n${index}`;
          const valueKey = `:v${index}`;
          expressionAttributeNames[nameKey] = name;
          
          // Apply type conversion based on existing value
          const convertedValue = this.convertValueType(value, existingItem?.[name]);
          logger.info({
            field: name,
            originalValue: value,
            originalType: typeof value,
            convertedValue: convertedValue,
            convertedType: typeof convertedValue,
            existingValue: existingItem?.[name],
            existingType: typeof existingItem?.[name]
          }, 'Update operation - value conversion');
          
          expressionAttributeValues[valueKey] = convertedValue;
          setParts.push(`${nameKey} = ${valueKey}`);
        }

        for (const name of removeEntries) {
          index += 1;
          const nameKey = `#n${index}`;
          expressionAttributeNames[nameKey] = name;
          removeParts.push(nameKey);
        }

        const updateParts = [];
        if (setParts.length > 0) updateParts.push(`SET ${setParts.join(', ')}`);
        if (removeParts.length > 0) updateParts.push(`REMOVE ${removeParts.join(', ')}`);

        const command = new UpdateCommand({
          TableName: update.pureName,
          Key: filteredKey,
          UpdateExpression: updateParts.join(' '),
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: Object.keys(expressionAttributeValues).length
            ? expressionAttributeValues
            : undefined,
          ReturnValues: 'ALL_NEW',
        });
        await pool.docClient.send(command);
        res.updated.push(filteredKey);
      }

      // Process deletes using batch operations for better performance
      if (changeSet.deletes && changeSet.deletes.length > 0) {
        // Step 1: Prepare all delete requests and group by table
        const deletesByTable = {};
        
        for (const del of changeSet.deletes) {
          let key = del.condition || del.key;
          if (!key || Object.keys(key).length === 0) {
            throw new Error('Missing key for delete');
          }
          
          logger.info({ delObject: del }, 'Delete operation - full del object:');
          logger.info({ incomingKey: key }, 'Delete operation - incoming key:');
          
          // Get the table's key schema to filter only key attributes (use cache to avoid redundant API calls)
          if (!tableKeySchemaCache[del.pureName]) {
            tableKeySchemaCache[del.pureName] = await this.getTableKeySchema(pool, del.pureName);
          }
          const keyAttributes = tableKeySchemaCache[del.pureName];
          logger.info({ tableKeyAttributes: keyAttributes }, 'Delete operation - table key attributes:');
          
          // Filter the key to only include actual key attributes
          const filteredKey = {};
          for (const attr of keyAttributes) {
            if (key[attr] !== undefined) {
              filteredKey[attr] = key[attr];
            }
          }
          
          if (Object.keys(filteredKey).length !== keyAttributes.length) {
            logger.error({
              expected: keyAttributes,
              found: Object.keys(filteredKey),
              fullRow: key,
              allDelData: del
            }, 'Delete operation - Missing some key attributes!');
            // Try to proceed anyway with what we have, but log the issue
          }
          
          // Group deletes by table
          if (!deletesByTable[del.pureName]) {
            deletesByTable[del.pureName] = [];
          }
          deletesByTable[del.pureName].push(filteredKey);
        }
        
        // Step 2: Process each table's deletes in batches of 25
        for (const [tableName, keys] of Object.entries(deletesByTable)) {
          // Process batch deletes for table
          
          const batchSize = 25;
          let successfullyDeleted = 0;
          
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            const requestItems = batch.map(key => ({
              DeleteRequest: {
                Key: key,
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
              
              const result = await pool.docClient.send(batchWriteCommand);
              
              // Check for unprocessed items and retry
              if (result.UnprocessedItems && result.UnprocessedItems[tableName]) {
                unprocessedItems = result.UnprocessedItems[tableName];
                retryCount++;
                
                if (unprocessedItems.length > 0) {
                  logger.info({ 
                    table: tableName, 
                    unprocessedCount: unprocessedItems.length, 
                    retryAttempt: retryCount 
                  }, 'Retrying unprocessed delete items');
                  // Exponential backoff before retry
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
                }
              } else {
                // All items processed successfully
                unprocessedItems = [];
              }
            }
            
            // Determine which keys were successfully deleted by comparing against unprocessed items
            // DynamoDB can return unprocessed items in any order, so we need to serialize and compare
            const serializeKey = (key) => JSON.stringify(key, Object.keys(key).sort());
            const unprocessedKeySet = new Set(
              unprocessedItems.map(item => serializeKey(item.DeleteRequest.Key))
            );
            
            // Add only keys that are NOT in the unprocessed set (i.e., successfully deleted)
            for (const key of batch) {
              const serializedKey = serializeKey(key);
              if (!unprocessedKeySet.has(serializedKey)) {
                res.deleted.push(key);
              }
            }
            
            const batchSuccess = batch.length - unprocessedItems.length;
            const batchFailed = unprocessedItems.length;
            
            successfullyDeleted += batchSuccess;
            
            if (batchFailed > 0) {
              logger.warn({ 
                table: tableName, 
                failedCount: batchFailed 
              }, 'Some items could not be deleted after retries');
            }
            
            logger.info({ 
              table: tableName, 
              deleted: successfullyDeleted, 
              total: keys.length 
            }, 'Batch delete progress');
          }
        }
      }

      return res;
    } catch (err) {
      logger.error({ 
        errorMessage: err?.message, 
        errorName: err?.name, 
        fault: err?.$fault, 
        statusCode: err?.$metadata?.httpStatusCode,
        type: err?.__type
      }, 'Error updating DynamoDB collection');
      return { errorMessage: err.message };
    }
  },

  async listColumns(pool, db, table) {
    try {
      // Get columns for table
      
      // Get table schema using DescribeTable
      const describeCommand = new DescribeTableCommand({ TableName: table.pureName });
      const describeResponse = await pool.client.send(describeCommand);
      
      const tableDesc = describeResponse.Table;
      
      // Map all attributes to columns
      const columns = (tableDesc.AttributeDefinitions || []).map(attr => ({
        columnName: String(attr.AttributeName || ''),
        dataType: attr.AttributeType, // 'S' (string), 'N' (number), 'B' (binary)
      }));

      logger.info(`Found ${columns.length} columns in table ${table.pureName}`);
      
      return columns;
    } catch (err) {
      logger.error({ errorMessage: err?.message, errorName: err?.name }, 'Error getting columns for DynamoDB table');
      return [];
    }
  },

  async loadFieldValues(pool, name, field, search, dataType) {
    try {
      const tableName = name.pureName;
      const values = new Map();
      const searchText = search ? String(search).toLowerCase() : null;

      let lastEvaluatedKey = undefined;
      let scannedCount = 0;
      const maxValues = 100;
      const maxScanned = 500;

      const addValue = (value) => {
        if (value === undefined) return;
        const key =
          value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            ? `p:${String(value)}`
            : `j:${JSON.stringify(value)}`;
        if (!values.has(key)) values.set(key, value);
      };

      do {
        const command = new DocScanCommand({
          TableName: tableName,
          ProjectionExpression: '#f',
          ExpressionAttributeNames: { '#f': field },
          ExclusiveStartKey: lastEvaluatedKey,
          Limit: 100,
        });

        const response = await pool.docClient.send(command);
        const items = response.Items || [];
        scannedCount += items.length;

        for (const item of items) {
          const value = item[field];
          if (value === undefined) continue;
          if (searchText && !String(value).toLowerCase().includes(searchText)) continue;
          addValue(value);
          if (values.size >= maxValues) break;
        }

        lastEvaluatedKey = response.LastEvaluatedKey;
      } while (lastEvaluatedKey && values.size < maxValues && scannedCount < maxScanned);

      return Array.from(values.values()).map((value) => ({ value }));
    } catch (err) {
      logger.error('Error loading DynamoDB field values', { errorMessage: err?.message, errorName: err?.name });
      return { errorMessage: err?.message };
    }
  },

  async operation(pool, operation, options) {
    const { type } = operation;
    switch (type) {
      case 'createCollection':
        await this.createTable(pool, operation.collection);
        break;
      case 'dropCollection':
        await this.dropTable(pool, operation.collection);
        break;
      case 'cloneCollection':
        await this.cloneTable(pool, operation.collection, operation.newName);
        break;
      default:
        throw new Error(`Operation type ${type} not supported`);
    }
  },

  async dropTable(pool, collection) {
    const tableName = collection?.pureName || collection?.name || collection;
    if (!tableName) {
      throw new Error('Table name is required for dropCollection');
    }

    const command = new DeleteTableCommand({
      TableName: tableName,
    });

    logger.info({ name: tableName }, 'Dropping DynamoDB table');
    await pool.client.send(command);
    
    // Wait until table is fully deleted (AWS operation is asynchronous)
    logger.info({ name: tableName }, 'Waiting for table deletion to complete');
    try {
      await waitUntilTableNotExists(
        { 
          client: pool.client, 
          maxWaitTime: 60, // Wait up to 60 seconds
          minDelay: 1,     // Check every 1 second minimum
          maxDelay: 5      // Check every 5 seconds maximum
        },
        { TableName: tableName }
      );
      logger.info({ name: tableName }, 'Table dropped successfully');
    } catch (err) {
      // If waiter times out or fails, log warning but don't throw
      // (table deletion was initiated, just might take longer)
      logger.warn({ name: tableName, error: err.message }, 'Table deletion initiated but waiter failed');
    }
  },

  async cloneTable(pool, sourceCollection, targetCollection) {
    const sourceTableName = sourceCollection?.pureName || sourceCollection?.name || sourceCollection;
    const targetTableName = targetCollection?.pureName || targetCollection?.name || targetCollection;
    
    if (!sourceTableName) {
      throw new Error('Source table name is required for cloneCollection');
    }
    if (!targetTableName) {
      throw new Error('Target table name is required for cloneCollection');
    }

    logger.info({ from: sourceTableName, to: targetTableName }, 'Starting table clone operation');

    // Step 1: Get source table schema
    const schema = await this.getTableSchema(pool, sourceTableName);
    const { keySchema, attributeTypes } = schema;

    // Extract partition and sort keys from schema
    let partitionKey = null;
    let sortKey = null;
    let partitionKeyType = 'S';
    let sortKeyType = 'S';

    for (const key of keySchema) {
      if (key.KeyType === 'HASH') {
        partitionKey = key.AttributeName;
        partitionKeyType = attributeTypes[partitionKey];
      } else if (key.KeyType === 'RANGE') {
        sortKey = key.AttributeName;
        sortKeyType = attributeTypes[sortKey];
      }
    }

    if (!partitionKey) {
      throw new Error('Could not determine partition key from source table');
    }

    // Step 2: Create target table with same schema
    logger.info({ table: targetTableName, partitionKey, sortKey }, 'Creating target table with cloned schema');
    await this.createTable(pool, {
      name: targetTableName,
      partitionKey,
      sortKey,
      partitionKeyType,
      sortKeyType,
    });

    // Step 3: Scan all items from source table
    logger.info({ table: sourceTableName }, 'Scanning all items from source table');
    const items = [];
    let lastEvaluatedKey = undefined;
    let scanCount = 0;

    do {
      const scanParams = {
        TableName: sourceTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const scanCommand = new DocScanCommand(scanParams);
      const scanResult = await pool.docClient.send(scanCommand);

      if (scanResult.Items) {
        items.push(...scanResult.Items);
        scanCount += scanResult.Items.length;
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    logger.info({ table: sourceTableName, itemCount: scanCount }, 'Scanned all items from source table');

    // Step 4: Write all items to target table using batch operations
    if (items.length > 0) {
      logger.info({ table: targetTableName, itemCount: items.length }, 'Writing items to target table');
      
      // Process items in batches of 25 (DynamoDB BatchWrite limit)
      const batchSize = 25;
      let successfullyWritten = 0;
      let totalFailed = 0;
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
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
              [targetTableName]: unprocessedItems,
            },
          });
          
          const result = await pool.docClient.send(batchWriteCommand);
          
          // Check for unprocessed items and retry
          if (result.UnprocessedItems && result.UnprocessedItems[targetTableName]) {
            unprocessedItems = result.UnprocessedItems[targetTableName];
            retryCount++;
            
            if (unprocessedItems.length > 0) {
              logger.info({ 
                table: targetTableName, 
                unprocessedCount: unprocessedItems.length, 
                retryAttempt: retryCount 
              }, 'Retrying unprocessed items');
              // Exponential backoff before retry
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            }
          } else {
            unprocessedItems = [];
          }
        }
        
        // Count successfully written items (batch size minus failed items)
        const batchFailed = unprocessedItems.length;
        const batchSuccess = batch.length - batchFailed;
        successfullyWritten += batchSuccess;
        totalFailed += batchFailed;
        
        if (batchFailed > 0) {
          logger.warn({ 
            table: targetTableName, 
            failedCount: batchFailed 
          }, 'Some items could not be written after retries');
        }
        
        logger.info({ 
          table: targetTableName, 
          written: successfullyWritten, 
          failed: totalFailed,
          total: items.length 
        }, 'Batch write progress');
      }
      
      logger.info({ 
        from: sourceTableName, 
        to: targetTableName, 
        itemsCopied: successfullyWritten,
        itemsFailed: totalFailed,
        totalItems: items.length
      }, 'Table clone write operation completed');
    }

    logger.info({ from: sourceTableName, to: targetTableName }, 'Table clone operation completed successfully');
  },

  async createTable(pool, values) {
    const { name, partitionKey, sortKey, partitionKeyType, sortKeyType } = values;
    
    if (!name) {
      throw new Error('Table name is required');
    }
    if (!partitionKey) {
      throw new Error('Partition key is required');
    }

    const allowedKeyTypes = new Set(['S', 'N', 'B']);
    const resolvedPartitionKeyType = allowedKeyTypes.has(partitionKeyType) ? partitionKeyType : 'S';
    const resolvedSortKeyType = allowedKeyTypes.has(sortKeyType) ? sortKeyType : 'S';

    const attributeDefinitions = [
      {
        AttributeName: partitionKey,
        AttributeType: resolvedPartitionKeyType,
      },
    ];

    const keySchema = [
      {
        AttributeName: partitionKey,
        KeyType: 'HASH', // Partition key
      },
    ];

    // Add sort key if provided
    if (sortKey) {
      attributeDefinitions.push({
        AttributeName: sortKey,
        AttributeType: resolvedSortKeyType,
      });
      keySchema.push({
        AttributeName: sortKey,
        KeyType: 'RANGE', // Sort key
      });
    }

    const command = new CreateTableCommand({
      TableName: name,
      AttributeDefinitions: attributeDefinitions,
      KeySchema: keySchema,
      BillingMode: 'PAY_PER_REQUEST', // On-demand billing
    });

    logger.info({ name, partitionKey, sortKey, partitionKeyType: resolvedPartitionKeyType, sortKeyType: sortKey ? resolvedSortKeyType : undefined }, 'Creating DynamoDB table');
    await pool.client.send(command);
    
    // Wait until table is fully created and active (AWS operation is asynchronous)
    logger.info({ name }, 'Waiting for table creation to complete');
    try {
      await waitUntilTableExists(
        { 
          client: pool.client, 
          maxWaitTime: 60, // Wait up to 60 seconds
          minDelay: 1,     // Check every 1 second minimum
          maxDelay: 5      // Check every 5 seconds maximum
        },
        { TableName: name }
      );
      logger.info({ name }, 'Table created successfully and is active');
    } catch (err) {
      // If waiter times out or fails, log warning but don't throw
      // (table creation was initiated, just might take longer)
      logger.warn({ name, error: err.message }, 'Table creation initiated but waiter failed');
    }
  },

  async readQuery(pool, sql, structure) {
    // Used for exports - returns a stream of data
    logger.info({ sql: sql, sqlType: typeof sql, hasStructure: !!structure }, 'readQuery called');
    
    // If sql is undefined or null, we can't do anything
    if (!sql) {
      logger.error('readQuery called with no sql parameter');
      const pass = new stream.PassThrough({
        objectMode: true,
        highWaterMark: 100,
      });
      pass.end();
      return pass;
    }
    
    try {
      const json = JSON.parse(sql);
      // Parsed JSON successfully
      if (json && (json.pureName || json.collection)) {
        // If it's a table name, scan the entire table
        const tableName = json.pureName || json.collection;
        // Scanning table for export
        
        const pass = new stream.PassThrough({
          objectMode: true,
          highWaterMark: 100,
        });

        // Save driver context for use inside async IIFE
        const driver = this;

        (async () => {
          try {
            let lastEvaluatedKey = undefined;
            let totalItems = 0;
            
            do {
              const params = {
                TableName: tableName,
                ExclusiveStartKey: lastEvaluatedKey,
              };
              
              const command = new DocScanCommand(params);
              const response = await pool.docClient.send(command);
              
              // Scan page received
              
              for (const item of response.Items || []) {
                pass.write(driver.normalizeObjectKeys(item));
                totalItems++;
              }
              
              lastEvaluatedKey = response.LastEvaluatedKey;
            } while (lastEvaluatedKey);
            
            logger.info({ totalItems }, 'Export scan completed');
            pass.end();
          } catch (err) {
            logger.error({ errorMessage: err?.message, errorName: err?.name }, 'Error reading table for export');
            pass.destroy(err);
          }
        })();

        return pass;
      }
    } catch (err) {
      // Not JSON, treat as PartiQL query
      logger.info({ error: err.message, sql: sql }, 'JSON parse failed');
    }

    // Execute PartiQL query
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    (async () => {
      try {
        logger.info({ sql }, 'Executing PartiQL for export');
        
        let nextToken = undefined;
        let totalItems = 0;
        
        do {
          const command = new ExecuteStatementCommand({
            Statement: sql,
            NextToken: nextToken,
          });

          const response = await pool.client.send(command);
          
          // PartiQL response received
          
          if (response.Items) {
            for (const item of response.Items) {
              const unmarshalled = unmarshall(item);
              pass.write(this.normalizeObjectKeys(unmarshalled));
              totalItems++;
            }
          }
          
          nextToken = response.NextToken;
        } while (nextToken);
        
        logger.info({ totalItems }, 'PartiQL export completed');
        pass.end();
      } catch (err) {
        logger.error({ errorMessage: err?.message, errorName: err?.name }, 'Error executing PartiQL query for export');
        
        // Check if this is the ORDER BY limitation error
        if (err?.name === 'ValidationException' && 
            err?.message?.includes('ORDER BY') && 
            err?.message?.includes('hash key condition')) {
          logger.info('Falling back to scan with in-memory sorting due to ORDER BY limitation');
          
          // Parse table name from the query
          const fromMatch = sql.match(/FROM\s+"?([^"\s]+)"?/i);
          if (!fromMatch) {
            pass.destroy(err);
            return;
          }
          const tableName = fromMatch[1];
          
          // Parse WHERE clause with contains() function
          const whereMatch = sql.match(/WHERE\s+\(?\s*contains\s*\(\s*(\w+)\s*,\s*'([^']+)'\s*\)\s*\)?/i);
          const whereColumn = whereMatch ? whereMatch[1] : null;
          const whereValue = whereMatch ? whereMatch[2] : null;
          
          // Parse ORDER BY clause
          const orderByMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
          const sortColumn = orderByMatch ? orderByMatch[1] : null;
          const sortDirection = orderByMatch && orderByMatch[2] ? orderByMatch[2].toUpperCase() : 'ASC';
          
          // Parsed query for fallback
          
          try {
            // Scan entire table and collect items
            let lastEvaluatedKey = undefined;
            const allItems = [];
            
            do {
              const scanCommand = new DocScanCommand({
                TableName: tableName,
                ExclusiveStartKey: lastEvaluatedKey,
              });
              
              const scanResponse = await pool.docClient.send(scanCommand);
              
              if (scanResponse.Items) {
                allItems.push(...scanResponse.Items);
              }
              
              lastEvaluatedKey = scanResponse.LastEvaluatedKey;
            } while (lastEvaluatedKey);
            
            // Scanned all items
            
            // Apply WHERE filtering if specified
            let filteredItems = allItems;
            if (whereColumn && whereValue) {
              filteredItems = allItems.filter(item => {
                const value = item[whereColumn];
                if (value == null) return false;
                // Case-insensitive contains check
                return String(value).toLowerCase().includes(whereValue.toLowerCase());
              });
              // Applied WHERE filter
            }
            
            // Sort if ORDER BY was specified
            if (sortColumn) {
              filteredItems.sort((a, b) => {
                const av = a[sortColumn];
                const bv = b[sortColumn];
                
                // Handle nulls
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                
                // Compare values
                let cmp = 0;
                if (typeof av === 'string' && typeof bv === 'string') {
                  cmp = av.localeCompare(bv);
                } else if (av < bv) {
                  cmp = -1;
                } else if (av > bv) {
                  cmp = 1;
                }
                
                return sortDirection === 'DESC' ? -cmp : cmp;
              });
              // Applied sorting
            }
            
            // Write all items to stream
            for (const item of filteredItems) {
              pass.write(this.normalizeObjectKeys(item));
            }
            
            logger.info({ itemCount: filteredItems.length }, 'Completed fallback export with filtering and sorting');
            pass.end();
          } catch (fallbackErr) {
            logger.error({ errorMessage: fallbackErr?.message }, 'Error in fallback scan');
            pass.destroy(fallbackErr);
          }
        } else {
          pass.destroy(err);
        }
      }
    })();

    return pass;
  },

  readJsonQuery(pool, select, structure) {
    // Used for exports from data grid - receives collection name and filters
    const { collection, condition, sort } = select;
    const hasSort = Array.isArray(sort) && sort.length > 0;
    
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    // Helper to match items against condition
    const matchItem = (item) => {
      if (!condition) return true;
      try {
        return evaluateCondition(condition, item);
      } catch (err) {
        return false;
      }
    };

    (async () => {
      try {
        // If sorting is required, use readCollection to buffer and sort in memory
        if (hasSort) {
          const result = await this.readCollection(pool, {
            pureName: collection,
            condition,
            sort,
            skip: 0,
            limit: null, // null signals unlimited export - scan all matching rows
          });
          
          for (const row of result.rows) {
            pass.write(row);
          }
          
          logger.info({ rowCount: result.rows.length, sorted: true }, 'Export completed via readJsonQuery');
          pass.end();
        } else {
          // No sorting - stream results directly for better memory efficiency
          let lastEvaluatedKey = undefined;
          let totalMatched = 0;
          
          do {
            const command = new DocScanCommand({
              TableName: collection,
              ExclusiveStartKey: lastEvaluatedKey,
            });
            
            const response = await pool.docClient.send(command);
            
            for (const item of response.Items || []) {
              if (matchItem(item)) {
                pass.write(this.normalizeObjectKeys(item));
                totalMatched++;
              }
            }
            
            lastEvaluatedKey = response.LastEvaluatedKey;
          } while (lastEvaluatedKey);
          
          logger.info({ rowCount: totalMatched, sorted: false }, 'Export completed via readJsonQuery');
          pass.end();
        }
      } catch (err) {
        logger.error({ errorMessage: err?.message, errorName: err?.name }, 'Error in readJsonQuery');
        pass.destroy(err);
      }
    })();

    return pass;
  },

  async writeTable(pool, name, options) {
    return createBulkInsertStream(this, stream, pool, name, options);
  },

  async query(pool, sql, options) {
    // Execute PartiQL query and return all results at once
    if (options?.discardResult) {
      // Just execute without returning results - still need to paginate through all results
      try {
        let nextToken = undefined;
        let totalItems = 0;
        
        do {
          const command = new ExecuteStatementCommand({
            Statement: sql,
            NextToken: nextToken,
          });
          const response = await pool.client.send(command);
          totalItems += response.Items?.length || 0;
          nextToken = response.NextToken;
        } while (nextToken);
        
        logger.info({ totalItems }, 'Query executed (discardResult)');
        return {};
      } catch (err) {
        logger.error({ errorMessage: err?.message, errorName: err?.name }, 'Error executing PartiQL query (discardResult)');
        throw err;
      }
    }

    try {
      logger.info({ sql }, 'Executing PartiQL query (query method)');
      
      const rows = [];
      let nextToken = undefined;
      let pageCount = 0;
      
      do {
        const command = new ExecuteStatementCommand({
          Statement: sql,
          NextToken: nextToken,
        });

        const response = await pool.client.send(command);
        pageCount++;
        
        if (response.Items) {
          for (const item of response.Items) {
            const unmarshalled = unmarshall(item);
            rows.push(unmarshalled);
          }
        }
        
        nextToken = response.NextToken;
      } while (nextToken);
      
      logger.info({ rowCount: rows.length, pageCount }, 'Query executed successfully');
      
      return { rows };
    } catch (err) {
      logger.error({ errorMessage: err?.message, errorName: err?.name }, 'Error executing PartiQL query');
      throw err;
    }
  },

  async stream(pool, sql, options) {
    // Execute PartiQL query on DynamoDB
    try {
      logger.info('Executing PartiQL query', { sql });
      
      // Split queries by semicolon and execute each one
      const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
      
      for (const query of queries) {
        let nextToken = undefined;
        let totalItems = 0;
        let pageCount = 0;
        
        // Send recordset header with dynamic structure
        if (options && options.recordset) {
          options.recordset({ __isDynamicStructure: true });
        }
        
        do {
          const command = new ExecuteStatementCommand({
            Statement: query,
            NextToken: nextToken,
          });

          const response = await pool.client.send(command);
          pageCount++;
          
          // Send each row
          if (response.Items && response.Items.length > 0) {
            for (const item of response.Items) {
              // Unmarshall DynamoDB format to normal JavaScript object
              const unmarshalled = unmarshall(item);
              if (options && options.row) {
                options.row(unmarshalled);
              }
              totalItems++;
            }
          }
          
          nextToken = response.NextToken;
        } while (nextToken);
        
        // Write info message
        if (options && options.info) {
          options.info({
            message: `Query executed successfully. Returned ${totalItems} items across ${pageCount} page(s).`,
            time: new Date(),
            severity: 'info',
          });
        }
      }
      
      if (options && options.done) {
        options.done();
      }
    } catch (err) {
      logger.error('Error executing PartiQL query', { errorMessage: err?.message, errorName: err?.name });
      if (options && options.info) {
        options.info({
          message: `Error: ${err.message}`,
          time: new Date(),
          severity: 'error',
        });
      }
      if (options && options.done) {
        options.done();
      }
    }
  },
}));

drivers.initialize = (dbgateEnv) => {
  // Initialization code
};

module.exports = drivers;
