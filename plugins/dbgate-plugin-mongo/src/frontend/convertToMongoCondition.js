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
    default:
      throw new Error(`Unknown condition type ${filter.conditionType}`);
  }
}

module.exports = {
  convertToMongoCondition,
};
