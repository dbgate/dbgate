const _zipObject = require('lodash/zipObject');

function convertLeftOperandToMongoColumn(left) {
  if (left.exprType == 'placeholder') return '__placeholder__';
  if (left.exprType == 'column') return left.columnName;
  throw new Error(`Unknown left operand type ${left.exprType}`);
}

function convertRightOperandToMongoValue(right) {
  if (right.exprType == 'value') return right.value;
  throw new Error(`Unknown right operand type ${right.exprType}`);
}

function convertToMongoCondition(filter) {
  if (!filter) {
    return null;
  }
  switch (filter.conditionType) {
    case 'and':
      return {
        $and: filter.conditions.map((x) => convertToMongoCondition(x)),
      };
    case 'or':
      return {
        $or: filter.conditions.map((x) => convertToMongoCondition(x)),
      };
    case 'binary':
      switch (filter.operator) {
        case '=':
          return {
            [convertLeftOperandToMongoColumn(filter.left)]: {
              $eq: convertRightOperandToMongoValue(filter.right),
            },
          };
        case '!=':
        case '<>':
          return {
            [convertLeftOperandToMongoColumn(filter.left)]: {
              $ne: convertRightOperandToMongoValue(filter.right),
            },
          };
        case '<':
          return {
            [convertLeftOperandToMongoColumn(filter.left)]: {
              $lt: convertRightOperandToMongoValue(filter.right),
            },
          };
        case '<=':
          return {
            [convertLeftOperandToMongoColumn(filter.left)]: {
              $lte: convertRightOperandToMongoValue(filter.right),
            },
          };
        case '>':
          return {
            [convertLeftOperandToMongoColumn(filter.left)]: {
              $gt: convertRightOperandToMongoValue(filter.right),
            },
          };
        case '>=':
          return {
            [convertLeftOperandToMongoColumn(filter.left)]: {
              $gte: convertRightOperandToMongoValue(filter.right),
            },
          };
      }
      break;

    case 'isNull':
      return {
        [convertLeftOperandToMongoColumn(filter.expr)]: {
          $exists: false,
        },
      };

    case 'isNotNull':
      return {
        [convertLeftOperandToMongoColumn(filter.expr)]: {
          $exists: true,
        },
      };

    case 'not':
      return {
        $not: convertToMongoCondition(filter.condition),
      };
    case 'like':
      return {
        [convertLeftOperandToMongoColumn(filter.left)]: {
          $regex: `${convertRightOperandToMongoValue(filter.right)}`.replace(/%/g, '.*'),
          $options: 'i',
        },
      };

    case 'specificPredicate':
      switch (filter.predicate) {
        case 'exists':
          return {
            [convertLeftOperandToMongoColumn(filter.expr)]: {
              $exists: true,
            },
          };
        case 'notExists':
          return {
            [convertLeftOperandToMongoColumn(filter.expr)]: {
              $exists: false,
            },
          };
        case 'emptyArray':
          return {
            [convertLeftOperandToMongoColumn(filter.expr)]: {
              $exists: true,
              $eq: [],
            },
          };
        case 'notEmptyArray':
          return {
            [convertLeftOperandToMongoColumn(filter.expr)]: {
              $exists: true,
              $type: 'array',
              $ne: [],
            },
          };
      }

    case 'in':
      return {
        [convertLeftOperandToMongoColumn(filter.expr)]: {
          $in: filter.values,
        },
      };

    default:
      throw new Error(`Unknown condition type ${filter.conditionType}`);
  }
}

function convertToMongoAggregateFunction(aggregate) {
  switch (aggregate.aggregateFunction) {
    case 'count':
      return { $sum: 1 };
    case 'sum':
      return { $sum: `$${aggregate.columnArgument}` };
    case 'avg':
      return { $avg: `$${aggregate.columnArgument}` };
    case 'min':
      return { $min: `$${aggregate.columnArgument}` };
    case 'max':
      return { $max: `$${aggregate.columnArgument}` };
    default:
      throw new Error(`Unknown aggregate function ${aggregate.aggregateFunction}`);
  }
}

function convertToMongoAggregate(collectionAggregate) {
  return [
    { $match: convertToMongoCondition(collectionAggregate.condition) },
    {
      $group: {
        _id: _zipObject(
          collectionAggregate.groupByColumns,
          collectionAggregate.groupByColumns.map((col) => '$' + col)
        ),
        ..._zipObject(
          collectionAggregate.aggregateColumns.map((col) => col.alias),
          collectionAggregate.aggregateColumns.map((col) => convertToMongoAggregateFunction(col))
        ),
        count: { $sum: 1 },
      },
    },
  ];
}

function convertToMongoSort(sort) {
  if (!sort) return null;
  return _zipObject(
    sort.map((col) => col.columnName),
    sort.map((col) => (col.direction == 'DESC' ? -1 : 1))
  );
}

module.exports = {
  convertToMongoCondition,
  convertToMongoAggregate,
  convertToMongoSort,
};
