const { dumpSqlCondition } = global.DBGATE_PACKAGES['dbgate-sqltree'];
const _cloneDeepWith = require('lodash/cloneDeepWith');

function replaceDynamoDbCondition(condition) {
  // Transform condition to work with DynamoDB PartiQL
  condition = _cloneDeepWith(condition, (node) => {
    // Convert LIKE to CONTAINS for DynamoDB PartiQL
    if (node.conditionType == 'like') {
      // DynamoDB PartiQL doesn't support LIKE, use contains() function instead
      const pattern = node.right?.value || '';
      // Remove SQL wildcards (%) and use contains for simple substring matching
      const cleanPattern = pattern.replace(/%/g, '');
      
      return {
        conditionType: 'expression',
        expr: {
          exprType: 'call',
          func: 'contains',
          args: [
            node.left,
            {
              exprType: 'value',
              value: cleanPattern,
            },
          ],
        },
      };
    }
  });

  return condition;
}

function convertToDynamoDbCondition(driver, condition) {
  if (!condition) return '';

  condition = replaceDynamoDbCondition(condition);

  const dmp = driver.createDumper();
  dumpSqlCondition(dmp, condition);
  return dmp.s;
}

function convertToDynamoDbOrder(driver, orderBy) {
  if (!orderBy || !orderBy.length) {
    return '';
  }
  
  const dmp = driver.createDumper();

  dmp.putCollection(', ', orderBy, (expr) => {
    dmp.put('%i %k', expr.columnName, expr.direction);
  });

  return dmp.s;
}

module.exports = {
  convertToDynamoDbCondition,
  convertToDynamoDbOrder,
};
