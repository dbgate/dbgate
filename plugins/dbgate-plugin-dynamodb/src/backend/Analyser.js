const { DatabaseAnalyser, getLogger } = global.DBGATE_PACKAGES['dbgate-tools'];
const { DescribeTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const logger = getLogger('dynamodbAnalyser');

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  async _runAnalysis() {
    try {
      // Get list of tables directly from DynamoDB
      const listCommand = new ListTablesCommand({});
      const listResponse = await this.dbhan.client.send(listCommand);
      const tableNames = listResponse.TableNames || [];
      
      logger.info({ tableCount: tableNames.length }, 'Starting DynamoDB analysis');
      
      // Get detailed info for each table
      const tableDetails = [];
      for (const tableName of tableNames) {
        try {
          const command = new DescribeTableCommand({ TableName: tableName });
          const response = await this.dbhan.client.send(command);
          const tableDesc = response.Table;
          
          // Use ItemCount from DescribeTable
          // Note: This value is updated approximately every 6 hours by AWS, so it may not be
          // real-time accurate but is much faster and consumes no read capacity.
          // For display purposes (table browser, etc.), this approximate count is sufficient
          // and avoids expensive full table scans on large tables.
          const itemCount = tableDesc.ItemCount || 0;
          
          tableDetails.push({
            pureName: tableName,
            keyAttributes: tableDesc.KeySchema.map(k => ({
              name: k.AttributeName,
              keyType: k.KeyType,
            })),
            itemCount: itemCount,
            sizeBytes: tableDesc.TableSizeBytes,
            status: tableDesc.TableStatus,
          });
        } catch (err) {
          // If we can't describe the table, just add basic info
          logger.error({ tableName, error: err.message }, 'Error describing table');
          tableDetails.push({
            pureName: tableName,
          });
        }
      }

      const res = this.mergeAnalyseResult({
        collections: tableDetails.map((table) => ({
          pureName: table.pureName,
          tableRowCount: table.itemCount,
          sizeBytes: table.sizeBytes,
          uniqueKey: (table.keyAttributes || []).map(k => ({ columnName: String(k.name || '') })),
          partitionKey: (table.keyAttributes || []).filter(k => k.keyType === 'HASH').map(k => ({ columnName: String(k.name || '') })),
          clusterKey: (table.keyAttributes || []).filter(k => k.keyType === 'RANGE').map(k => ({ columnName: String(k.name || '') })),
        })),
      });

      return res;
    } catch (err) {
      logger.error('Error analyzing DynamoDB:', err);
      // Return empty analysis on error
      return this.mergeAnalyseResult({
        collections: [],
      });
    }
  }
}

module.exports = Analyser;
